import mongoose from "mongoose";
import Tenant from "../../tenant/tenant.schema.js";
import Company from "../../companies/company.schema.js";
import Voucher from "../../tally/voucher/voucher.schema.js";
import LedgerEntry from "../../tally/voucher/ledgerentry.schema.js";
import Ledger from "../../tally/ledger/ledger.schema.js";
import { calculateDashboardHomeData } from "../dasboard.service.js";
import { resolveAccountingData } from "../../tally/accounting/accounting.resolver.js";
import { ApiError } from "../../../utils/api-error.js";

/**
 * Round number to 2 decimal places to prevent floating-point inaccuracies
 */
const round2 = (num) => Math.round((Number(num) || 0) * 100) / 100;

/**
 * Normalizes input company IDs from string, array, or comma-separated values
 */
export const normalizeCompanyIds = (companyIds) => {
  if (!companyIds) return [];
  if (Array.isArray(companyIds)) return companyIds.filter(Boolean);

  if (typeof companyIds === "string") {
    return companyIds
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
  }

  return [];
};

/**
 * Resolves Tenant document by ObjectId or string name
 */
export const resolveTenant = async (tenantId) => {
  if (!tenantId) {
    throw ApiError.badRequest("Tenant ID is required");
  }

  let tenant = null;

  if (mongoose.Types.ObjectId.isValid(tenantId)) {
    tenant = await Tenant.findOne({
      _id: new mongoose.Types.ObjectId(tenantId),
      is_deleted: { $ne: true },
    })
      .select("_id name email")
      .lean();
  }

  if (!tenant) {
    tenant = await Tenant.findOne({
      name: tenantId,
      is_deleted: { $ne: true },
    })
      .select("_id name email")
      .lean();
  }

  if (!tenant) {
    throw ApiError.notFound("Tenant not found");
  }

  return tenant;
};

/**
 * Retrieves active companies owned by a tenant, optionally filtered by selected IDs
 */
export const getTenantCompanies = async (tenantId, selectedCompanyIds = []) => {
  const query = {
    tenant_id: new mongoose.Types.ObjectId(tenantId),
    is_deleted: { $ne: true },
  };

  const normalizedIds = normalizeCompanyIds(selectedCompanyIds);
  if (normalizedIds.length > 0) {
    const validObjectIds = normalizedIds
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    query._id = { $in: validObjectIds };
  }

  return Company.find(query)
    .select("_id name company_id tally_company_name gst_number state")
    .lean();
};

/**
 * Aggregates financial metrics across all calculated company dashboards
 */
export const aggregateCompanyMetrics = (results = []) => {
  const initialTotals = {
    total_revenue: 0,
    total_purchase: 0,
    total_expense: 0,
    total_cash_balance: 0,
    total_bank_balance: 0,
    total_receivable: 0,
    total_payable: 0,
    companies_count: 0,
    failed_companies_count: 0,
  };

  const summary = results.reduce((acc, item) => {
    if (item.status === "failed") {
      acc.failed_companies_count += 1;
      return acc;
    }

    acc.companies_count += 1;
    acc.total_revenue += item.revenue || 0;
    acc.total_purchase += item.purchase || 0;
    acc.total_expense += item.expense || 0;
    acc.total_cash_balance += item.cash_balance || 0;
    acc.total_bank_balance += item.bank_balance || 0;
    acc.total_receivable += item.receivable || 0;
    acc.total_payable += item.payable || 0;

    return acc;
  }, initialTotals);

  return {
    total_revenue: round2(summary.total_revenue),
    total_purchase: round2(summary.total_purchase),
    total_expense: round2(summary.total_expense),
    total_cash_balance: round2(summary.total_cash_balance),
    total_bank_balance: round2(summary.total_bank_balance),
    total_receivable: round2(summary.total_receivable),
    total_payable: round2(summary.total_payable),
    companies_count: summary.companies_count,
    failed_companies_count: summary.failed_companies_count,
  };
};

/**
 * Core Service: Calculates consolidated dashboard metrics for a Tenant
 * Supports filtering across all or specific companies belonging to the tenant.
 */
export const calculateTenantDashboardData = async ({
  tenantId,
  companyIds,
  from_date,
  to_date,
}) => {
  // 1. Resolve Tenant to guarantee tenant boundary
  const tenant = await resolveTenant(tenantId);

  // 2. Fetch companies belonging to this tenant
  const companies = await getTenantCompanies(tenant._id, companyIds);

  if (!companies || companies.length === 0) {
    return {
      tenant_id: tenant._id,
      tenant_name: tenant.name,
      period: {
        from_date: from_date || null,
        to_date: to_date || null,
      },
      summary: aggregateCompanyMetrics([]),
      breakdown: [],
    };
  }

  // 3. Calculate metrics for each company in parallel with fault tolerance
  const settledCompanyResults = await Promise.allSettled(
    companies.map((company) =>
      calculateDashboardHomeData({
        companyId: company._id.toString(),
        from_date,
        to_date,
      })
    )
  );

  // 4. Map results into uniform company breakdown entries
  const breakdown = settledCompanyResults.map((result, index) => {
    const company = companies[index];

    if (result.status === "rejected") {
      console.error(
        `[TenantDashboard] Company calculation error (${company.name}):`,
        result.reason
      );

      return {
        company_id: company._id,
        company_name: company.name,
        gst_number: company.gst_number || null,
        state: company.state || null,
        status: "failed",
        error: result.reason?.message || "Failed to calculate company metrics",
        revenue: 0,
        purchase: 0,
        expense: 0,
        cash_balance: 0,
        bank_balance: 0,
        receivable: 0,
        payable: 0,
      };
    }

    return {
      ...result.value,
      gst_number: company.gst_number || null,
      state: company.state || null,
      status: "success",
    };
  });

  // 5. Aggregate summary rollup
  const summary = aggregateCompanyMetrics(breakdown);

  // 6. Compute real tenant-level voucher counts, tax breakdown, and monthly trend
  const companyObjectIds = companies.map((c) => c._id);

  try {
    const [totalVouchers, salesVoucherCount, purchaseVoucherCount] = await Promise.all([
      Voucher.countDocuments({
        company_id: { $in: companyObjectIds },
        is_deleted: { $ne: true },
        is_cancelled: { $ne: true },
      }),
      Voucher.countDocuments({
        company_id: { $in: companyObjectIds },
        is_deleted: { $ne: true },
        is_cancelled: { $ne: true },
        vchtype: { $regex: /sale/i },
      }),
      Voucher.countDocuments({
        company_id: { $in: companyObjectIds },
        is_deleted: { $ne: true },
        is_cancelled: { $ne: true },
        vchtype: { $regex: /purchase/i },
      }),
    ]);

    summary.total_vouchers = totalVouchers;
    summary.sales_vouchers_count = salesVoucherCount;
    summary.purchase_vouchers_count = purchaseVoucherCount;

    // Real Tax aggregation: Output GST vs Input GST (ITC)
    const taxLedgers = await Ledger.find({
      company_id: { $in: companyObjectIds },
      name: { $regex: /cgst|sgst|igst|tax/i },
    }).select("_id name").lean();

    let outputGst = 0;
    let inputGst = 0;

    if (taxLedgers.length > 0) {
      const taxLedgerMap = new Map(taxLedgers.map((l) => [String(l._id), l.name.toLowerCase()]));
      const taxEntries = await LedgerEntry.find({
        company_id: { $in: companyObjectIds },
        ledger_id: { $in: taxLedgers.map((l) => l._id) },
      }).select("ledger_id amount").lean();

      for (const e of taxEntries) {
        const name = taxLedgerMap.get(String(e.ledger_id)) || "";
        const amt = Math.abs(Number(e.amount) || 0);
        if (name.includes("output")) {
          outputGst += amt;
        } else if (name.includes("input")) {
          inputGst += amt;
        }
      }
    }
    outputGst = round2(outputGst);
    inputGst = round2(inputGst);

    summary.tax_summary = {
      sales: {
        invoice_count: `${salesVoucherCount.toLocaleString("en-IN")} Invoices`,
        gross_sales: round2(summary.total_revenue + outputGst),
        output_gst: outputGst,
        discounts: 0,
        credit_notes: 0,
        net_sales: round2(summary.total_revenue),
      },
      purchase: {
        voucher_count: `${purchaseVoucherCount.toLocaleString("en-IN")} Vouchers`,
        gross_purchases: round2(summary.total_purchase + inputGst),
        itc_matched: inputGst,
        vendor_rebates: 0,
        blocked_credits: 0,
        net_purchases: round2(summary.total_purchase),
      },
    };

    // Monthly Trend Rollup (H1: Apr to Sep)
    const monthNames = ["Apr", "May", "Jun", "Jul", "Aug", "Sep"];
    const fyYear = 2026;
    const monthlyTrend = monthNames.map((m) => ({
      month: `${m} ${String(fyYear).slice(-2)}`,
      sales: 0,
      purchases: 0,
      sales_raw: 0,
      purchases_raw: 0,
      count: 0,
    }));

    const vouchers = await Voucher.find({
      company_id: { $in: companyObjectIds },
      is_deleted: { $ne: true },
      is_cancelled: { $ne: true },
    }).select("_id date").lean();

    const voucherDateMap = new Map(vouchers.map((v) => [String(v._id), v.date]));

    // Accurately resolve sales and purchases per company using identical accounting criteria
    for (const c of companies) {
      const [sData, pData] = await Promise.all([
        resolveAccountingData({
          companyId: c._id,
          groupNames: ["Sales Accounts"],
          fromDate: from_date ? new Date(from_date) : null,
          toDate: to_date ? new Date(to_date) : null,
        }),
        resolveAccountingData({
          companyId: c._id,
          groupNames: ["Purchase Accounts"],
          fromDate: from_date ? new Date(from_date) : null,
          toDate: to_date ? new Date(to_date) : null,
        }),
      ]);

      if (sData?.entries) {
        for (const e of sData.entries) {
          const vDate = voucherDateMap.get(String(e.voucher_id));
          if (!vDate) continue;
          const d = new Date(vDate);
          const mIdx = d.getMonth();
          const targetIdx = mIdx >= 3 && mIdx <= 8 ? mIdx - 3 : -1;
          if (targetIdx >= 0 && targetIdx < monthlyTrend.length) {
            monthlyTrend[targetIdx].sales_raw += Math.abs(Number(e.amount) || 0);
            monthlyTrend[targetIdx].count += 1;
          }
        }
      }

      if (pData?.entries) {
        for (const e of pData.entries) {
          const vDate = voucherDateMap.get(String(e.voucher_id));
          if (!vDate) continue;
          const d = new Date(vDate);
          const mIdx = d.getMonth();
          const targetIdx = mIdx >= 3 && mIdx <= 8 ? mIdx - 3 : -1;
          if (targetIdx >= 0 && targetIdx < monthlyTrend.length) {
            monthlyTrend[targetIdx].purchases_raw += Math.abs(Number(e.amount) || 0);
            monthlyTrend[targetIdx].count += 1;
          }
        }
      }
    }

    // Format with full Indian currency amounts (entire values, not abbreviated)
    const formatFullINR = (num) => {
      const val = Math.round(Number(num) || 0);
      return `₹${new Intl.NumberFormat("en-IN").format(val)}`;
    };

    for (const item of monthlyTrend) {
      item.sales = round2(item.sales_raw / 100000);
      item.purchases = round2(item.purchases_raw / 100000);
      item.salesLabel = formatFullINR(item.sales_raw);
      item.purchasesLabel = formatFullINR(item.purchases_raw);
    }

    summary.monthly_trend = monthlyTrend;
  } catch (err) {
    console.error("[TenantDashboard] Error aggregating secondary metrics:", err);
  }

  return {
    tenant_id: tenant._id,
    tenant_name: tenant.name,
    period: {
      from_date: from_date || null,
      to_date: to_date || null,
    },
    summary,
    breakdown,
  };
};

export default {
  resolveTenant,
  getTenantCompanies,
  aggregateCompanyMetrics,
  calculateTenantDashboardData,
};

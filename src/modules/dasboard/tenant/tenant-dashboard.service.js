import mongoose from "mongoose";
import Tenant from "../../tenant/tenant.schema.js";
import Company from "../../companies/company.schema.js";
import { calculateDashboardHomeData } from "../dasboard.service.js";
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
    .select("_id name company_id tally_company_name")
    .lean();
};

/**
 * Aggregates financial metrics across all calculated company dashboards
 */
export const aggregateCompanyMetrics = (results = []) => {
  const initialTotals = {
    total_revenue: 0,
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
    acc.total_expense += item.expense || 0;
    acc.total_cash_balance += item.cash_balance || 0;
    acc.total_bank_balance += item.bank_balance || 0;
    acc.total_receivable += item.receivable || 0;
    acc.total_payable += item.payable || 0;

    return acc;
  }, initialTotals);

  return {
    total_revenue: round2(summary.total_revenue),
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
        status: "failed",
        error: result.reason?.message || "Failed to calculate company metrics",
        revenue: 0,
        expense: 0,
        cash_balance: 0,
        bank_balance: 0,
        receivable: 0,
        payable: 0,
      };
    }

    return {
      ...result.value,
      status: "success",
    };
  });

  // 5. Aggregate summary rollup
  const summary = aggregateCompanyMetrics(breakdown);

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

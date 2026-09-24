import mongoose from "mongoose";
import Voucher from "../voucher/voucher.schema.js";
import Company from "../../companies/company.schema.js";
import {calculateExpenseService} from "../Expense/expense.js"
import {
  MONTH_NAMES,
  FY_MONTH_ORDER,
  parseSafeDate,
  getFinancialYearFromDate,
} from "./summary.service.js";
import { calculateAccountingService } from "../accounting/accounting.controller.js";
import { ApiError } from "../../../utils/api-error.js";
import { ok } from "../../../utils/response.js";

export const getFinancialYear = async (req, res, next) => {
  try {
    const rawCompanyId =
      req.params.companyId ;


    if (!rawCompanyId) {
      throw ApiError.badRequest(
        "Company ID is required (pass as param or ?company_id=...)",
      );
    }

    let resolvedCompanyId = null;
    if (mongoose.Types.ObjectId.isValid(rawCompanyId)) {
      resolvedCompanyId = new mongoose.Types.ObjectId(rawCompanyId);
    } else {
      const companyDoc = await Company.findOne({
        $or: [{ tally_company_guid: rawCompanyId }, { name: rawCompanyId }],
        is_deleted: { $ne: true },
      }).select("_id");

      if (companyDoc) {
        resolvedCompanyId = companyDoc._id;
      }
    }

    if (!resolvedCompanyId) {
      throw ApiError.notFound(
        `Company not found with identifier: ${rawCompanyId}`,
      );
    }

    const filter = {
      company_id: resolvedCompanyId,
      is_deleted: { $ne: true },
    };

    // Discover all financial years from Vouchers (or default to current FY if no vouchers)
    const [minVoucher, maxVoucher, totalVouchers] = await Promise.all([
      Voucher.findOne(filter).sort({ date: 1 }).select("date").lean(),
      Voucher.findOne(filter).sort({ date: -1 }).select("date").lean(),
      Voucher.countDocuments(filter),
    ]);

    const now = new Date();
    const currentFY = getFinancialYearFromDate(now);
    let minFY = currentFY;
    let maxFY = currentFY;

    if (minVoucher && maxVoucher) {
      const minDate = parseSafeDate(minVoucher.date) || now;
      const maxDate = parseSafeDate(maxVoucher.date) || now;
      minFY = getFinancialYearFromDate(minDate);
      maxFY = getFinancialYearFromDate(maxDate);
    }

    const financialYears = [];
    for (
      let fyStart = maxFY.start_year;
      fyStart >= minFY.start_year;
      fyStart--
    ) {
      const fyEnd = fyStart + 1;
      const fyKey = `${fyStart}-${fyEnd}`;
      const startDate = `${fyStart}-04-01`;
      const endDate = `${fyEnd}-03-31`;

      financialYears.push({
        financial_year: fyKey,
        label: `FY ${fyStart}-${String(fyEnd).slice(-2)}`,
        start_year: fyStart,
        end_year: fyEnd,
        start_date: startDate,
        end_date: endDate,
        is_current: fyStart === currentFY.start_year,
      });
    }

    return ok(
      res,
      {
        company_id: resolvedCompanyId,
        total_vouchers: totalVouchers,
        count: financialYears.length,
        financial_years: financialYears,
        start_date: minFY.start_year,
        end_date: maxFY.end_year,
      },
      "Company financial years retrieved successfully",
    );
  } catch (error) {
    next(error);
  }
};


export const getFinancialYearRevenueExpenseTrend = async (req, res, next) => {
  try {
    const rawCompanyId =
      req.params.companyId ||
      req.query.companyId ||
      req.query.company_id ||
      req.body?.companyId;

    if (!rawCompanyId) {
      throw ApiError.badRequest(
        "Company ID is required (pass as param or ?company_id=...)",
      );
    }

    let resolvedCompanyId = null;
    if (mongoose.Types.ObjectId.isValid(rawCompanyId)) {
      resolvedCompanyId = new mongoose.Types.ObjectId(rawCompanyId);
    } else {
      const companyDoc = await Company.findOne({
        $or: [{ tally_company_guid: rawCompanyId }, { name: rawCompanyId }],
        is_deleted: { $ne: true },
      }).select("_id");

      if (companyDoc) {
        resolvedCompanyId = companyDoc._id;
      }
    }

    if (!resolvedCompanyId) {
      throw ApiError.notFound(
        `Company not found with identifier: ${rawCompanyId}`,
      );
    }

    const compIdFilter = resolvedCompanyId;
    const filter = {
      company_id: compIdFilter,
      is_deleted: { $ne: true },
    };

    // 1. Discover all financial years from Vouchers (or default to current FY)
    const [minVoucher, maxVoucher, totalVouchers] = await Promise.all([
      Voucher.findOne(filter).sort({ date: 1 }).select("date").lean(),
      Voucher.findOne(filter).sort({ date: -1 }).select("date").lean(),
      Voucher.countDocuments(filter),
    ]);

    const now = new Date();
    const currentFY = getFinancialYearFromDate(now);
    let minFY = currentFY;
    let maxFY = currentFY;

    if (minVoucher && maxVoucher) {
      const minDate = parseSafeDate(minVoucher.date) || now;
      const maxDate = parseSafeDate(maxVoucher.date) || now;
      minFY = getFinancialYearFromDate(minDate);
      maxFY = getFinancialYearFromDate(maxDate);
    }

    // Check if a specific year filter is requested (?targetYear=2026, ?year=2024, ?financial_year=2024-2025, or /:year)
    const targetYear =
      req.query.targetYear ||
      req.query.year ;
    // 2. Build financial year items from maxFY down to minFY
    const financialYearsResult = [];

    for (
      let fyStart = maxFY.start_year;
      fyStart >= minFY.start_year;
      fyStart--
    ) {
      const fyEnd = fyStart + 1;
      const fyKey = `${fyStart}-${fyEnd}`;
      const startDate = `${fyStart}-04-01`;
      const endDate = `${fyEnd}-03-31`;

      // If user filtered by a specific year, skip financial years that don't match
      if (targetYear) {
        const q = String(targetYear).trim().toLowerCase();
        let matches = false;

        if (/^\d{4}$/.test(q)) {
          // A 4-digit year like 2026 matches the starting year (FY 2026-2027)
          matches = fyStart === Number(q);
        } else {
          matches =
            fyKey.toLowerCase().includes(q) ||
            `fy ${fyStart}-${String(fyEnd).slice(-2)}`.toLowerCase().includes(q) ||
            fyKey.replace("-", "").includes(q);
        }

        if (!matches) {
          continue;
        }
      }

      // Parallel calls to calculateAccountingService for "sales" (Revenue) and calculateExpenseService for total Expense
      const [salesResult, expenseResult] = await Promise.all([
        calculateAccountingService({
          companyId: resolvedCompanyId,
          requirement: "sales",
          from_date: startDate,
          to_date: endDate,
        }),
        calculateExpenseService({
          companyId: resolvedCompanyId,  
          from_date: startDate,
          to_date: endDate,
        }),
      ]);

      const totalRevenue = Math.round((Number(salesResult.amount) || 0) * 100) / 100;
      const totalExpense = Math.round((Number(expenseResult.amount ?? expenseResult.total_amount) || 0) * 100) / 100;
      const netProfitLoss = Math.round((totalRevenue - totalExpense) * 100) / 100;

      // Base financial year item
      const fyItem = {
        financial_year: fyKey,
        label: `FY ${fyStart}-${String(fyEnd).slice(-2)}`,
        start_year: fyStart,
        end_year: fyEnd,
        start_date: startDate,
        end_date: endDate,
        values: {
          total_revenue: totalRevenue,
          total_expense: totalExpense,
          net_profit_loss: netProfitLoss,
          is_profitable: netProfitLoss >= 0,
        },
      };

      // Only compute and include monthly_trend if a specific year was requested!
      if (targetYear) {
        const voucherDateMap = new Map();
        const monthlyVoucherIds = new Map();

        for (const v of salesResult.vouchers || []) {
          if (v._id && v.date) {
            const vDate = new Date(v.date);
            voucherDateMap.set(String(v._id), vDate);
            if (!isNaN(vDate.getTime())) {
              const key = `${vDate.getFullYear()}-${vDate.getMonth() + 1}`;
              if (!monthlyVoucherIds.has(key)) monthlyVoucherIds.set(key, new Set());
              monthlyVoucherIds.get(key).add(String(v._id));
            }
          }
        }

        for (const v of expenseResult.vouchers || []) {
          if (v._id && v.date) {
            const vDate = new Date(v.date);
            voucherDateMap.set(String(v._id), vDate);
            if (!isNaN(vDate.getTime())) {
              const key = `${vDate.getFullYear()}-${vDate.getMonth() + 1}`;
              if (!monthlyVoucherIds.has(key)) monthlyVoucherIds.set(key, new Set());
              monthlyVoucherIds.get(key).add(String(v._id));
            }
          }
        }

        // Map monthly sales from ledger_entries
        const monthlySalesMap = new Map();
        for (const entry of salesResult.ledger_entries || []) {
          const vDate = voucherDateMap.get(String(entry.voucher_id));
          if (vDate && !isNaN(vDate.getTime())) {
            const key = `${vDate.getFullYear()}-${vDate.getMonth() + 1}`;
            const rawAmount = Math.abs(Number(entry.amount) || 0);
            monthlySalesMap.set(key, (monthlySalesMap.get(key) || 0) + rawAmount);
          }
        }

        // Map monthly expenses from ledger_entries
        const monthlyExpenseMap = new Map();
        for (const entry of expenseResult.ledger_entries || []) {
          const vDate = voucherDateMap.get(String(entry.voucher_id));
          if (vDate && !isNaN(vDate.getTime())) {
            const key = `${vDate.getFullYear()}-${vDate.getMonth() + 1}`;
            const rawAmount = Math.abs(Number(entry.amount) || 0);
            monthlyExpenseMap.set(key, (monthlyExpenseMap.get(key) || 0) + rawAmount);
          }
        }

        let fyVoucherCount = 0;

        const monthlyTrend = FY_MONTH_ORDER.map((m) => {
          const y = m >= 4 ? fyStart : fyEnd;
          const key = `${y}-${m}`;

          const mSales = Math.round(Math.max(0, monthlySalesMap.get(key) || 0) * 100) / 100;
          const mExpense = Math.round(Math.max(0, monthlyExpenseMap.get(key) || 0) * 100) / 100;
          const vCount = monthlyVoucherIds.get(key)?.size || 0;

          fyVoucherCount += vCount;

          return {
            month: m,
            month_name: MONTH_NAMES[m],
            year: y,
            period_label: `${MONTH_NAMES[m]} ${y}`,
            revenue: mSales,
            expense: mExpense,
            net_profit_loss: Math.round((mSales - mExpense) * 100) / 100,
            voucher_count: vCount,
          };
        });

        fyItem.monthly_trend = monthlyTrend;
        fyItem.voucher_count = fyVoucherCount;
      } else {
        // Count vouchers for this FY when returning summary
        const fyVouchers = new Set([
          ...(salesResult.vouchers || []).map((v) => String(v._id)),
          ...(expenseResult.vouchers || []).map((v) => String(v._id)),
        ]);
        fyItem.voucher_count = fyVouchers.size;
      }

      financialYearsResult.push(fyItem);
    }

    const responseData = {
      company_id: compIdFilter,
      total_vouchers: totalVouchers,
      count: financialYearsResult.length,
      financial_years: financialYearsResult,
    };

    if (targetYear && financialYearsResult.length === 1) {
      responseData.financial_year = financialYearsResult[0];
    }

    return ok(
      res,
      responseData,
      targetYear
        ? `Financial year ${targetYear} revenue and expense trend retrieved successfully`
        : "Financial years revenue and expense summary retrieved successfully",
    );
  } catch (error) {
    next(error);
  }
};
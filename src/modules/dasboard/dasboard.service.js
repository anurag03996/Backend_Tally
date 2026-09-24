import mongoose from "mongoose";
import Company from "../companies/company.schema.js";
import { calculateAccountingService } from "../tally/accounting/accounting.controller.js";
import { calculateExpenseService } from "../tally/Expense/expense.js";
import { calculateCashBalanceService } from "../tally/cash/cash.service.js";
import { calculateBankBalanceService } from "../tally/bank/bank.service.js";
import { calculateReceivablesService } from "../tally/receivables/receivables.services.js";
import { calculatePayablesService } from "../tally/payables/payables.services.js";
import { ApiError } from "../../utils/api-error.js";
import { ok } from "../../utils/response.js";

/**
 * Utility: Round number to 2 decimal places
 */
const round2 = (num) => Math.round((Number(num) || 0) * 100) / 100;

/**
 * Helper to unwrap Promise.allSettled results safely
 */
const unwrapSettled = (settled, label = "Module") => {
  if (!settled) return null;
  if (settled.status === "rejected") {
    console.error(`[Dashboard] ${label} calculation failed:`, settled.reason);
    return null;
  }
  return settled.status === "fulfilled" ? settled.value : settled;
};

/**
 * Resolves Company from ObjectId, string company_id, or company name
 */
export const resolveCompany = async (companyId) => {
  if (!companyId) {
    throw ApiError.badRequest("Company ID is required");
  }

  let company = null;

  if (mongoose.Types.ObjectId.isValid(companyId)) {
    company = await Company.findOne({
      _id: new mongoose.Types.ObjectId(companyId),
      is_deleted: { $ne: true },
    })
      .select("_id name company_id")
      .lean();
  }

  if (!company) {
    company = await Company.findOne({
      $or: [{ company_id: companyId }, { name: companyId }],
      is_deleted: { $ne: true },
    })
      .select("_id name company_id")
      .lean();
  }

  if (!company) {
    throw ApiError.notFound("Company not found");
  }

  return company;
};

/**
 * Core Service: Calculates summary amounts for Dashboard Home:
 * - revenue: Sales total amount
 * - expense: Purchase + Indirect Expense total amount
 * - cash_balance: Cash-in-Hand closing balance (Opening + DR - CR)
 * - bank_balance: Bank Accounts closing balance (Opening + DR - CR)
 * - receivable: Sundry Debtors total receivable
 * - payable: Sundry Creditors total payable
 */
export const calculateDashboardHomeData = async ({
  companyId,
  from_date,
  to_date,
}) => {
  // 1. Resolve Company
  const company = await resolveCompany(companyId);
  const targetCompanyId = company._id;

  // 2. Fetch modules in parallel
  const [
    salesResult,
    expenseResult,
    cashResult,
    bankResult,
    receivableResult,
    payableResult,
  ] = await Promise.allSettled([
    calculateAccountingService({
      companyId: targetCompanyId,
      requirement: "sales",
      from_date,
      to_date,
    }),
    calculateExpenseService({
      companyId: targetCompanyId,
      from_date,
      to_date,
    }),
    calculateCashBalanceService({
      companyId: targetCompanyId,
      from_date,
      to_date,
    }),
    calculateBankBalanceService({
      companyId: targetCompanyId,
      from_date,
      to_date,
    }),
    calculateReceivablesService({
      companyId: targetCompanyId,
      from_date,
      to_date,
    }),
    calculatePayablesService({
      companyId: targetCompanyId,
      from_date,
      to_date,
    }),
  ]);

  // 3. Unwrap settled module results
  const sales = unwrapSettled(salesResult, "Sales");
  const expense = unwrapSettled(expenseResult, "Expense");
  const cash = unwrapSettled(cashResult, "Cash");
  const bank = unwrapSettled(bankResult, "Bank");
  const receivable = unwrapSettled(receivableResult, "Receivable");
  const payable = unwrapSettled(payableResult, "Payable");

  // 4. Extract pure amount values
  const revenueAmount = round2(sales?.amount ?? 0);
  const expenseAmount = round2(expense?.amount ?? expense?.total_amount ?? 0);

  const cashBalanceAmount = round2(
    cash?.closing_balance ?? cash?.amount ?? 0
  );
  const bankBalanceAmount = round2(
    bank?.closing_balance ?? bank?.amount ?? 0
  );
  const receivableAmount = round2(
    receivable?.closing_balance ?? 0
  );
  const payableAmount = round2(
    payable?.closing_balance ??  0
  );

  return {
    company_id: targetCompanyId,
    company_name: company.name || null,
    period: {
      from_date: from_date || null,
      to_date: to_date || null,
    },
    revenue: revenueAmount,
    expense: expenseAmount,
    cash_balance: cashBalanceAmount,
    bank_balance: bankBalanceAmount,
    receivable: receivableAmount,
    payable: payableAmount,
  };
};

/**
 * Controller handler for Dashboard Home
 */
export const getDashboardData = async (req, res, next) => {
  try {
    const { companyId } = req.params;
    const from_date = req.query?.from_date ?? req.body?.from_date;
    const to_date = req.query?.to_date ?? req.body?.to_date;

    const data = await calculateDashboardHomeData({
      companyId,
      from_date,
      to_date,
    });

    return ok(res, data, "Dashboard home data retrieved successfully");
  } catch (error) {
    if (typeof next === "function") {
      next(error);
    } else {
      throw error;
    }
  }
};

export default {
  resolveCompany,
  calculateDashboardHomeData,
  getDashboardData,
};
import { calculateAccountingService } from "../accounting/accounting.controller.js";
import { ok } from "../../../utils/response.js";
import mongoose from "mongoose";
import Ledger from "../ledger/ledger.schema.js";
import { ApiError } from "../../../utils/api-error.js";

const getsales = async (req, res, next) => {
  try {
    const { companyId } = req.params;
    const { from_date, to_date } = req.query;

    if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
      throw ApiError.badRequest("A valid company ID is required");
    }

    const data = await calculateAccountingService({
      companyId,
      requirement: "sales",
      from_date,
      to_date,
    });

    return ok(
      res,
      {
        amount: data?.amount ?? 0,
      },
      "Revenue data retrieved successfully"
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to fetch sales revenue grouped customer/party-wise.
 * Matches Trial Balance Sales Accounts net calculation (Credits - Debits).
 */
export const getrevenue_partywise = async (req, res, next) => {
  try {
    const { companyId } = req.params;
    const { from_date, to_date } = req.query;
    if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
      throw ApiError.badRequest("A valid company ID is required");
    }
    const fromDate = from_date ?? req.body?.from_date;
    const toDate = to_date ?? req.body?.to_date;
    // 1. Fetch sales accounting data and bank/cash ledgers in parallel
    const [salesData, bankCashLedgers] = await Promise.all([
      calculateAccountingService({
        companyId,
        requirement: "sales",
        from_date: fromDate,
        to_date: toDate,
      }),
      Ledger.find(
        {
          company_id: companyId,
          is_deleted: { $ne: true },
          $or: [
            { parent: { $in: ["Bank Accounts", "Bank OD A/c", "Bank OCC A/c", "Cash-in-Hand"] } },
            { name: { $regex: /^(cash|bank\b)/i } },
          ],
        },
        { _id: 1, name: 1 }
      ).lean(),
    ]);
    const bankCashIdSet = new Set(bankCashLedgers.map((l) => String(l._id)));
    const bankCashNameSet = new Set(
      bankCashLedgers.map((l) => l.name?.trim().toLowerCase()).filter(Boolean)
    );
    // 2. Map voucher ID -> Customer party name (excluding Bank & Cash)
    const voucherPartyMap = new Map();
    for (const v of salesData?.vouchers || []) {
      if (v?._id) {
        const vId = String(v._id);
        const partyIdStr = v.party_ledger_id
          ? String(typeof v.party_ledger_id === "object" ? v.party_ledger_id._id || v.party_ledger_id : v.party_ledger_id)
          : null;
        const rawPartyName =
          (typeof v.party_ledger_id === "object" ? v.party_ledger_id?.name : null) ||
          (typeof v.party_ledger_name === "string" ? v.party_ledger_name.trim() : null);
        const isBankOrCash =
          (partyIdStr && bankCashIdSet.has(partyIdStr)) ||
          (rawPartyName && bankCashNameSet.has(rawPartyName.toLowerCase()));
        if (rawPartyName && !isBankOrCash) {
          voucherPartyMap.set(vId, rawPartyName);
        }
      }
    }
    // 3. Deduplicate sales entries
    const entryMap = new Map();
    for (const entry of salesData?.ledger_entries || []) {
      if (entry?._id) entryMap.set(String(entry._id), entry);
    }
    // 4. Sum entry amounts per party as Net Revenue (Credits - Debits)
    const partyNetRevenueMap = new Map();
    const partyVouchersSet = new Map();
    const partyLedgersSet = new Map();
    const nonPartyNetRevenueMap = new Map();
    const nonPartyVouchersSet = new Map();
    for (const entry of entryMap.values()) {
      const vId = String(entry.voucher_id);
      const salesLedgerName = entry.ledger_name?.trim() || null;
      const partyName = voucherPartyMap.get(vId);
      const rawAmount = Number(entry.amount) || 0;
      // In Tally Sales Accounts:
      // - Credit (Sales): rawAmount > 0
      // - Debit (Credit Notes / Sales Return): rawAmount < 0
      // Net revenue = currentRevenue + rawAmount
      if (partyName) {
        // --- Customer / Debtor Party ---
        const currentRevenue = partyNetRevenueMap.get(partyName) || 0;
        partyNetRevenueMap.set(partyName, currentRevenue + rawAmount);
        if (!partyVouchersSet.has(partyName)) {
          partyVouchersSet.set(partyName, new Set());
        }
        if (entry.voucher_id) {
          partyVouchersSet.get(partyName).add(vId);
        }
        if (!partyLedgersSet.has(partyName)) {
          partyLedgersSet.set(partyName, new Set());
        }
        if (salesLedgerName) {
          partyLedgersSet.get(partyName).add(salesLedgerName);
        }
      } else {
        // --- Direct / Cash Sales (Without a dedicated Debtor ledger) ---
        const ledgerKey = salesLedgerName || "Direct Sales";
        const currentRevenue = nonPartyNetRevenueMap.get(ledgerKey) || 0;
        nonPartyNetRevenueMap.set(ledgerKey, currentRevenue + rawAmount);
        if (!nonPartyVouchersSet.has(ledgerKey)) {
          nonPartyVouchersSet.set(ledgerKey, new Set());
        }
        if (entry.voucher_id) {
          nonPartyVouchersSet.get(ledgerKey).add(vId);
        }
      }
    }
    // 5. Build customer parties list (sorted descending by revenue)
    const parties = Array.from(partyNetRevenueMap.entries())
      .map(([party_name, netRevenue]) => {
        const netAmount = Math.round(netRevenue * 100) / 100;
        const voucherIds = Array.from(partyVouchersSet.get(party_name) || []);
        const ledgerNames = Array.from(partyLedgersSet.get(party_name) || []);
        return {
          party_name,
          ledger_name: ledgerNames[0] || party_name,
          ledger_names: ledgerNames,
          amount: netAmount,
          vouchers_count: voucherIds.length,
          voucher_ids: voucherIds,
        };
      })
      .filter((p) => p.amount !== 0)
      .sort((a, b) => b.amount - a.amount);
    // 6. Build direct/cash sales list
    const directSales = Array.from(nonPartyNetRevenueMap.entries())
      .map(([ledger_name, netRevenue]) => {
        const netAmount = Math.round(netRevenue * 100) / 100;
        const voucherIds = Array.from(nonPartyVouchersSet.get(ledger_name) || []);
        return {
          ledger_name,
          amount: netAmount,
          vouchers_count: voucherIds.length,
          voucher_ids: voucherIds,
        };
      })
      .filter((item) => item.amount !== 0)
      .sort((a, b) => b.amount - a.amount);
    // 7. Calculate total amounts
    const totalPartyAmount = Math.round(
      parties.reduce((sum, party) => sum + party.amount, 0) * 100
    ) / 100;
    const totalDirectAmount = Math.round(
      directSales.reduce((sum, item) => sum + item.amount, 0) * 100
    ) / 100;
    const totalAmount = Math.round((totalPartyAmount + totalDirectAmount) * 100) / 100;
    return ok(
      res,
      {
        total_amount: totalAmount,
        total_parties: parties.length,
        total_party_amount: totalPartyAmount,
        total_direct_amount: totalDirectAmount,
        parties,
        direct_sales: directSales,
      },
      "Revenue by party retrieved successfully"
    );
  } catch (error) {
    next(error);
  }
};



export { getsales };
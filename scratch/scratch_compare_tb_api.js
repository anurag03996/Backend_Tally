import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";
dotenv.config();

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  const companyId = new mongoose.Types.ObjectId("6a97cd4a1c211fccf20c0599");

  // Read our API result
  const raw = fs.readFileSync("C:/Users/sko98/.gemini/antigravity-ide/brain/707d70f7-ba8e-4664-a9f9-1d6955d88c0a/.system_generated/steps/29/content.md", "utf-8");
  const jsonStart = raw.indexOf("{");
  const jsonStr = raw.slice(jsonStart);
  const data = JSON.parse(jsonStr);
  const exp = data.data?.data?.expense;

  // Build map of our API ledgers: name -> { amount, net }
  const apiLedgerMap = new Map();
  for (const l of exp.ledgers) {
    apiLedgerMap.set(l.name.toLowerCase().trim(), l);
  }

  // Get Tally TB doc (timeline: all)
  const tbDoc = await mongoose.connection.db.collection("trialbalances").findOne({
    company_id: companyId,
    groupName: "Indirect Expenses",
    timeline: "all"
  });

  console.log("=== Comparing Tally TB accounts vs API ledgers ===");
  // Vouchers after Sep 2:
  // Staff Welfare: 1143
  // Office Exp: 25000
  // MS BUSINESS OFFICE: 12768
  // Round Off: 0.24
  const expectedDiffAfterSep2 = {
    "staff welfare": 1143,
    "office exp": 25000,
    "ms business office": 12768,
    "round off": 0.24
  };

  let totalDiscrepancy = 0;
  for (const acc of tbDoc.accounts) {
    const nameNorm = acc.accountName.toLowerCase().trim();
    const apiLedger = apiLedgerMap.get(nameNorm);

    const tbDebit = Math.abs(acc.closingDebitAmount || 0);
    const tbCredit = Math.abs(acc.closingCreditAmount || 0);
    const tbNet = acc.closingDebitAmount !== 0 ? acc.closingDebitAmount : acc.closingCreditAmount;

    if (!apiLedger) {
      console.log(`[NOT IN API LEDGERS] TB Account: "${acc.accountName}", Dr: ${tbDebit}, Cr: ${tbCredit}`);
      continue;
    }

    const apiDebit = apiLedger.net <= 0 ? Math.abs(apiLedger.amount) : 0;
    const apiCredit = apiLedger.net > 0 ? Math.abs(apiLedger.amount) : 0;

    const diffDebit = tbDebit - apiDebit;
    const diffCredit = tbCredit - apiCredit;

    const expectedDiff = expectedDiffAfterSep2[nameNorm] || 0;

    if (Math.abs(diffDebit - expectedDiff) > 0.01 || Math.abs(diffCredit - (nameNorm === "round off" ? 0.24 : 0)) > 0.01) {
      console.log(`Mismatch: "${acc.accountName}" | TB Dr: ${tbDebit}, API Dr: ${apiDebit}, DiffDr: ${diffDebit} (expected: ${expectedDiff}) | TB Cr: ${tbCredit}, API Cr: ${apiCredit}, DiffCr: ${diffCredit}`);
    }
  }

  await mongoose.disconnect();
}

check().catch(console.error);

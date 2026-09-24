import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";
dotenv.config();

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  const companyId = new mongoose.Types.ObjectId("6a97cd4a1c211fccf20c0599");

  const raw = fs.readFileSync("C:/Users/sko98/.gemini/antigravity-ide/brain/707d70f7-ba8e-4664-a9f9-1d6955d88c0a/.system_generated/steps/29/content.md", "utf-8");
  const jsonStart = raw.indexOf("{");
  const jsonStr = raw.slice(jsonStart);
  const data = JSON.parse(jsonStr);
  const exp = data.data?.data?.expense;

  const tbDoc = await mongoose.connection.db.collection("trialbalances").findOne({
    company_id: companyId,
    groupName: "Indirect Expenses",
    timeline: "all"
  });

  // Check each TB group account vs the sum of ledgers in API belonging to that group/children
  const groups = exp.groups;
  const ledgers = exp.ledgers;

  function getLedgersForGroup(groupName) {
    // Find all groups whose name is groupName or whose parent chain leads to groupName
    const matchGroupNames = new Set([groupName.toLowerCase()]);
    let added = true;
    while (added) {
      added = false;
      for (const g of groups) {
        if (g.parent && matchGroupNames.has(g.parent.toLowerCase()) && !matchGroupNames.has(g.name.toLowerCase())) {
          matchGroupNames.add(g.name.toLowerCase());
          added = true;
        }
      }
    }

    return ledgers.filter(l => l.parent && matchGroupNames.has(l.parent.toLowerCase()));
  }

  const groupNamesInTB = [
    "All Licences",
    "Bank Charges",
    "Conveyance Expenses",
    "Insurance",
    "Legal & Professional Expenses",
    "Misc. Expenses",
    "Personnal Expenses",
    "Professional Exp.",
    "Stipend"
  ];

  console.log("=== Group Sums Comparison (TB through Sep 5 vs API through Sep 2) ===");
  for (const gName of groupNamesInTB) {
    const tbAcc = tbDoc.accounts.find(a => a.accountName.toLowerCase().trim() === gName.toLowerCase().trim());
    const childLedgers = getLedgersForGroup(gName);

    let apiDr = 0;
    let apiCr = 0;
    for (const cl of childLedgers) {
      if (cl.net <= 0) apiDr += cl.amount;
      else apiCr += cl.amount;
    }

    const tbDr = Math.abs(tbAcc?.closingDebitAmount || 0);
    const tbCr = Math.abs(tbAcc?.closingCreditAmount || 0);

    console.log(`Group: "${gName.padEnd(30)}" | TB Dr: ${String(tbDr).padStart(12)} | API Dr: ${String(apiDr).padStart(12)} | Diff Dr: ${String(tbDr - apiDr).padStart(10)} | TB Cr: ${tbCr} | API Cr: ${apiCr}`);
  }

  // Now check direct ledgers (parent: Indirect Expenses)
  console.log("\n=== Direct Ledgers under Indirect Expenses ===");
  let directTbDr = 0, directApiDr = 0;
  let directTbCr = 0, directApiCr = 0;

  for (const acc of tbDoc.accounts) {
    if (groupNamesInTB.some(g => g.toLowerCase() === acc.accountName.toLowerCase())) continue;

    const apiL = ledgers.find(l => l.name.toLowerCase().trim() === acc.accountName.toLowerCase().trim());
    const tbDr = Math.abs(acc.closingDebitAmount || 0);
    const tbCr = Math.abs(acc.closingCreditAmount || 0);
    const apiDr = apiL ? (apiL.net <= 0 ? apiL.amount : 0) : 0;
    const apiCr = apiL ? (apiL.net > 0 ? apiL.amount : 0) : 0;

    directTbDr += tbDr;
    directApiDr += apiDr;
    directTbCr += tbCr;
    directApiCr += apiCr;

    if (Math.abs(tbDr - apiDr) > 0.01 || Math.abs(tbCr - apiCr) > 0.01) {
      console.log(`  Mismatch direct ledger: "${acc.accountName.padEnd(30)}" | TB Dr: ${tbDr}, API Dr: ${apiDr} (diff: ${tbDr - apiDr}) | TB Cr: ${tbCr}, API Cr: ${apiCr} (diff: ${tbCr - apiCr})`);
    }
  }

  console.log(`\nDirect Ledgers Total: TB Dr = ${directTbDr}, API Dr = ${directApiDr}, Diff = ${directTbDr - directApiDr}`);
  console.log(`Direct Ledgers Total: TB Cr = ${directTbCr}, API Cr = ${directApiCr}, Diff = ${directTbCr - directApiCr}`);

  await mongoose.disconnect();
}

check().catch(console.error);

import fs from "fs";

const raw = fs.readFileSync("C:/Users/sko98/.gemini/antigravity-ide/brain/707d70f7-ba8e-4664-a9f9-1d6955d88c0a/.system_generated/steps/29/content.md", "utf-8");
const jsonStart = raw.indexOf("{");
const jsonStr = raw.slice(jsonStart);
const data = JSON.parse(jsonStr);

const exp = data.data?.data?.expense;

// In exp, we have:
// exp.ledgers: array of { _id, name, group_id, parent, amount, net }
// exp.ledger_entries: array of { _id, voucher_id, ledger_id, ledger_name, amount, is_deemed_positive }
// exp.vouchers: array of { _id, voucher_number, date, amount, narration, party_ledger_name, vchtype }

console.log(`Total vouchers: ${exp.vouchers.length}`);
console.log(`Total ledgers: ${exp.ledgers.length}`);
console.log(`Total ledger entries: ${exp.ledger_entries.length}`);

// Let's check if there are duplicate ledger entries in exp.ledger_entries
const entryIds = new Set();
let dupEntries = 0;
for (const e of exp.ledger_entries) {
  if (entryIds.has(e._id)) {
    dupEntries++;
    console.log("Duplicate entry:", e._id);
  }
  entryIds.add(e._id);
}
console.log(`Duplicate entries in exp.ledger_entries: ${dupEntries}`);

// Let's check how each ledger's net is computed in resolver:
// In resolver:
// ledgerEntries: entries filtered by ledger._id and voucher_id in vouchers._id
// net = sum of ledgerEntries.amount
// amount = abs(sum of ledgerEntries.amount)

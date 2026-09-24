import fs from "fs";

const raw = fs.readFileSync("C:/Users/sko98/.gemini/antigravity-ide/brain/707d70f7-ba8e-4664-a9f9-1d6955d88c0a/.system_generated/steps/29/content.md", "utf-8");
const jsonStart = raw.indexOf("{");
const jsonStr = raw.slice(jsonStart);
const data = JSON.parse(jsonStr);
const exp = data.data?.data?.expense;

let parentStipendExcludingSelf = 0;
let ledgerStipendAmount = 0;

for (const l of exp.ledgers) {
  if (l.parent === "Stipend") {
    if (l.name === "Stipend") {
      ledgerStipendAmount = l.amount;
    } else {
      parentStipendExcludingSelf += l.amount;
    }
  }
}

console.log("Ledger named 'Stipend' (parent is Indirect Expenses):", exp.ledgers.find(l => l.name === "Stipend"));
console.log("Ledger named 'Stipend' amount:", ledgerStipendAmount);
console.log("Sum of child ledgers under group 'Stipend':", parentStipendExcludingSelf);
console.log("Total together:", ledgerStipendAmount + parentStipendExcludingSelf);

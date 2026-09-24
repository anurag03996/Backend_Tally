import fs from "fs";

const raw = fs.readFileSync("C:/Users/sko98/.gemini/antigravity-ide/brain/707d70f7-ba8e-4664-a9f9-1d6955d88c0a/.system_generated/steps/29/content.md", "utf-8");
const jsonStart = raw.indexOf("{");
const jsonStr = raw.slice(jsonStart);
const data = JSON.parse(jsonStr);

const exp = data.data?.data?.expense;

console.log("Non-zero ledgers in expense:");
const nonZeroLedgers = exp.ledgers.filter(l => l.amount !== 0);
console.log(`Total non-zero ledgers: ${nonZeroLedgers.length}`);

// Group by parent or print details
for (const l of nonZeroLedgers) {
  console.log(`${l.name.padEnd(45)} | Parent: ${l.parent.padEnd(25)} | Amount: ${String(l.amount).padStart(12)} | Net: ${String(l.net).padStart(12)}`);
}

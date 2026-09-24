import fs from "fs";

const raw = fs.readFileSync("C:/Users/sko98/.gemini/antigravity-ide/brain/707d70f7-ba8e-4664-a9f9-1d6955d88c0a/.system_generated/steps/29/content.md", "utf-8");
const jsonStart = raw.indexOf("{");
const jsonStr = raw.slice(jsonStart);
const data = JSON.parse(jsonStr);

const exp = data.data?.data?.expense;

console.log("Ledgers with net > 0 (Credit balance):");
for (const l of exp.ledgers) {
  if (l.net > 0) {
    console.log(`${l.name.padEnd(45)} | Net: ${l.net} | Amount: ${l.amount}`);
  }
}

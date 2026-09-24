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

  // Let's print all ledgers in exp that have parent "Stipend" or name containing "Stipend"
  console.log("=== API Ledgers related to Stipend ===");
  let apiStipendSum = 0;
  for (const l of exp.ledgers) {
    if (l.parent === "Stipend" || l.name.toLowerCase().includes("stipend")) {
      console.log(`  ${l.name.padEnd(45)} | parent: ${l.parent.padEnd(20)} | amount: ${l.amount}`);
      apiStipendSum += l.amount;
    }
  }
  console.log(`Total API Stipend sum: ${apiStipendSum}`);

  // Let's check TB doc for anything with "stipend"
  const tbDoc = await mongoose.connection.db.collection("trialbalances").findOne({
    company_id: companyId,
    groupName: "Indirect Expenses",
    timeline: "all"
  });
  console.log("\n=== TB Accounts related to Stipend ===");
  for (const acc of tbDoc.accounts) {
    if (acc.accountName.toLowerCase().includes("stipend")) {
      console.log(`  ${acc.accountName.padEnd(45)} | Dr: ${acc.closingDebitAmount} | Cr: ${acc.closingCreditAmount}`);
    }
  }

  await mongoose.disconnect();
}

check().catch(console.error);

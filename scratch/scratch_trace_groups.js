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

  // For each group, get its child ledgers in our API
  // In exp.groups:
  console.log("=== Group mapping in exp ===");
  for (const g of exp.groups) {
    console.log(`Group ${g._id}: "${g.name}", parent: "${g.parent}"`);
  }

  // Map each ledger in API to its root sub-group under Indirect Expenses
  // Let's inspect
  for (const acc of tbDoc.accounts) {
    // Check if this account is a group
    const isGroup = exp.groups.some(g => g.name.toLowerCase().trim() === acc.accountName.toLowerCase().trim());
    if (isGroup) {
      // Find all ledgers in API that belong to this group or its children
      // We can trace parent
      console.log(`TB Account is a group: "${acc.accountName}", TB Dr: ${acc.closingDebitAmount}, Cr: ${acc.closingCreditAmount}`);
    }
  }

  await mongoose.disconnect();
}

check().catch(console.error);

import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  const companyId = new mongoose.Types.ObjectId("6a97cd4a1c211fccf20c0599");

  const tbDoc = await mongoose.connection.db.collection("trialbalances").findOne({
    company_id: companyId,
    groupName: "Indirect Expenses",
    timeline: "all"
  });

  console.log("TB doc closingDebitAmount:", tbDoc.closingDebitAmount, "closingCreditAmount:", tbDoc.closingCreditAmount);
  console.log("Accounts in Tally TB Indirect Expenses (timeline=all):");
  for (const acc of tbDoc.accounts) {
    console.log(`${acc.accountName.padEnd(45)} | Dr: ${String(acc.closingDebitAmount).padStart(12)} | Cr: ${String(acc.closingCreditAmount).padStart(12)}`);
  }

  await mongoose.disconnect();
}

check().catch(console.error);

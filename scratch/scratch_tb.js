import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  const companyId = new mongoose.Types.ObjectId("6a97cd4a1c211fccf20c0599");

  const tbDocs = await mongoose.connection.db.collection("trialbalances").find({
    company_id: companyId
  }).toArray();
  console.log(`Found ${tbDocs.length} TrialBalance docs`);

  for (const doc of tbDocs) {
    if (doc.groupName.toLowerCase().includes("expense") || doc.groupName.toLowerCase().includes("purchase")) {
      console.log(`Group: "${doc.groupName}" | period: ${doc.period_from} to ${doc.period_to} | timeline: ${doc.timeline} | Dr: ${doc.closingDebitAmount} | Cr: ${doc.closingCreditAmount}`);
      if (doc.accounts) {
        console.log(`  Accounts count: ${doc.accounts.length}`);
      }
    }
  }

  await mongoose.disconnect();
}

check().catch(console.error);

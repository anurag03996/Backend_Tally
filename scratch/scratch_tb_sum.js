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

  let sumDr = 0;
  let sumCr = 0;
  for (const acc of tbDoc.accounts) {
    sumDr += (acc.closingDebitAmount || 0);
    sumCr += (acc.closingCreditAmount || 0);
  }

  console.log("tbDoc.closingDebitAmount:", tbDoc.closingDebitAmount);
  console.log("Sum of tbDoc.accounts Dr:", sumDr);
  console.log("tbDoc.closingCreditAmount:", tbDoc.closingCreditAmount);
  console.log("Sum of tbDoc.accounts Cr:", sumCr);

  await mongoose.disconnect();
}

check().catch(console.error);

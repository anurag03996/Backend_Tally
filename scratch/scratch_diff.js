import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  const companyId = new mongoose.Types.ObjectId("6a97cd4a1c211fccf20c0599");

  // Get all ledgers under Indirect Expenses (and child groups)
  const tbDoc = await mongoose.connection.db.collection("trialbalances").findOne({
    company_id: companyId,
    groupName: "Indirect Expenses",
    timeline: "all"
  });

  const tbDr = Math.abs(tbDoc.closingDebitAmount);
  const tbCr = Math.abs(tbDoc.closingCreditAmount);
  console.log(`Tally TB (through Sep 5): Dr = ${tbDr}, Cr = ${tbCr}`);
  console.log(`User expects (through Sep 2): Dr = 126045316.40, Cr = 48899.34`);
  console.log(`Diff between Sep 5 TB and Sep 2 user expected:`);
  console.log(`  Dr diff = ${tbDr - 126045316.40}`);
  console.log(`  Cr diff = ${tbCr - 48899.34}`);

  // Let's find all ledger entries in vouchers between 2026-09-02 and 2026-09-05
  const vouchersAfter = await mongoose.connection.db.collection("vouchers").find({
    company_id: companyId,
    is_cancelled: { $ne: true },
    is_deleted: { $ne: true },
    date: { $gt: new Date("2026-09-02T23:59:59.999Z") }
  }).toArray();

  const vIds = vouchersAfter.map(v => v._id);
  const entriesAfter = await mongoose.connection.db.collection("ledgerentries").find({
    voucher_id: { $in: vIds }
  }).toArray();

  console.log("\nAll entries in vouchers after 2026-09-02:");
  for (const e of entriesAfter) {
    const l = await mongoose.connection.db.collection("ledgers").findOne({ _id: e.ledger_id });
    const g = l ? await mongoose.connection.db.collection("groups").findOne({ _id: l.group_id }) : null;
    console.log(`Voucher ${e.voucher_id} | Ledger: "${l?.name}" (Group: "${g?.name}") | Amount: ${e.amount} | Deemed: ${e.is_deemed_positive}`);
  }

  await mongoose.disconnect();
}

check().catch(console.error);

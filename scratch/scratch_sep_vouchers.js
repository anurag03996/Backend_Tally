import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  const companyId = new mongoose.Types.ObjectId("6a97cd4a1c211fccf20c0599");

  const vouchers = await mongoose.connection.db.collection("vouchers").find({
    company_id: companyId,
    is_cancelled: { $ne: true },
    is_deleted: { $ne: true },
    date: {
      $gte: new Date("2026-09-01T00:00:00.000Z"),
      $lte: new Date("2026-09-06T23:59:59.999Z")
    }
  }).sort({ date: 1, voucher_number: 1 }).toArray();

  console.log(`Found ${vouchers.length} vouchers between 2026-09-01 and 2026-09-06:`);
  for (const v of vouchers) {
    console.log(`Voucher ${v.voucher_number} (${v.vchtype}) | date: ${v.date?.toISOString()} | party: ${v.party_ledger_name} | narration: ${v.narration}`);
    const entries = await mongoose.connection.db.collection("ledgerentries").find({ voucher_id: v._id }).toArray();
    for (const e of entries) {
      const l = await mongoose.connection.db.collection("ledgers").findOne({ _id: e.ledger_id });
      console.log(`   Ledger: "${l?.name}" | amount: ${e.amount} | deemed: ${e.is_deemed_positive}`);
    }
  }

  await mongoose.disconnect();
}

check().catch(console.error);

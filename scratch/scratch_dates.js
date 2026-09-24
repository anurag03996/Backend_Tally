import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  const companyId = new mongoose.Types.ObjectId("6a97cd4a1c211fccf20c0599");

  const vouchersAfter = await mongoose.connection.db.collection("vouchers").find({
    company_id: companyId,
    is_cancelled: { $ne: true },
    is_deleted: { $ne: true },
    date: { $gt: new Date("2026-09-02T23:59:59.999Z") }
  }).toArray();
  console.log("Vouchers after to_date:", vouchersAfter);

  for (const v of vouchersAfter) {
    const entries = await mongoose.connection.db.collection("ledgerentries").find({ voucher_id: v._id }).toArray();
    console.log(`Entries for voucher ${v.voucher_number} (${v.date}):`, entries);
  }

  await mongoose.disconnect();
}

check().catch(console.error);

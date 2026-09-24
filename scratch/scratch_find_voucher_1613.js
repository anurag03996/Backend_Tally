import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  const companyId = new mongoose.Types.ObjectId("6a97cd4a1c211fccf20c0599");

  // Check all vouchers for this company
  const vouchers = await mongoose.connection.db.collection("vouchers").find({
    company_id: companyId,
    is_cancelled: { $ne: true },
    is_deleted: { $ne: true }
  }).toArray();

  console.log(`Checking ${vouchers.length} vouchers...`);

  for (const v of vouchers) {
    const entries = await mongoose.connection.db.collection("ledgerentries").find({ voucher_id: v._id }).toArray();
    let dr = 0, cr = 0;
    for (const e of entries) {
      if (Math.abs(Math.abs(e.amount) - 1613) < 0.2 || Math.abs(Math.abs(e.amount) - 1612.9) < 0.2 || Math.abs(Math.abs(e.amount) - 1613.1) < 0.2) {
        console.log(`Found entry in voucher ${v.voucher_number} (${v.date}): amount = ${e.amount}, deemed = ${e.is_deemed_positive}`);
      }
    }
  }

  await mongoose.disconnect();
}

check().catch(console.error);

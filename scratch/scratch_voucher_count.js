import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  const companyId = new mongoose.Types.ObjectId("6a97cd4a1c211fccf20c0599");

  const fromDate = new Date("2024-04-01T00:00:00.000Z");
  const toDate = new Date("2026-09-02T23:59:59.999Z");

  const totalVouchersInPeriod = await mongoose.connection.db.collection("vouchers").countDocuments({
    company_id: companyId,
    is_cancelled: { $ne: true },
    is_deleted: { $ne: true },
    date: { $gte: fromDate, $lte: toDate }
  });
  console.log("Total valid vouchers in company during period:", totalVouchersInPeriod);

  await mongoose.disconnect();
}

check().catch(console.error);

import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  const companyId = new mongoose.Types.ObjectId("6a97cd4a1c211fccf20c0599");

  console.log("=== Searching for 1613.10, 1613.1, -1613.1 ===");
  const le = await mongoose.connection.db.collection("ledgerentries").find({
    company_id: companyId,
    $or: [
      { amount: 1613.1 }, { amount: -1613.1 },
      { amount: 1613.10 }, { amount: -1613.10 },
      { amount: 1613 }, { amount: -1613 }
    ]
  }).toArray();
  console.log("Ledger entries matching:", le);

  const ie = await mongoose.connection.db.collection("inventoryentries").find({
    company_id: companyId,
    $or: [
      { amount: 1613.1 }, { amount: -1613.1 },
      { amount: 1613.10 }, { amount: -1613.10 },
      { amount: 1613 }, { amount: -1613 }
    ]
  }).toArray();
  console.log("Inventory entries matching:", ie);

  const vc = await mongoose.connection.db.collection("vouchers").find({
    company_id: companyId,
    $or: [
      { amount: 1613.1 }, { amount: -1613.1 },
      { amount: 1613.10 }, { amount: -1613.10 },
      { amount: 1613 }, { amount: -1613 }
    ]
  }).toArray();
  console.log("Vouchers matching:", vc);

  await mongoose.disconnect();
}

check().catch(console.error);

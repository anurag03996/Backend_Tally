import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

async function check() {
  await mongoose.connect(process.env.MONGO_URI);

  const voucher = await mongoose.connection.db.collection("vouchers").findOne({ _id: new mongoose.Types.ObjectId("6a9949371656806b9a46c66a") });
  console.log("Voucher 6a9949371656806b9a46c66a:", voucher);

  const entries = await mongoose.connection.db.collection("ledgerentries").find({ voucher_id: new mongoose.Types.ObjectId("6a9949371656806b9a46c66a") }).toArray();
  console.log("Entries in this voucher:", entries);

  for (const e of entries) {
    const l = await mongoose.connection.db.collection("ledgers").findOne({ _id: e.ledger_id });
    const g = l ? await mongoose.connection.db.collection("groups").findOne({ _id: l.group_id }) : null;
    console.log(`Ledger ${e.ledger_id}: name="${l?.name}", group="${g?.name}", parent="${l?.parent}"`);
  }

  await mongoose.disconnect();
}

check().catch(console.error);

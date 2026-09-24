import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

async function check() {
  await mongoose.connect(process.env.MONGO_URI);

  const roundOffLedger = await mongoose.connection.db.collection("ledgers").findOne({
    company_id: new mongoose.Types.ObjectId("6a97cd4a1c211fccf20c0599"),
    name: "Round Off"
  });
  console.log("Round Off Ledger:", roundOffLedger);

  if (roundOffLedger) {
    const entries = await mongoose.connection.db.collection("ledgerentries").find({
      ledger_id: roundOffLedger._id
    }).toArray();
    console.log(`Found ${entries.length} entries for Round Off:`);
    let sum = 0;
    for (const e of entries) {
      console.log(`Entry: voucher_id=${e.voucher_id}, amount=${e.amount}, deemed=${e.is_deemed_positive}, type=${e.entry_type}`);
      sum += (e.amount || 0);
    }
    console.log("Sum of amounts:", sum);
  }

  await mongoose.disconnect();
}

check().catch(console.error);

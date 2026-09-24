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

  console.log("tbDoc created_at:", tbDoc.created_at, "updated_at:", tbDoc.updated_at, "last_sync_at:", tbDoc.last_sync_at);

  await mongoose.disconnect();
}

check().catch(console.error);

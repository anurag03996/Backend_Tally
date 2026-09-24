import fs from "fs";

const raw = fs.readFileSync("C:/Users/sko98/.gemini/antigravity-ide/brain/707d70f7-ba8e-4664-a9f9-1d6955d88c0a/.system_generated/steps/29/content.md", "utf-8");
const jsonStart = raw.indexOf("{");
const jsonStr = raw.slice(jsonStart);
const data = JSON.parse(jsonStr);
const exp = data.data?.data?.expense;

// Group vouchers by FY
const vMap = new Map();
for (const v of exp.vouchers) {
  const d = new Date(v.date);
  let fy = "";
  if (d >= new Date("2024-04-01T00:00:00.000Z") && d <= new Date("2025-03-31T23:59:59.999Z")) {
    fy = "2024-25";
  } else if (d >= new Date("2025-04-01T00:00:00.000Z") && d <= new Date("2026-03-31T23:59:59.999Z")) {
    fy = "2025-26";
  } else if (d >= new Date("2026-04-01T00:00:00.000Z") && d <= new Date("2026-09-02T23:59:59.999Z")) {
    fy = "2026-27";
  } else {
    fy = "other";
  }
  vMap.set(v._id, fy);
}

// Now sum ledger entries per FY for each ledger, then compute ledger dr/cr per FY
// Or sum entries directly
console.log("=== Vouchers per FY ===");
const counts = {};
for (const fy of vMap.values()) {
  counts[fy] = (counts[fy] || 0) + 1;
}
console.log(counts);

// Let's compute ledger totals per FY:
// For each ledger:
// calculate net in FY 24-25, net in FY 25-26, net in FY 26-27
const ledgerFyMap = new Map();
for (const l of exp.ledgers) {
  ledgerFyMap.set(l._id, { name: l.name, '2024-25': 0, '2025-26': 0, '2026-27': 0 });
}

for (const e of exp.ledger_entries) {
  const fy = vMap.get(e.voucher_id);
  if (!fy || fy === "other") continue;
  const item = ledgerFyMap.get(e.ledger_id);
  if (item) {
    item[fy] += Number(e.amount) || 0;
  }
}

let dr24_25 = 0, cr24_25 = 0;
let dr25_26 = 0, cr25_26 = 0;
let dr26_27 = 0, cr26_27 = 0;

for (const item of ledgerFyMap.values()) {
  // 24-25
  const net24 = Math.round(item['2024-25'] * 100) / 100;
  if (net24 < 0) dr24_25 += Math.abs(net24);
  else if (net24 > 0) cr24_25 += Math.abs(net24);

  // 25-26
  const net25 = Math.round(item['2025-26'] * 100) / 100;
  if (net25 < 0) dr25_26 += Math.abs(net25);
  else if (net25 > 0) cr25_26 += Math.abs(net25);

  // 26-27
  const net26 = Math.round(item['2026-27'] * 100) / 100;
  if (net26 < 0) dr26_27 += Math.abs(net26);
  else if (net26 > 0) cr26_27 += Math.abs(net26);
}

console.log("\nIf computed per FY by ledger net:");
console.log(`2024-25: Dr = ${dr24_25}, Cr = ${cr24_25}`);
console.log(`2025-26: Dr = ${dr25_26}, Cr = ${cr25_26}`);
console.log(`2026-27: Dr = ${dr26_27}, Cr = ${cr26_27}`);
console.log(`Total:   Dr = ${dr24_25 + dr25_26 + dr26_27}, Cr = ${cr24_25 + cr25_26 + cr26_27}`);

// Compare with TB docs:
// FY 2024-25 TB doc: Dr: 62251597.97, Cr: 46.83
// FY 2025-26 TB doc: Dr: 52968452.28, Cr: 48874
console.log("\nCompare with TB doc:");
console.log("FY 24-25 TB: Dr = 62251597.97, Cr = 46.83");
console.log(`Diff 24-25: Dr diff = ${dr24_25 - 62251597.97}, Cr diff = ${cr24_25 - 46.83}`);
console.log("FY 25-26 TB: Dr = 52968452.28, Cr = 48874");
console.log(`Diff 25-26: Dr diff = ${dr25_26 - 52968452.28}, Cr diff = ${cr25_26 - 48874}`);

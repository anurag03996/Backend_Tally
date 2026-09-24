const groupsDr = 
  3255848.44 +
  461207.74 +
  534301.16 +
  3157164.70 +
  612880.00 +
  2978.26 +
  61064866.81 +
  11845991.00 +
  2136167.00;

const directDr = 40819885.29;

console.log("Total Debit as of 2026-09-02:", groupsDr + directDr);
console.log("Expected by user:", 126045316.40);
console.log("Our API returned:", 126046929.40);
console.log("Diff between Total and Expected:", (groupsDr + directDr) - 126045316.40);
console.log("Diff between Our API and Expected:", 126046929.40 - 126045316.40);

const groupsCr = 48874;
const directCr = 25.24;
console.log("\nTotal Credit as of 2026-09-02:", groupsCr + directCr);
console.log("Expected Credit by user:", 48899.34);
console.log("Diff Credit:", (groupsCr + directCr) - 48899.34);

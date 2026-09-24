import { Router } from "express";
import payableRouter from "./payables/payables.route.js";
import receivableRouter from "./receivables/receivables.route.js";
import syncRouter from "./sync/sync.route.js";
import trialBalanceRouter from "./trialBalance/trialBalance.route.js";
import registerRouter from "./reports/salesPurchase/register.route.js";
import summaryRouter from "./summary/summary.route.js";
import outstandingRouter from "./reports/outstanding/outstanding.route.js";
import voucherRouter from "./voucher/voucher.route.js";
import salesRouter from "./sales/sales.route.js";
import ledgerRouter from "./ledger/ledger.route.js";
import purchaseRouter from "./purchase/purchase.route.js";
import costCenterRouter from "./costcenter/costcenter.route.js";
import godownRouter from "./godown/godown.route.js";
import groupRouter from "./group/group.route.js";
import stockRouter from "./stock/stock.route.js";
import unitRouter from "./unit/unit.route.js";
import accountingRouter from "./accounting/accounting.route.js";
import ExpenseRouter from "./Expense/expenserouter.js";
import revenceRouter from "./revenue/revence.route.js";
import cashRouter from "./cash/cash.route.js";
import bankRouter from "./bank/bank.routes.js";
import dashboardRouter from "../dasboard/dasboard.routes.js";
import knockoffRouter from "./knockoff/knockoff.route.js";

const tallyRouter = Router();

tallyRouter.use("/payable", payableRouter);
tallyRouter.use("/receivable", receivableRouter);
tallyRouter.use("/sync", syncRouter);
tallyRouter.use("/trial-balance", trialBalanceRouter);
tallyRouter.use("/register", registerRouter);
tallyRouter.use("/summary", summaryRouter);
tallyRouter.use("/outstanding", outstandingRouter);
tallyRouter.use("/voucher", voucherRouter);
tallyRouter.use("/sales", salesRouter);
tallyRouter.use("/ledger", ledgerRouter);
tallyRouter.use("/purchase", purchaseRouter);
tallyRouter.use("/cost-center", costCenterRouter);
tallyRouter.use("/godown", godownRouter);
tallyRouter.use("/group", groupRouter);
tallyRouter.use("/stock", stockRouter);
tallyRouter.use("/unit", unitRouter);
tallyRouter.use("/accounting", accountingRouter);
tallyRouter.use("/expense", ExpenseRouter)
tallyRouter.use("/revence", revenceRouter)
tallyRouter.use("/cash", cashRouter);
tallyRouter.use("/bank", bankRouter);
tallyRouter.use("/dashboard", dashboardRouter);
tallyRouter.use("/dasboard", dashboardRouter);
tallyRouter.use("/knockoff", knockoffRouter);

export default tallyRouter;

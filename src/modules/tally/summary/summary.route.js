import { Router } from "express";
import { getFinancialYear ,getFinancialYearRevenueExpenseTrend } from "./summary.controller.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";

const summaryRouter = Router();


summaryRouter.get(
  "/financial-years/:companyId",
  asyncHandler(getFinancialYear),
);
summaryRouter.get(
  "/revenue-expense/:companyId",
  asyncHandler(getFinancialYearRevenueExpenseTrend),
);


export default summaryRouter;


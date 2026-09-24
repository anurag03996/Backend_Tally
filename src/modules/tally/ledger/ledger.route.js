import { Router } from "express";
import { getLedgerList, getAllByCompanyId } from "./ledger.controller.js";
import { asyncHandler } from "../../../utils/response.js";

const ledgerRouter = Router();

ledgerRouter.get("/list/:companyId", asyncHandler(getLedgerList));
ledgerRouter.get("/:companyId", asyncHandler(getAllByCompanyId));

export default ledgerRouter;

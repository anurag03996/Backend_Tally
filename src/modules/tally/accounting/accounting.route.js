import { Router } from "express";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { getAccountingData } from "./accounting.controller.js";

const accountingRouter = Router();

accountingRouter.get("/:companyId", asyncHandler(getAccountingData));


export default accountingRouter;

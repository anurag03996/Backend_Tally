import { Router } from "express";
import {
  getAllByCompanyId,
  getAllStockGroupsByCompanyId,
} from "./stock.controller.js";
import { asyncHandler } from "../../../utils/response.js";

const stockRouter = Router();

stockRouter.get("/groups/:companyId", asyncHandler(getAllStockGroupsByCompanyId));
stockRouter.get("/:companyId", asyncHandler(getAllByCompanyId));

export default stockRouter;

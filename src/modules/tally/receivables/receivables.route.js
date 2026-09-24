import { Router } from "express";
import {
  getReceivables,
  getReceivablesByPartyNameGroup,
  getReceivableCalculation,
  getReceivablesfromParty,
} from "./receivables.controller.js";
import { getReceivablesGstAndTds } from "./receivablesGstTds.controller.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";

const receivablesRouter = Router();

// Calculation route: Sundry Debtors -> Sub-groups -> Ledgers -> Debit & Credit -> Net Outstanding
receivablesRouter.get(
  "/cal/:companyId",
  asyncHandler(getReceivableCalculation),
);

receivablesRouter.get("/cal/party-group/:companyId", asyncHandler(getReceivablesfromParty));

// Bifurcation routes: Receivables with GST and TDS breakdown
receivablesRouter.get(
  "/cal/gst-tds/:companyId",
  asyncHandler(getReceivablesGstAndTds),
);
receivablesRouter.get(
  "/receivablesgstandtds/:companyId",
  asyncHandler(getReceivablesGstAndTds),
);




// unused these  routes these routes used  calcutaed reci

receivablesRouter.get(
  "/party-group/:companyId",
  asyncHandler(getReceivablesByPartyNameGroup),
);
receivablesRouter.get(
  "/party-group-name/:companyId",
  asyncHandler(getReceivablesByPartyNameGroup),
);
receivablesRouter.get("/:companyId", asyncHandler(getReceivables));



export default receivablesRouter;

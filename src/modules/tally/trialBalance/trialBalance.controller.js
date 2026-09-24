import mongoose from "mongoose";
import { getTrialBalanceSummaryService } from "./trialBalance.service.js";
import { ok, fail } from "../../../utils/response.js";
import { ApiError } from "../../../utils/api-error.js";

export const getTrialBalanceSummary = async (req, res, next) => {
  try {
    const { companyId } = req.params;
    const { from_date, to_date, fromDate, toDate, timeline } = req.query;

    const compId = companyId || req.query.company_id || req.query.companyId;
    if (!compId || !mongoose.Types.ObjectId.isValid(compId)) {
      throw ApiError.badRequest("A valid company ID is required");
    }

    const selectedTimeline = timeline ? String(timeline).trim().toLowerCase() : null;

    if (selectedTimeline && selectedTimeline !== "year" && selectedTimeline !== "all") {
      return fail(res, "Invalid timeline. Expected 'all' or 'year'", 400);
    }

    const effectiveTimeline =
      selectedTimeline || (from_date || fromDate || to_date || toDate ? "year" : "all");

    const data = await getTrialBalanceSummaryService({
      companyId: compId,
      fromDate: from_date || fromDate,
      toDate: to_date || toDate,
      timeline: effectiveTimeline,
    });

    return ok(res, data, "Trial balance summary retrieved successfully");
  } catch (error) {
    next(error);
  }
};

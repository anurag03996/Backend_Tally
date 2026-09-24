import { Router } from "express";
import { asyncHandler } from "../../utils/response.js";
import { getDashboardData } from "./dasboard.service.js";

const DashboardRoutes = Router();

// Dashboard home routes
DashboardRoutes.get("/home/:companyId", asyncHandler(getDashboardData));


export default DashboardRoutes;
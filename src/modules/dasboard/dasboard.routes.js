import { Router } from "express";
import { asyncHandler } from "../../utils/response.js";
import { getDashboardData } from "./dasboard.service.js";
import TenantDashboardRoutes from "./tenant/tenant-dashboard.routes.js";

const DashboardRoutes = Router();

// Dashboard home routes (Company level)
DashboardRoutes.get("/home/:companyId", asyncHandler(getDashboardData));

// Tenant dashboard routes (Multi-company & Tenant level)
DashboardRoutes.use("/tenant", TenantDashboardRoutes);

export default DashboardRoutes;
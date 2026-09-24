import { Router } from "express";
import { asyncHandler } from "../../../utils/response.js";
import {
  getTenantDashboardData,
  getTenantCompanyDashboardData,
} from "./tenant-dashboard.controller.js";

const TenantDashboardRoutes = Router();

// Tenant consolidated dashboard (with optional ?company_id= or ?company_ids= query filter)
TenantDashboardRoutes.get("/:tenantId", asyncHandler(getTenantDashboardData));

// Direct single company drill-down scoped under tenant
TenantDashboardRoutes.get(
  "/:tenantId/company/:companyId",
  asyncHandler(getTenantCompanyDashboardData)
);

export default TenantDashboardRoutes;

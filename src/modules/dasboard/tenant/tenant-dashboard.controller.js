import { ok } from "../../../utils/response.js";
import {
  calculateTenantDashboardData,
  normalizeCompanyIds,
} from "./tenant-dashboard.service.js";

/**
 * Controller: Handles requests for Tenant Dashboard calculations
 * Supports filtering by tenant alone, or tenant with company filters.
 */
export const getTenantDashboardData = async (req, res, next) => {
  try {
    const tenantId = req.params?.tenantId || req.query?.tenant_id || req.body?.tenant_id;
    
    // Consolidate company filter inputs (single or multi-company)
    const rawCompanyIds =
      req.query?.company_ids ||
      req.query?.company_id ||
      req.body?.company_ids ||
      req.body?.company_id ||
      req.params?.companyId;

    const companyIds = normalizeCompanyIds(rawCompanyIds);

    const from_date = req.query?.from_date ?? req.body?.from_date;
    const to_date = req.query?.to_date ?? req.body?.to_date;

    const data = await calculateTenantDashboardData({
      tenantId,
      companyIds,
      from_date,
      to_date,
    });

    return ok(res, data, "Tenant dashboard data retrieved successfully");
  } catch (error) {
    if (typeof next === "function") {
      next(error);
    } else {
      throw error;
    }
  }
};

/**
 * Controller: Handles requests for a single company scoped under a specific tenant
 */
export const getTenantCompanyDashboardData = async (req, res, next) => {
  try {
    const { tenantId, companyId } = req.params;
    const from_date = req.query?.from_date ?? req.body?.from_date;
    const to_date = req.query?.to_date ?? req.body?.to_date;

    const data = await calculateTenantDashboardData({
      tenantId,
      companyIds: [companyId],
      from_date,
      to_date,
    });

    return ok(res, data, "Tenant company dashboard data retrieved successfully");
  } catch (error) {
    if (typeof next === "function") {
      next(error);
    } else {
      throw error;
    }
  }
};

export default {
  getTenantDashboardData,
  getTenantCompanyDashboardData,
};

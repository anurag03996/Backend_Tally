import mongoose from "mongoose";
import StockItem from "./stock.schema.js";
import StockGroup from "./stockgroup.schema.js";
import Company from "../../companies/company.schema.js";
import { ApiError } from "../../../utils/api-error.js";
import { ok } from "../../../utils/response.js";
import { escapeRegex } from "../../../utils/escape-regex.js";

export const getAllByCompanyId = async (req, res, next) => {
  try {
    const rawCompanyId =req.params.companyId;
    if (!rawCompanyId) {
      throw ApiError.badRequest("Company ID is required");
    }

    let resolvedCompanyId = null;
    if (mongoose.Types.ObjectId.isValid(rawCompanyId)) {
      resolvedCompanyId = new mongoose.Types.ObjectId(rawCompanyId);
    } else {
      const companyDoc = await Company.findOne({
        $or: [{ tally_company_guid: rawCompanyId }, { name: rawCompanyId }],
        is_deleted: { $ne: true },
      }).select("_id");
      if (companyDoc) {
        resolvedCompanyId = companyDoc._id;
      }
    }

    if (!resolvedCompanyId) {
      throw ApiError.notFound(`Company not found with identifier: ${rawCompanyId}`);
    }

    const {
      page = 1,
      limit = 50,
      search = "",
      name = "",
      parent = "",
      category = "",
      base_unit = "",
    } = req.query;

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(50, Math.max(1, Number(limit) || 50));
    const skip = (pageNum - 1) * limitNum;

    const filter = {
      company_id: resolvedCompanyId,
      is_deleted: { $ne: true },
    };

    const searchText = search || name;
    if (searchText && searchText.trim()) {
      filter.name = {
        $regex: new RegExp(escapeRegex(searchText.trim()), "i"),
      };
    }

    if (parent && parent.trim()) {
      filter.parent = {
        $regex: new RegExp(escapeRegex(parent.trim()), "i"),
      };
    }

    if (category && category.trim()) {
      filter.category = {
        $regex: new RegExp(escapeRegex(category.trim()), "i"),
      };
    }

    if (base_unit && base_unit.trim()) {
      filter.base_unit = {
        $regex: new RegExp(escapeRegex(base_unit.trim()), "i"),
      };
    }

    const [stockItems, totalCount] = await Promise.all([
      StockItem.find(filter)
        .sort({ name: 1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      StockItem.countDocuments(filter),
    ]);

    return ok(
      res,
      {
        total_count: totalCount,
        count: stockItems.length,
        page: pageNum,
        limit: limitNum,
        total_pages: Math.ceil(totalCount / limitNum) || 1,
        data: stockItems,
      },
      "Stock items retrieved successfully",
    );
  } catch (error) {
    next(error);
  }
};

export const getAllStockGroupsByCompanyId = async (req, res, next) => {
  try {
    const rawCompanyId =
      req.params.companyId ||
      req.params.company_id ||
      req.query.company_id ||
      req.query.companyId ||
      req.query.guid ||
      req.query.company_guid;

    if (!rawCompanyId) {
      throw ApiError.badRequest("Company ID is required");
    }

    let resolvedCompanyId = null;
    if (mongoose.Types.ObjectId.isValid(rawCompanyId)) {
      resolvedCompanyId = new mongoose.Types.ObjectId(rawCompanyId);
    } else {
      const companyDoc = await Company.findOne({
        $or: [{ tally_company_guid: rawCompanyId }, { name: rawCompanyId }],
        is_deleted: { $ne: true },
      }).select("_id");
      if (companyDoc) {
        resolvedCompanyId = companyDoc._id;
      }
    }

    if (!resolvedCompanyId) {
      throw ApiError.notFound(`Company not found with identifier: ${rawCompanyId}`);
    }

    const {
      page = 1,
      limit = 50,
      search = "",
      name = "",
      parent = "",
    } = req.query;

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(50, Math.max(1, Number(limit) || 50));
    const skip = (pageNum - 1) * limitNum;

    const filter = {
      company_id: resolvedCompanyId,
      is_deleted: { $ne: true },
    };

    const searchText = search || name;
    if (searchText && searchText.trim()) {
      filter.name = {
        $regex: new RegExp(escapeRegex(searchText.trim()), "i"),
      };
    }

    if (parent && parent.trim()) {
      filter.parent = {
        $regex: new RegExp(escapeRegex(parent.trim()), "i"),
      };
    }

    const [stockGroups, totalCount] = await Promise.all([
      StockGroup.find(filter)
        .sort({ name: 1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      StockGroup.countDocuments(filter),
    ]);

    return ok(
      res,
      {
        total_count: totalCount,
        count: stockGroups.length,
        page: pageNum,
        limit: limitNum,
        total_pages: Math.ceil(totalCount / limitNum) || 1,
        stock_groups: stockGroups,
        data: stockGroups,
      },
      "Stock groups retrieved successfully",
    );
  } catch (error) {
    next(error);
  }
};

export default {
  getAllByCompanyId,
  getAllStockGroupsByCompanyId,
};

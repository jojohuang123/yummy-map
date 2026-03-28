import { createId } from "../lib/id.js";
import { AppError } from "../lib/errors.js";
import { consumeUploads } from "./upload-service.js";
import {
  setCheckin,
  getCheckin,
  getCheckinsList,
  getCheckinsStats,
  getCheckinsByPoiId,
  updateCheckin,
  deleteCheckin
} from "../lib/db.js";

export const RATING_MAP = {
  1: { label: "拉完了", emoji: "😫", color: "#9E9E9E" },
  2: { label: "NPC", emoji: "😐", color: "#78909C" },
  3: { label: "人上人", emoji: "😊", color: "#66BB6A" },
  4: { label: "顶级", emoji: "😍", color: "#FF7043" },
  5: { label: "夯", emoji: "🤩", color: "#FFCA28" }
};

export const CATEGORIES = [
  { value: "western", label: "西餐" },
  { value: "seasia", label: "东南亚菜" },
  { value: "japanese", label: "日料" },
  { value: "bbq", label: "烧烤" },
  { value: "hotpot", label: "火锅" },
  { value: "local", label: "本地菜" },
  { value: "dessert", label: "甜品蛋糕" },
  { value: "cafe", label: "奶茶咖啡" }
];

const validateRating = (rating) => {
  const r = Number(rating);
  if (!r || r < 1 || r > 5 || !Number.isInteger(r)) {
    throw new AppError(400, "INVALID_RATING", "段位必须为 1-5 的整数");
  }
  return r;
};

const truncateComment = (comment) => {
  if (!comment) return null;
  return String(comment).slice(0, 140);
};

const normalizeImages = async (imagesData) => {
  if (!imagesData) return [];

  let uploadIds = [];
  let directImages = [];

  if (Array.isArray(imagesData)) {
    directImages = imagesData.filter((item) => item && item.base64);
    uploadIds = [];
  } else if (imagesData && typeof imagesData === "object") {
    if (Array.isArray(imagesData.uploadIds)) {
      uploadIds = imagesData.uploadIds;
    }
    if (Array.isArray(imagesData.items)) {
      directImages = imagesData.items.filter((item) => item && item.base64);
    }
  }

  const uploadedImages = await consumeUploads(uploadIds);

  const normalizedImages = [
    ...uploadedImages.map((img) => `/api/uploads/${img.id}/raw`),
    ...directImages.map((item) => {
      if (typeof item === "string") return item;
      return item.url || null;
    }).filter(Boolean)
  ];

  if (normalizedImages.length > 3) {
    throw new AppError(400, "TOO_MANY_IMAGES", "图片最多3张");
  }

  return normalizedImages;
};

export const createCheckin = async (data) => {
  const {
    poiId,
    favoriteId,
    shopName,
    address,
    city,
    latitude,
    longitude,
    rating,
    category,
    comment,
    images
  } = data;

  if (!poiId) {
    throw new AppError(400, "POI_ID_REQUIRED", "poiId 不能为空");
  }

  if (!shopName) {
    throw new AppError(400, "SHOP_NAME_REQUIRED", "店铺名称不能为空");
  }

  const validatedRating = validateRating(rating);
  const truncatedComment = truncateComment(comment);
  const normalizedImages = await normalizeImages(images);

  const checkinId = createId("chk");
  const checkin = {
    id: checkinId,
    poi_id: poiId,
    favorite_id: favoriteId || null,
    shop_name: shopName,
    address: address || null,
    city: city || null,
    latitude: latitude ? Number(latitude) : null,
    longitude: longitude ? Number(longitude) : null,
    rating: validatedRating,
    category: category || null,
    comment: truncatedComment,
    images: normalizedImages,
    created_at: new Date().toISOString()
  };

  await setCheckin(checkinId, checkin);

  return formatCheckinResponse(checkin);
};

export const getCheckinList = async ({ page, limit, city, category }) => {
  const result = await getCheckinsList({ page, limit, city, category });
  return {
    list: result.list.map(formatCheckinResponse),
    pagination: result.pagination
  };
};

export const getCheckinById = async (checkinId) => {
  const checkin = await getCheckin(checkinId);
  if (!checkin) {
    throw new AppError(404, "CHECKIN_NOT_FOUND", "打卡记录不存在");
  }
  return formatCheckinResponse(checkin);
};

export const getCheckinsForPoi = async (poiId) => {
  const checkins = await getCheckinsByPoiId(poiId);
  return checkins.map(formatCheckinResponse);
};

export const getLatestCheckinForPoi = async (poiId) => {
  const checkins = await getCheckinsForPoi(poiId);
  return checkins[0] || null;
};

export const getCheckinStats = async () => {
  return await getCheckinsStats();
};

export const updateCheckinRecord = async (checkinId, updates) => {
  const current = await getCheckin(checkinId);
  if (!current) {
    throw new AppError(404, "CHECKIN_NOT_FOUND", "打卡记录不存在");
  }

  // 支持 camelCase 和 snake_case
  const fieldMapping = {
    shop_name: "shop_name",
    shopName: "shop_name",
    address: "address",
    city: "city",
    latitude: "latitude",
    longitude: "longitude",
    rating: "rating",
    category: "category",
    comment: "comment",
    images: "images"
  };

  const allowedFields = ["shop_name", "address", "city", "latitude", "longitude", "rating", "category", "comment", "images"];
  const sanitizedUpdates = {};

  for (const [inputKey, dbKey] of Object.entries(fieldMapping)) {
    if (inputKey in updates) {
      if (dbKey === "rating") {
        sanitizedUpdates[dbKey] = validateRating(updates[inputKey]);
      } else if (dbKey === "comment") {
        sanitizedUpdates[dbKey] = truncateComment(updates[inputKey]);
      } else if (dbKey === "images") {
        sanitizedUpdates[dbKey] = await normalizeImages(updates[inputKey]);
      } else if (dbKey === "latitude" || dbKey === "longitude") {
        sanitizedUpdates[dbKey] = updates[inputKey] ? Number(updates[inputKey]) : null;
      } else {
        sanitizedUpdates[dbKey] = updates[inputKey] || null;
      }
    }
  }

  const updated = await updateCheckin(checkinId, sanitizedUpdates);
  return formatCheckinResponse(updated);
};

export const removeCheckin = async (checkinId) => {
  const current = await getCheckin(checkinId);
  if (!current) {
    throw new AppError(404, "CHECKIN_NOT_FOUND", "打卡记录不存在");
  }

  await deleteCheckin(checkinId);
  return { success: true };
};

const formatCheckinResponse = (checkin) => {
  if (!checkin) return null;

  const ratingInfo = RATING_MAP[checkin.rating] || RATING_MAP[1];
  const categoryInfo = CATEGORIES.find((c) => c.value === checkin.category);

  return {
    id: checkin.id,
    poiId: checkin.poi_id,
    favoriteId: checkin.favorite_id,
    shopName: checkin.shop_name,
    address: checkin.address,
    city: checkin.city,
    latitude: checkin.latitude,
    longitude: checkin.longitude,
    rating: checkin.rating,
    ratingLabel: ratingInfo.label,
    ratingEmoji: ratingInfo.emoji,
    ratingColor: ratingInfo.color,
    category: checkin.category,
    categoryLabel: categoryInfo ? categoryInfo.label : null,
    comment: checkin.comment,
    images: checkin.images || [],
    createdAt: checkin.created_at,
    updatedAt: checkin.updated_at
  };
};

import { createId } from "../lib/id.js";
import { sleep } from "../lib/async.js";
import { AppError } from "../lib/errors.js";
import {
  setImport,
  getImport,
  setFavorite,
  hasFavorite,
  getAllFavorites,
  deleteFavoriteById,
  getFavoritesCount
} from "../lib/db.js";
import { searchPlaceByKeyword } from "./amap-service.js";
import { detectCityFromText } from "./city-detect.js";
import { recognizeImages } from "./paddle-ocr-service.js";
import { normalizeCandidateNames } from "./text-normalize.js";
import { consumeUploads } from "./upload-service.js";

const enrichmentJobs = new Set();

const isVisibleFoodItem = (item) => item.matchStatus === "matched";

const buildPendingItem = (inputName) => ({
  id: createId("item"),
  inputName,
  poiId: "",
  poiName: inputName,
  matchStatus: "pending",
  matchStatusLabel: "补齐中",
  selected: true,
  rating: null,
  ratingLabel: "补齐中",
  cost: null,
  costLabel: "补齐中",
  address: "",
  addressLabel: "补齐中",
  businessArea: "",
  topTags: [],
  location: {
    latitude: 31.2304,
    longitude: 121.4737
  }
});

const buildUnmatchedItem = (inputName) => ({
  id: createId("item"),
  inputName,
  poiId: "",
  poiName: inputName,
  matchStatus: "filtered",
  matchStatusLabel: "已过滤",
  selected: false,
  rating: null,
  ratingLabel: "暂无评分",
  cost: null,
  costLabel: "暂无人均",
  address: "",
  addressLabel: "暂无地址",
  businessArea: "",
  topTags: [],
  location: {
    latitude: 31.2304,
    longitude: 121.4737
  }
});

const buildPreviewSummary = (items) => ({
  total: items.filter((item) => isVisibleFoodItem(item)).length,
  matched: items.filter((item) => item.matchStatus === "matched").length,
  selected: items.filter((item) => item.selected && item.matchStatus === "matched").length
});

const normalizeImages = (images) =>
  images
    .filter((item) => item && item.base64)
    .map((item) => ({
      base64: String(item.base64).replace(/^data:.+;base64,/, ""),
      mimeType: item.mimeType || "image/jpeg",
      name: item.name || "upload.jpg"
    }));

const finalizeMatchedItem = (currentItem, place) => ({
  id: currentItem.id,
  ...place,
  selected: currentItem.selected !== false
});

const finalizeUnmatchedItem = (currentItem) => ({
  ...buildUnmatchedItem(currentItem.inputName),
  id: currentItem.id,
  selected: false
});

const updateImportPreview = async (importId, updater) => {
  const currentPreview = await getImport(importId);
  if (!currentPreview) return null;
  const nextPreview = updater(currentPreview);
  await setImport(importId, nextPreview);
  return nextPreview;
};

const enrichImportItems = async (importId) => {
  if (enrichmentJobs.has(importId)) return;
  enrichmentJobs.add(importId);

  const preview = await getImport(importId);
  if (!preview) {
    enrichmentJobs.delete(importId);
    return;
  }

  for (const item of preview.items) {
    try {
      await sleep(250);
      const place = await searchPlaceByKeyword({
        keyword: item.inputName,
        cityAdcode: preview.cityAdcode,
        cityName: preview.cityName
      });

      await updateImportPreview(importId, (currentPreview) => {
        const nextItems = currentPreview.items.map((currentItem) => {
          if (currentItem.id !== item.id) return currentItem;
          if (!place) return finalizeUnmatchedItem(currentItem);
          return finalizeMatchedItem(currentItem, place);
        });

        return {
          ...currentPreview,
          items: nextItems,
          summary: buildPreviewSummary(nextItems),
          status: "enriching"
        };
      });
    } catch {
      await updateImportPreview(importId, (currentPreview) => {
        const nextItems = currentPreview.items.map((currentItem) => {
          if (currentItem.id !== item.id) return currentItem;
          return {
            ...currentItem,
            matchStatus: "filtered",
            matchStatusLabel: "已过滤",
            selected: false,
            ratingLabel: "暂无评分",
            costLabel: "暂无人均",
            addressLabel: "暂无地址"
          };
        });

        return {
          ...currentPreview,
          items: nextItems,
          summary: buildPreviewSummary(nextItems),
          status: "enriching"
        };
      });
    }
  }

  await updateImportPreview(importId, (currentPreview) => ({
    ...currentPreview,
    status: "preview_ready",
    summary: buildPreviewSummary(currentPreview.items)
  }));
  enrichmentJobs.delete(importId);
};

export const createImport = async ({ cityName, cityAdcode, text, images }) => {
  const directImages = Array.isArray(images) ? images : Array.isArray(images?.items) ? images.items : [];
  const uploadedImages = await consumeUploads(Array.isArray(images?.uploadIds) ? images.uploadIds : []);
  const normalizedImages = normalizeImages([...directImages, ...uploadedImages]);
  const cleanText = String(text || "").trim();

  if (!cleanText && !normalizedImages.length) {
    throw new AppError(400, "IMPORT_INVALID_INPUT", "请先输入文本或上传图片");
  }

  if (normalizedImages.length > 3) {
    throw new AppError(400, "IMPORT_TOO_MANY_IMAGES", "图片最多3张");
  }

  let ocrResult = { lines: [], provider: "none" };

  if (normalizedImages.length) {
    try {
      ocrResult = await recognizeImages(normalizedImages);
    } catch (error) {
      if (cleanText) {
        ocrResult = { lines: [], provider: "skipped-after-error" };
      } else {
        throw error;
      }
    }
  }

  const combinedText = [cleanText, ocrResult.lines.join("\n")].filter(Boolean).join("\n");
  const autoDetectedCity = !cityAdcode ? detectCityFromText(combinedText) : null;
  const resolvedCityName = cityAdcode ? cityName : autoDetectedCity ? autoDetectedCity.name : "自动识别";
  const resolvedCityAdcode = cityAdcode || (autoDetectedCity ? autoDetectedCity.adcode : "");
  const candidateNames = normalizeCandidateNames(combinedText);

  if (!candidateNames.length) {
    throw new AppError(400, "IMPORT_NO_CANDIDATES", "未识别出有效店名，请调整文本或截图后重试");
  }

  const items = candidateNames.map((name) => buildPendingItem(name));

  const importId = createId("imp");
  const preview = {
    id: importId,
    cityName: resolvedCityName,
    cityAdcode: resolvedCityAdcode,
    rawCandidateCount: candidateNames.length,
    status: "enriching",
    ocrStageText: normalizedImages.length ? "OCR 已完成，正在补充门店信息..." : "正在补充门店信息...",
    ocrProvider: ocrResult.provider,
    summary: buildPreviewSummary(items),
    items
  };

  await setImport(importId, preview);
  void enrichImportItems(importId);
  return preview;
};

export const getImportById = async (importId) => {
  const preview = await getImport(importId);
  if (!preview) {
    throw new AppError(404, "IMPORT_NOT_FOUND", "导入任务不存在");
  }
  return preview;
};

export const updateImportSelections = async (importId, selectedItemIds) => {
  const preview = await getImportById(importId);
  const selectedSet = new Set(selectedItemIds);
  const items = preview.items.map((item) => ({
    ...item,
    selected: item.matchStatus === "matched" && selectedSet.has(item.id)
  }));

  const nextPreview = {
    ...preview,
    items,
    summary: buildPreviewSummary(items)
  };
  await setImport(importId, nextPreview);
  return nextPreview;
};

export const confirmImport = async (importId) => {
  const preview = await getImportById(importId);
  let importedCount = 0;
  let duplicateCount = 0;

  for (const item of preview.items) {
    if (!item.selected || item.matchStatus !== "matched" || !item.poiId) continue;

    if (await hasFavorite(item.poiId)) {
      duplicateCount += 1;
      continue;
    }

    await setFavorite(item.poiId, {
      id: createId("fav"),
      poiId: item.poiId,
      name: item.poiName,
      rating: item.rating,
      cost: item.cost,
      topTags: item.topTags,
      topTagsLabel: item.topTags.join(" / ") || "暂无特色菜",
      latitude: item.location.latitude,
      longitude: item.location.longitude,
      address: item.address,
      businessArea: item.businessArea,
      adcode: item.adcode || "",
      importId,
      createdAt: new Date().toISOString()
    });
    importedCount += 1;
  }

  return {
    importId,
    importedCount,
    duplicateCount,
    favoritesCount: await getFavoritesCount()
  };
};

export const getFavoriteList = async () => getAllFavorites();

export const removeFavorite = async (favoriteId) => {
  const deleted = await deleteFavoriteById(favoriteId);
  if (!deleted) {
    throw new AppError(404, "FAVORITE_NOT_FOUND", "收藏不存在");
  }
  return { success: true };
};

export const removeFavorites = async (favoriteIds) => {
  let deletedCount = 0;
  for (const id of favoriteIds || []) {
    const deleted = await deleteFavoriteById(id);
    if (deleted) deletedCount += 1;
  }
  return { success: true, deletedCount };
};

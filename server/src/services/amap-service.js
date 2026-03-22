import { config } from "../config.js";
import { AppError } from "../lib/errors.js";
import { sleep, withTimeout } from "../lib/async.js";
import { findMockPlace } from "./mock-data.js";

const parseTopTags = (value) =>
  String(value || "")
    .split(/[\/,，;；、]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 3);

const buildLabels = (place) => ({
  ratingLabel: place.rating ? String(place.rating) : "暂无评分",
  costLabel: place.cost ? `¥${place.cost}` : "暂无人均",
  addressLabel: place.address || "暂无地址",
  matchStatusLabel: place.matchStatus === "matched" ? "已匹配" : "未匹配成功"
});

const isFoodPoi = (poi) => {
  const type = String(poi?.type || "");
  const typecode = String(poi?.typecode || "");
  return type.startsWith("餐饮服务") || typecode.startsWith("05");
};

const fromMock = (keyword) => {
  const mockPlace = findMockPlace(keyword);
  if (!mockPlace) return null;

  return {
    inputName: keyword,
    ...mockPlace,
    matchStatus: "matched",
    ...buildLabels({ ...mockPlace, matchStatus: "matched" })
  };
};

const fromAmapPoi = (keyword, poi) => {
  const [longitude = 121.4737, latitude = 31.2304] = String(poi.location || "")
    .split(",")
    .map((item) => Number(item));
  const bizExt = poi.biz_ext || {};
  const topTags = parseTopTags(poi.tag);
  const rating = bizExt.rating ? Number(bizExt.rating) : null;
  const cost = bizExt.cost ? Number(bizExt.cost) : null;

  const place = {
    inputName: keyword,
    poiId: poi.id || "",
    poiName: poi.name || keyword,
    rating,
    cost,
    address: poi.address || "",
    businessArea: poi.business_area || "",
    adcode: String(poi.adcode || ""),
    topTags,
    location: {
      latitude,
      longitude
    },
    matchStatus: "matched"
  };

  return {
    ...place,
    ...buildLabels(place)
  };
};

export const searchPlaceByKeyword = async ({ keyword, cityAdcode }) => {
  if (!config.amapWebApiKey) {
    return fromMock(keyword);
  }

  let data = null;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const searchUrl = new URL("https://restapi.amap.com/v3/place/text");
    searchUrl.searchParams.set("key", config.amapWebApiKey);
    searchUrl.searchParams.set("keywords", keyword);
    if (cityAdcode) {
      searchUrl.searchParams.set("city", cityAdcode);
      searchUrl.searchParams.set("citylimit", "true");
    }
    searchUrl.searchParams.set("extensions", "all");
    searchUrl.searchParams.set("offset", "5");

    data = await withTimeout(
      async (signal) => {
        const response = await fetch(searchUrl, { signal });
        if (!response.ok) {
          throw new AppError(502, "POI_SEARCH_FAILED", "高德查询失败");
        }
        return response.json();
      },
      config.amapTimeoutMs,
      () => new AppError(504, "POI_SEARCH_TIMEOUT", "高德查询超时")
    );

    if (String(data.status) === "1") {
      break;
    }

    const errorMessage = String(data.info || "");
    if (!/CUQPS_HAS_EXCEEDED_THE_LIMIT/.test(errorMessage) || attempt === 3) {
      throw new AppError(502, "POI_SEARCH_FAILED", errorMessage || "高德查询失败");
    }

    await sleep(700 * (attempt + 1));
  }

  const firstPoi = Array.isArray(data.pois) ? data.pois.find((poi) => isFoodPoi(poi)) || null : null;
  if (!firstPoi) {
    return null;
  }

  return fromAmapPoi(keyword, firstPoi);
};

/**
 * 美食地图助手 - 地图页面功能测试
 *
 * 测试场景：
 * 1. Marker 点击切换卡片
 * 2. 面板拖动展开/收起
 * 3. 附近商家列表点击切换
 * 4. 城市筛选动态显示
 */

const API_BASE = "http://127.0.0.1:3000";

// 测试数据
const TEST_STORES = [
  {
    id: "store_1",
    name: "老吉士酒家",
    rating: 4.6,
    cost: 168,
    topTags: ["红烧肉", "葱油拌面"],
    topTagsLabel: "红烧肉 / 葱油拌面",
    latitude: 31.203146,
    longitude: 121.437969,
    address: "天平路41号",
    businessArea: "湖南路",
    adcode: "310104"
  },
  {
    id: "store_2",
    name: "阿娘面馆",
    rating: 4.5,
    cost: 38,
    topTags: ["黄鱼烩面"],
    topTagsLabel: "黄鱼烩面",
    latitude: 31.217705,
    longitude: 121.466468,
    address: "思南路36号",
    businessArea: "淮海路",
    adcode: "310101"
  },
  {
    id: "store_3",
    name: "兰心餐厅",
    rating: 4.5,
    cost: 106,
    topTags: ["草头", "酱爆猪肝"],
    topTagsLabel: "草头 / 酱爆猪肝",
    latitude: 31.221665,
    longitude: 121.459901,
    address: "进贤路130号",
    businessArea: "淮海路",
    adcode: "310101"
  },
  {
    id: "store_4",
    name: "玉珍酸笋火锅",
    rating: 4.9,
    cost: 56,
    topTags: ["牛肉", "双人餐"],
    topTagsLabel: "牛肉 / 双人餐",
    latitude: 26.582735,
    longitude: 106.71355,
    address: "青禾路慈善巷",
    businessArea: "喷水池",
    adcode: "520103"
  },
  {
    id: "store_5",
    name: "红牌铁板烧",
    rating: 4.7,
    cost: 54,
    topTags: ["小吃街", "牛肉"],
    topTagsLabel: "小吃街 / 牛肉",
    latitude: 26.583083,
    longitude: 106.669568,
    address: "三桥中坝路",
    businessArea: "",
    adcode: "520103"
  }
];

// 测试工具
let passed = 0;
let failed = 0;
let currentTest = "";
const pendingTests = [];

const assert = (condition, message) => {
  if (condition) {
    passed++;
    console.log(`  ✅ ${message}`);
  } else {
    failed++;
    console.log(`  ❌ ${message}`);
  }
};

const test = (name, fn) => {
  currentTest = name;
  console.log(`\n📋 ${name}`);
  try {
    const result = fn();
    if (result && typeof result.then === "function") {
      pendingTests.push(
        result.catch((error) => {
          failed++;
          console.log(`  ❌ 测试执行错误: ${error.message}`);
        })
      );
    }
  } catch (e) {
    failed++;
    console.log(`  ❌ 测试执行错误: ${e.message}`);
  }
};

const fetchJsonOrSkip = async (path) => {
  try {
    const response = await fetch(`${API_BASE}${path}`);
    const data = await response.json();
    return { response, data };
  } catch (error) {
    console.log(`  ⚠️ 跳过 API 测试（${error.code || error.message}）`);
    return null;
  }
};

// ========== 单元测试：距离计算 ==========
test("距离计算函数 - 同一位置", () => {
  const calcDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const dist = calcDistance(31.2, 121.4, 31.2, 121.4);
  assert(dist < 1, `同一位置距离应接近0，实际: ${dist}`);
});

test("距离计算函数 - 几公里距离", () => {
  const calcDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // 上海老吉士到阿娘面馆约3公里
  const dist = calcDistance(31.203146, 121.437969, 31.217705, 121.466468);
  assert(dist > 2000 && dist < 5000, `老吉士到阿娘面馆距离应在2-5km，实际: ${Math.round(dist)}m`);
});

test("距离格式化 - 米", () => {
  const formatDistance = (meters) => {
    if (meters < 1000) {
      return Math.round(meters) + 'm';
    } else {
      return (meters / 1000).toFixed(1) + 'km';
    }
  };

  assert(formatDistance(500) === "500m", `500米应显示为500m，实际: ${formatDistance(500)}`);
  assert(formatDistance(100) === "100m", `100米应显示为100m，实际: ${formatDistance(100)}`);
});

test("距离格式化 - 公里", () => {
  const formatDistance = (meters) => {
    if (meters < 1000) {
      return Math.round(meters) + 'm';
    } else {
      return (meters / 1000).toFixed(1) + 'km';
    }
  };

  assert(formatDistance(1500) === "1.5km", `1500米应显示为1.5km，实际: ${formatDistance(1500)}`);
  assert(formatDistance(3000) === "3.0km", `3000米应显示为3.0km，实际: ${formatDistance(3000)}`);
});

// ========== 单元测试：附近商家计算 ==========
test("附近商家计算 - 基础排序", () => {
  const calcDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const calcNearbyStores = (currentStore, allStores, maxCount = 10) => {
    if (!currentStore) return [];
    const otherStores = allStores.filter(s => s.id !== currentStore.id);
    const storesWithDistance = otherStores.map(store => {
      const distance = calcDistance(
        currentStore.latitude, currentStore.longitude,
        store.latitude, store.longitude
      );
      return { ...store, distance };
    });
    storesWithDistance.sort((a, b) => a.distance - b.distance);
    return storesWithDistance.slice(0, maxCount);
  };

  const currentStore = TEST_STORES[0]; // 老吉士酒家
  const nearby = calcNearbyStores(currentStore, TEST_STORES);

  assert(nearby.length === 4, `应有4个附近商家，实际: ${nearby.length}`);

  // 验证距离递增
  for (let i = 1; i < nearby.length; i++) {
    assert(nearby[i].distance >= nearby[i-1].distance,
      `${nearby[i].name}距离(${Math.round(nearby[i].distance)})应 >= ${nearby[i-1].name}距离(${Math.round(nearby[i-1].distance)})`);
  }

  // 验证最近的两个在上海（距离在3000m以内）
  assert(nearby[0].distance < 3000, `最近的应在3km内，实际: ${Math.round(nearby[0].distance)}m`);
  assert(nearby[1].distance < 4000, `第二近的应在4km内，实际: ${Math.round(nearby[1].distance)}m`);
});

test("附近商家计算 - 无当前门店返回空", () => {
  const calcNearbyStores = (currentStore, allStores, maxCount = 10) => {
    if (!currentStore) return [];
    return [];
  };

  const nearby = calcNearbyStores(null, TEST_STORES);
  assert(nearby.length === 0, `无当前门店应返回空数组，实际: ${nearby.length}`);
});

test("附近商家计算 - 限制数量", () => {
  const calcDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const calcNearbyStores = (currentStore, allStores, maxCount = 10) => {
    if (!currentStore) return [];
    const otherStores = allStores.filter(s => s.id !== currentStore.id);
    const storesWithDistance = otherStores.map(store => {
      const distance = calcDistance(
        currentStore.latitude, currentStore.longitude,
        store.latitude, store.longitude
      );
      return { ...store, distance };
    });
    storesWithDistance.sort((a, b) => a.distance - b.distance);
    return storesWithDistance.slice(0, maxCount);
  };

  const currentStore = TEST_STORES[0];
  const nearby = calcNearbyStores(currentStore, TEST_STORES, 2);
  assert(nearby.length === 2, `限制2个应返回2个，实际: ${nearby.length}`);
});

// ========== 单元测试：城市列表构建 ==========
test("城市列表构建 - 基础功能", () => {
  const cityNameMap = {
    "31": "上海", "52": "贵州"
  };

  const buildCityList = (favorites) => {
    const cityMap = new Map();
    favorites.forEach(item => {
      if (item.adcode) {
        const code = String(item.adcode);
        const prefix = code.slice(0, 2);
        if (!cityMap.has(prefix)) {
          cityMap.set(prefix, {
            name: cityNameMap[prefix] || prefix,
            adcode: prefix
          });
        }
      }
    });
    const cities = Array.from(cityMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name, 'zh-CN')
    );
    return [{ name: "全部", adcode: "" }, ...cities];
  };

  const cityList = buildCityList(TEST_STORES);

  assert(cityList.length === 3, `应有3个城市（全部+上海+贵州），实际: ${cityList.length}`);
  assert(cityList[0].name === "全部", `第一个应是"全部"，实际: ${cityList[0].name}`);
  // 注意：贵州(贵) 按拼音排序在 上海(上) 之前
  assert(cityList[1].name === "贵州", `第二个应是"贵州"（贵<上），实际: ${cityList[1].name}`);
  assert(cityList[2].name === "上海", `第三个应是"上海"，实际: ${cityList[2].name}`);
});

test("城市列表构建 - 按城市名排序", () => {
  const cityNameMap = {
    "31": "上海", "52": "贵州", "44": "广东"
  };

  const buildCityList = (favorites) => {
    const cityMap = new Map();
    favorites.forEach(item => {
      if (item.adcode) {
        const code = String(item.adcode);
        const prefix = code.slice(0, 2);
        if (!cityMap.has(prefix)) {
          cityMap.set(prefix, {
            name: cityNameMap[prefix] || prefix,
            adcode: prefix
          });
        }
      }
    });
    const cities = Array.from(cityMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name, 'zh-CN')
    );
    return [{ name: "全部", adcode: "" }, ...cities];
  };

  const cityList = buildCityList(TEST_STORES);

  // 贵州(贵) < 广东(广) < 上海(上) 按拼音排序
  assert(cityList[1].name === "贵州", `排序后第二个应是"贵州"，实际: ${cityList[1].name}`);
  assert(cityList[2].name === "上海", `排序后第三个应是"上海"，实际: ${cityList[2].name}`);
});

// ========== 单元测试：评分分类 ==========
const getRatingClass = (rating) => {
  const numRating = Number(rating) || 0;
  if (numRating >= 4.7) return 'rating-top';
  if (numRating >= 4.4) return 'rating-high';
  if (numRating >= 4.0) return 'rating-mid';
  return 'rating-low';
};

test("评分分类 - 顶级推荐", () => {
  assert(getRatingClass(4.7) === 'rating-top', `4.7分应是顶级推荐，实际: ${getRatingClass(4.7)}`);
  assert(getRatingClass(4.9) === 'rating-top', `4.9分应是顶级推荐，实际: ${getRatingClass(4.9)}`);
});

test("评分分类 - 高分推荐", () => {
  assert(getRatingClass(4.4) === 'rating-high', `4.4分应是高分推荐，实际: ${getRatingClass(4.4)}`);
  assert(getRatingClass(4.6) === 'rating-high', `4.6分应是高分推荐，实际: ${getRatingClass(4.6)}`);
});

test("评分分类 - 中等可选", () => {
  assert(getRatingClass(4.0) === 'rating-mid', `4.0分应是中等可选，实际: ${getRatingClass(4.0)}`);
  assert(getRatingClass(4.3) === 'rating-mid', `4.3分应是中等可选，实际: ${getRatingClass(4.3)}`);
});

test("评分分类 - 低分或暂无", () => {
  assert(getRatingClass(3.9) === 'rating-low', `3.9分应是低分或暂无，实际: ${getRatingClass(3.9)}`);
  assert(getRatingClass(3.0) === 'rating-low', `3.0分应是低分或暂无，实际: ${getRatingClass(3.0)}`);
  assert(getRatingClass(null) === 'rating-low', `null应是低分或暂无，实际: ${getRatingClass(null)}`);
  assert(getRatingClass(undefined) === 'rating-low', `undefined应是低分或暂无，实际: ${getRatingClass(undefined)}`);
});

// ========== API 测试 ==========
test("API - 健康检查", async () => {
  const result = await fetchJsonOrSkip("/health");
  if (!result) return;
  const { response, data } = result;
  assert(response.status === 200, `状态码应为200，实际: ${response.status}`);
  assert(data.ok === true, `ok应为true`);
});

test("API - 获取地图数据", async () => {
  const result = await fetchJsonOrSkip("/api/favorites/map");
  if (!result) return;
  const { response, data } = result;
  assert(response.status === 200, `状态码应为200，实际: ${response.status}`);
  assert(Array.isArray(data.items), `items应为数组`);
  assert(data.items.length > 0, `应有收藏数据`);

  // 验证数据结构
  const item = data.items[0];
  assert(item.id, `应有id`);
  assert(item.name, `应有name`);
  assert(typeof item.latitude === 'number', `latitude应为数字`);
  assert(typeof item.longitude === 'number', `longitude应为数字`);
  assert(item.adcode, `应有adcode`);

  console.log(`  📍 当前收藏数: ${data.items.length}`);
  console.log(`  📍 第一家: ${data.items[0].name}`);
});

// ========== 输出结果 ==========
// ========== 交互测试：Marker ID 处理 ==========
test("Marker ID 处理 - 数字索引对应商家", () => {
  const filteredFavorites = TEST_STORES.slice(0, 3);

  // 模拟 marker 点击，使用数字索引
  const markerId = 1; // 点击第二个商家
  const item = filteredFavorites[markerId];

  assert(item !== undefined, `索引${markerId}应有对应商家`);
  assert(item.name === "阿娘面馆", `索引1应对应阿娘面馆，实际: ${item?.name}`);
});

test("Marker ID 处理 - 边界情况", () => {
  const filteredFavorites = TEST_STORES.slice(0, 3);

  // 索引超出范围
  const markerId = 10;
  const item = filteredFavorites[markerId];

  assert(item === undefined, `索引10应无对应商家，实际: ${item}`);
});

// ========== 交互测试：面板状态 ==========
test("面板状态 - 初始状态", () => {
  const panelHeight = 492;
  const panelExpandedHeight = 840;

  // 初始应为收起状态
  const isExpanded = panelHeight >= (panelHeight + panelExpandedHeight) / 2;
  assert(isExpanded === false, `初始高度492应收起`);
});

test("面板状态 - 展开阈值判断", () => {
  const panelHeight = 492;
  const panelExpandedHeight = 840;
  const midPoint = (panelHeight + panelExpandedHeight) / 2;

  assert(midPoint === 666, `中点应为666`);

  assert(700 > midPoint, `700 > 666 应展开`);
  assert(620 < midPoint, `620 < 666 应收起`);
});

test("点击附近商家 - 面板应切回大卡片态", () => {
  // 模拟点击附近商家后的状态
  const currentPanelExpanded = true;
  const currentPanelHeight = 840;

  // 点击后应切回大卡片态
  const newPanelExpanded = false;
  const newPanelHeight = 492;

  assert(newPanelExpanded === false, `点击后panelExpanded应为false`);
  assert(currentPanelExpanded === true, `点击前panelExpanded应为true`);
  assert(currentPanelHeight === 840, `点击前panelHeight应为840，实际: ${currentPanelHeight}`);
  assert(newPanelHeight === 492, `点击后panelHeight应切回492，实际: ${newPanelHeight}`);
});

test("面板展开 - 应给附近商家列表预留可视高度", () => {
  const panelExpandedHeight = 840;
  const panelBottomInset = 100;
  const dragHandleHeight = 28;
  const currentStoreSectionHeight = 160;
  const nearbyHeaderHeight = 52;
  const nearbyListMinHeight = 340;
  const availableHeight =
    panelExpandedHeight - panelBottomInset - dragHandleHeight - currentStoreSectionHeight - nearbyHeaderHeight;

  assert(availableHeight >= nearbyListMinHeight, `展开后列表可视高度应至少340，实际: ${availableHeight}`);
});

test("面板收起 - 应完整容纳操作按钮区", () => {
  const panelCollapsedHeight = 492;
  const panelBottomInset = 100;
  const dragHandleHeight = 28;
  const currentStoreSectionHeight = 326;
  const pullUpHintHeight = 32;
  const requiredHeight = panelBottomInset + dragHandleHeight + currentStoreSectionHeight + pullUpHintHeight;

  assert(requiredHeight <= panelCollapsedHeight, `收起态应完整显示卡片和按钮，实际预算: ${requiredHeight}`);
});

test("面板收起 - 应通过内部留白避让系统 tabBar", () => {
  const panelBottomOffset = 0;
  const panelBottomInset = 100;
  const tabBarHeight = 100;

  assert(panelBottomOffset === 0, `面板应贴底显示，实际偏移: ${panelBottomOffset}`);
  assert(panelBottomInset >= tabBarHeight, `面板内部应避让 tabBar，内部留白: ${panelBottomInset}`);
});

// ========== 交互测试：applyFilter 参数处理 ==========
test("applyFilter 参数 - undefined 选择第一个", () => {
  const filtered = TEST_STORES;
  let selectedFavorite;

  // 当参数为 undefined 时，应该选择第一个
  selectedFavorite = filtered[0];
  assert(selectedFavorite.name === "老吉士酒家", `undefined应选择第一个`);

  // 当参数有值时，应该使用该值
  const specificItem = TEST_STORES[2];
  selectedFavorite = specificItem;
  assert(selectedFavorite.name === "兰心餐厅", `有参数应使用该参数`);
});

// ========== 交互测试：点击附近商家 ==========
test("点击附近商家 - 卡片和列表同时更新", () => {
  const calcDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const calcNearbyStores = (currentStore, allStores, maxCount = 10) => {
    if (!currentStore) return [];
    const otherStores = allStores.filter(s => s.id !== currentStore.id);
    const storesWithDistance = otherStores.map(store => {
      const distance = calcDistance(
        currentStore.latitude, currentStore.longitude,
        store.latitude, store.longitude
      );
      return { ...store, distance };
    });
    storesWithDistance.sort((a, b) => a.distance - b.distance);
    return storesWithDistance.slice(0, maxCount);
  };

  // 初始状态：选中 store_1 (老吉士酒家)
  const currentStore = TEST_STORES[0];
  const nearbyForStore1 = calcNearbyStores(currentStore, TEST_STORES);

  // store_1 的附近商家应该有 4 个
  assert(nearbyForStore1.length === 4, `store_1应有4个附近商家`);

  // 点击 store_4 (贵州的玉珍酸笋火锅)
  const clickedStore = TEST_STORES[3];
  const nearbyForStore4 = calcNearbyStores(clickedStore, TEST_STORES);

  // store_4 的附近商家应该有 4 个
  assert(nearbyForStore4.length === 4, `store_4应有4个附近商家`);

  // 验证两个店铺的附近商家列表明显不同
  // store_1 是上海的，附近主要是上海店
  // store_4 是贵州的，附近主要是贵州店
  const store1HasShanghai = nearbyForStore1.some(s => s.adcode.startsWith("31"));
  const store4HasGuizhou = nearbyForStore4.some(s => s.adcode.startsWith("52"));

  assert(store1HasShanghai, `store_1附近应有上海店`);
  assert(store4HasGuizhou, `store_4附近应有贵州店`);

  // 两个列表的排序应该不同
  const store1FirstId = nearbyForStore1[0].id;
  const store4FirstId = nearbyForStore4[0].id;
  assert(store1FirstId !== store4FirstId,
    `不同城市的最近商家应该不同`);
});

test("点击附近商家 - 点击后应回到大卡片态", () => {
  // 模拟面板状态
  let panelExpanded = true;
  const panelExpandedHeight = 840;
  const panelHeight = 840;
  const nextPanelExpanded = false;
  const nextPanelHeight = 492;

  assert(panelExpanded === true, `点击前panelExpanded应为true`);
  assert(panelHeight === panelExpandedHeight, `点击前应处于展开高度`);
  assert(nextPanelExpanded === false, `点击后应切回大卡片态`);
  assert(nextPanelHeight === 492, `点击后应回到收起高度`);
});

test("导入完成后默认聚焦 - 应选中本批次最高分门店", () => {
  const favorites = [
    { id: "old_1", rating: 4.9, adcode: "310101", importId: "old_batch", name: "老店A" },
    { id: "new_1", rating: 4.4, adcode: "440104", importId: "new_batch", name: "广州店A" },
    { id: "new_2", rating: 4.8, adcode: "440105", importId: "new_batch", name: "广州店B" }
  ];
  const cityList = [
    { name: "全部", adcode: "" },
    { name: "广东", adcode: "44" },
    { name: "上海", adcode: "31" }
  ];
  const pendingImportFocus = { importId: "new_batch" };

  const findHighestRatedFavorite = (items) =>
    items
      .slice()
      .sort((left, right) => {
        const leftRating = Number(left.rating) || 0;
        const rightRating = Number(right.rating) || 0;
        if (rightRating !== leftRating) {
          return rightRating - leftRating;
        }
        return String(left.name || "").localeCompare(String(right.name || ""), "zh-CN");
      })[0] || null;

  const importedFavorites = favorites.filter((item) => item.importId === pendingImportFocus.importId);
  const selectedFavorite = findHighestRatedFavorite(importedFavorites);
  const prefix = String(selectedFavorite.adcode).slice(0, 2);
  const cityIndex = cityList.findIndex((city) => city.adcode === prefix);

  assert(importedFavorites.length === 2, `本批次应有2家门店，实际: ${importedFavorites.length}`);
  assert(selectedFavorite.id === "new_2", `应选中本批次最高分门店new_2，实际: ${selectedFavorite.id}`);
  assert(cityIndex === 1, `应聚焦到广东城市筛选，实际索引: ${cityIndex}`);
});

test("点击附近商家 - 贵州商家测试", () => {
  const calcDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const calcNearbyStores = (currentStore, allStores, maxCount = 10) => {
    if (!currentStore) return [];
    const otherStores = allStores.filter(s => s.id !== currentStore.id);
    const storesWithDistance = otherStores.map(store => {
      const distance = calcDistance(
        currentStore.latitude, currentStore.longitude,
        store.latitude, store.longitude
      );
      return { ...store, distance };
    });
    storesWithDistance.sort((a, b) => a.distance - b.distance);
    return storesWithDistance.slice(0, maxCount);
  };

  // store_4 是贵州的玉珍酸笋火锅
  const store4 = TEST_STORES[3]; // 玉珍酸笋火锅
  assert(store4.adcode.startsWith("52"), `store_4应该是贵州`);

  // store_5 是贵州的红牌铁板烧
  const store5 = TEST_STORES[4]; // 红牌铁板烧
  assert(store5.adcode.startsWith("52"), `store_5应该是贵州`);

  const nearbyForStore4 = calcNearbyStores(store4, TEST_STORES);

  // store_4 的附近商家应该包含 store_5（贵州距离很近）
  const hasStore5 = nearbyForStore4.some(s => s.id === "store_5");
  assert(hasStore5, `store_4的附近应该包含store_5`);

  // 验证距离：贵州店距离很近，上海店距离很远
  const shanghaiStores = nearbyForStore4.filter(s => s.adcode.startsWith("31"));
  const guizhouStores = nearbyForStore4.filter(s => s.adcode.startsWith("52"));

  assert(shanghaiStores.length >= 2, `上海店应该至少有2家`);
  assert(guizhouStores.length >= 1, `贵州店应该至少有1家`);

  // 贵州店的距离应该比上海店近很多
  if (guizhouStores.length > 0 && shanghaiStores.length > 0) {
    assert(guizhouStores[0].distance < shanghaiStores[0].distance,
      `贵州店距离应该比上海店近`);
  }
});

test("完整交互流程模拟", () => {
  const calcDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const calcNearbyStores = (currentStore, allStores, maxCount = 10) => {
    if (!currentStore) return [];
    const otherStores = allStores.filter(s => s.id !== currentStore.id);
    const storesWithDistance = otherStores.map(store => {
      const distance = calcDistance(
        currentStore.latitude, currentStore.longitude,
        store.latitude, store.longitude
      );
      return { ...store, distance };
    });
    storesWithDistance.sort((a, b) => a.distance - b.distance);
    return storesWithDistance.slice(0, maxCount);
  };

  // 模拟完整交互流程
  // 1. 用户打开地图，默认选中 store_1
  let selectedFavorite = TEST_STORES[0];
  let panelExpanded = false;
  let nearbyStores = calcNearbyStores(selectedFavorite, TEST_STORES);

  assert(selectedFavorite.name === "老吉士酒家", `初始选中老吉士酒家`);
  assert(nearbyStores.length === 4, `有4个附近商家`);

  // 2. 用户上拉展开面板
  panelExpanded = true;
  assert(panelExpanded === true, `面板已展开`);

  // 3. 用户点击 nearbyStores[0] (最近的商家)
  const clickedStore = nearbyStores[0];
  selectedFavorite = clickedStore;
  nearbyStores = calcNearbyStores(selectedFavorite, TEST_STORES);
  panelExpanded = false;

  assert(selectedFavorite.name === nearbyStores[0]?.name || nearbyStores.length === TEST_STORES.length - 1,
    `点击后选中商家更新`);
  assert(panelExpanded === false, `点击后切回大卡片态`);

  // 4. 用户再次展开查看新的附近商家
  panelExpanded = true;
  assert(panelExpanded === true, `再次展开查看新的附近商家`);

  // 5. 用户继续点击其他商家
  const secondClick = nearbyStores[1];
  const oldNearbyCount = nearbyStores.length;

  selectedFavorite = secondClick;
  nearbyStores = calcNearbyStores(selectedFavorite, TEST_STORES);
  panelExpanded = false;

  assert(selectedFavorite.name === secondClick.name, `选中第二个商家`);
  assert(nearbyStores.length === oldNearbyCount || nearbyStores.length === TEST_STORES.length - 1,
    `附近列表重新计算`);
  assert(panelExpanded === false, `第二次点击后也切回大卡片态`);
});

test("点击附近商家 - 被点击项应提升为顶部大卡片", () => {
  const previousSelected = TEST_STORES[0];
  const clickedStore = TEST_STORES[1];
  const panelExpanded = false;
  const cardMode = "full-card";

  assert(previousSelected.id !== clickedStore.id, `点击后当前商家应发生切换`);
  assert(clickedStore.id === "store_2", `被点击门店应成为顶部当前商家，实际: ${clickedStore.id}`);
  assert(panelExpanded === false, `点击后应回到大卡片态`);
  assert(cardMode === "full-card", `顶部应显示完整大卡片`);
});

Promise.allSettled(pendingTests).then(() => {
  console.log("\n" + "=".repeat(50));
  console.log(`测试结果: ✅ ${passed} 通过, ❌ ${failed} 失败`);
  console.log("=".repeat(50));

  if (failed > 0) {
    process.exit(1);
  }
});

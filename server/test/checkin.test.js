/**
 * 美食地图助手 - 打卡功能 API 集成测试
 * 运行命令: node --env-file=.env test/checkin.test.js
 *
 * 测试内容：
 * 1. 打卡 CRUD API
 * 2. 打卡统计接口
 * 3. 按 POI 获取打卡记录
 * 4. 图片上传与访问
 * 5. 数据校验（rating、comment 等）
 */

const API_BASE = "http://127.0.0.1:3000";

// ========== 测试工具 ==========
let passed = 0;
let failed = 0;

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
  console.log(`\n${"=".repeat(50)}`);
  console.log(`📋 ${name}`);
  console.log("=".repeat(50));
  return fn();
};

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const request = async (url, options = {}) => {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers
    },
    ...options
  });
  const data = await response.json();
  return { status: response.status, data };
};

// ========== 全局测试数据 ==========
global.__testCheckinId = null;
global.__testPoiId = "B00123"; // 使用 mock 数据中的 POI ID

// ========== 测试用例 ==========

test("CHECKIN-1: 健康检查", async () => {
  const { status, data } = await request("/health");
  assert(status === 200, `健康检查应返回 200，实际: ${status}`);
  assert(data.ok === true, "服务应正常运行");
});

// ========== 创建打卡测试 ==========

test("CHECKIN-2: 创建打卡 - 基本字段", async () => {
  const { status, data } = await request("/api/checkins", {
    method: "POST",
    body: JSON.stringify({
      poiId: global.__testPoiId,
      shopName: "老吉士酒家",
      address: "徐汇区天平路41号",
      city: "上海",
      latitude: 31.206,
      longitude: 121.437,
      rating: 5
    })
  });

  assert(status === 200, `创建打卡应返回 200，实际: ${status}`);
  assert(data.code === 0, `code 应为 0，实际: ${data.code}`);
  assert(data.data.id, "应有打卡 ID");
  assert(data.data.poiId === global.__testPoiId, "poiId 应匹配");
  assert(data.data.shopName === "老吉士酒家", "shopName 应匹配");
  assert(data.data.rating === 5, "rating 应为 5");
  assert(data.data.ratingLabel === "夯", "ratingLabel 应为 夯");
  assert(data.data.ratingEmoji === "🤩", "ratingEmoji 应为 🤩");
  assert(data.data.ratingColor === "#FFCA28", "ratingColor 应为 #FFCA28");
  assert(data.data.city === "上海", "city 应为 上海");
  assert(data.data.createdAt, "应有 createdAt");

  global.__testCheckinId = data.data.id;
  console.log(`    📝 打卡 ID: ${global.__testCheckinId}`);
});

test("CHECKIN-3: 创建打卡 - 带分类和评论", async () => {
  const { status, data } = await request("/api/checkins", {
    method: "POST",
    body: JSON.stringify({
      poiId: "B00124",
      shopName: "阿娘面馆",
      city: "上海",
      rating: 4,
      category: "local",
      comment: "蟹粉面超好吃，汤底鲜美，下次还来！"
    })
  });

  assert(status === 200, `创建打卡应返回 200，实际: ${status}`);
  assert(data.data.category === "local", "category 应为 local");
  assert(data.data.categoryLabel === "本地菜", "categoryLabel 应为 本地菜");
  assert(data.data.comment === "蟹粉面超好吃，汤底鲜美，下次还来！", "comment 应匹配");
  assert(data.data.rating === 4, "rating 应为 4");
  assert(data.data.ratingLabel === "顶级", "ratingLabel 应为 顶级");
  assert(data.data.ratingEmoji === "😍", "ratingEmoji 应为 😍");
});

test("CHECKIN-4: 创建打卡 - 所有段位验证", async () => {
  const ratings = [
    { rating: 1, expectedLabel: "拉完了", expectedEmoji: "😫", expectedColor: "#9E9E9E" },
    { rating: 2, expectedLabel: "NPC", expectedEmoji: "😐", expectedColor: "#78909C" },
    { rating: 3, expectedLabel: "人上人", expectedEmoji: "😊", expectedColor: "#66BB6A" },
    { rating: 4, expectedLabel: "顶级", expectedEmoji: "😍", expectedColor: "#FF7043" },
    { rating: 5, expectedLabel: "夯", expectedEmoji: "🤩", expectedColor: "#FFCA28" }
  ];

  for (const r of ratings) {
    const { status, data } = await request("/api/checkins", {
      method: "POST",
      body: JSON.stringify({
        poiId: `B00${100 + r.rating}`,
        shopName: `测试店铺${r.rating}`,
        rating: r.rating
      })
    });

    assert(status === 200, `段位 ${r.rating} 创建应成功`);
    assert(data.data.ratingLabel === r.expectedLabel, `段位 ${r.rating} label 应为 ${r.expectedLabel}`);
    assert(data.data.ratingEmoji === r.expectedEmoji, `段位 ${r.rating} emoji 应为 ${r.expectedEmoji}`);
    assert(data.data.ratingColor === r.expectedColor, `段位 ${r.rating} color 应为 ${r.expectedColor}`);
  }
});

test("CHECKIN-5: 创建打卡 - 所有分类验证", async () => {
  const categories = [
    { value: "western", label: "西餐" },
    { value: "seasia", label: "东南亚菜" },
    { value: "japanese", label: "日料" },
    { value: "bbq", label: "烧烤" },
    { value: "hotpot", label: "火锅" },
    { value: "local", label: "本地菜" },
    { value: "dessert", label: "甜品蛋糕" },
    { value: "cafe", label: "奶茶咖啡" }
  ];

  for (const cat of categories) {
    const { status, data } = await request("/api/checkins", {
      method: "POST",
      body: JSON.stringify({
        poiId: `POI_${cat.value}`,
        shopName: `测试${cat.label}`,
        rating: 3,
        category: cat.value
      })
    });

    assert(status === 200, `${cat.label} 分类创建应成功`);
    assert(data.data.category === cat.value, `${cat.label} category 应为 ${cat.value}`);
    assert(data.data.categoryLabel === cat.label, `${cat.label} categoryLabel 应为 ${cat.label}`);
  }
});

test("CHECKIN-6: 创建打卡 - 评论字数限制", async () => {
  const longComment = "这".repeat(200); // 超过140字

  const { status, data } = await request("/api/checkins", {
    method: "POST",
    body: JSON.stringify({
      poiId: "B00199",
      shopName: "字数测试店铺",
      rating: 3,
      comment: longComment
    })
  });

  assert(status === 200, `创建应成功（后端截断）`);
  assert(data.data.comment.length <= 140, `评论应被截断到140字，实际: ${data.data.comment.length}`);
  console.log(`    📝 原始长度: 200，截断后: ${data.data.comment.length}`);
});

test("CHECKIN-7: 创建打卡 - 必填字段校验", async () => {
  // 缺少 rating
  const { status: s1, data: d1 } = await request("/api/checkins", {
    method: "POST",
    body: JSON.stringify({
      poiId: "B00100",
      shopName: "测试店铺"
    })
  });
  assert(s1 === 400, `缺少 rating 应返回 400，实际: ${s1}`);
  assert(d1.code === "INVALID_RATING", `错误码应为 INVALID_RATING，实际: ${d1.code}`);

  // 缺少 poiId
  const { status: s2, data: d2 } = await request("/api/checkins", {
    method: "POST",
    body: JSON.stringify({
      shopName: "测试店铺",
      rating: 5
    })
  });
  assert(s2 === 400, `缺少 poiId 应返回 400，实际: ${s2}`);
  assert(d2.code === "POI_ID_REQUIRED", `错误码应为 POI_ID_REQUIRED，实际: ${d2.code}`);

  // 缺少 shopName
  const { status: s3, data: d3 } = await request("/api/checkins", {
    method: "POST",
    body: JSON.stringify({
      poiId: "B00100",
      rating: 5
    })
  });
  assert(s3 === 400, `缺少 shopName 应返回 400，实际: ${s3}`);
  assert(d3.code === "SHOP_NAME_REQUIRED", `错误码应为 SHOP_NAME_REQUIRED，实际: ${d3.code}`);
});

test("CHECKIN-8: 创建打卡 - rating 范围校验", async () => {
  for (const invalidRating of [0, -1, 6, 10, "abc", null]) {
    const { status, data } = await request("/api/checkins", {
      method: "POST",
      body: JSON.stringify({
        poiId: "B00001",
        shopName: "无效段位测试",
        rating: invalidRating
      })
    });
    assert(status === 400, `rating=${invalidRating} 应返回 400，实际: ${status}`);
    assert(data.code === "INVALID_RATING", `错误码应为 INVALID_RATING`);
  }
});

// ========== 查询打卡测试 ==========

test("CHECKIN-9: 获取打卡列表 - 基本分页", async () => {
  const { status, data } = await request("/api/checkins?page=1&limit=10");

  assert(status === 200, `获取列表应返回 200，实际: ${status}`);
  assert(data.code === 0, `code 应为 0`);
  assert(Array.isArray(data.data.list), "list 应为数组");
  assert(data.data.pagination, "应有 pagination");
  assert(data.data.pagination.page === 1, "page 应为 1");
  assert(data.data.pagination.limit === 10, "limit 应为 10");
  assert(typeof data.data.pagination.total === "number", "total 应为数字");
  assert(typeof data.data.pagination.totalPages === "number", "totalPages 应为数字");

  console.log(`    📊 共 ${data.data.pagination.total} 条打卡记录`);
});

test("CHECKIN-10: 获取打卡列表 - 按城市筛选", async () => {
  const { status, data } = await request("/api/checkins?city=上海");

  assert(status === 200, `按城市筛选应返回 200`);
  assert(data.code === 0, `code 应为 0`);
  // 验证返回的数据都是上海
  if (data.data.list.length > 0) {
    const allShanghai = data.data.list.every(item => item.city === "上海" || item.city === null);
    assert(allShanghai, "所有结果应为上海或无城市");
  }
});

test("CHECKIN-11: 获取打卡列表 - 按分类筛选", async () => {
  const { status, data } = await request("/api/checkins?category=local");

  assert(status === 200, `按分类筛选应返回 200`);
  assert(data.code === 0, `code 应为 0`);
  if (data.data.list.length > 0) {
    const allLocal = data.data.list.every(item => item.category === "local");
    assert(allLocal, "所有结果应为本地菜分类");
  }
});

test("CHECKIN-12: 获取打卡列表 - 分页", async () => {
  const { status, data } = await request("/api/checkins?page=1&limit=2");

  assert(status === 200, `分页查询应返回 200`);
  assert(data.data.list.length <= 2, "返回数量不应超过 limit");
  assert(data.data.pagination.page === 1, "page 应为 1");
  assert(data.data.pagination.limit === 2, "limit 应为 2");
});

test("CHECKIN-13: 获取单条打卡记录", async () => {
  if (!global.__testCheckinId) {
    console.log("  ⚠️ 跳过（无测试打卡 ID）");
    return;
  }

  const { status, data } = await request(`/api/checkins/${global.__testCheckinId}`);

  assert(status === 200, `获取单条应返回 200，实际: ${status}`);
  assert(data.code === 0, `code 应为 0`);
  assert(data.data.id === global.__testCheckinId, "id 应匹配");
  assert(data.data.shopName === "老吉士酒家", "shopName 应匹配");
});

test("CHECKIN-14: 获取单条打卡记录 - 不存在", async () => {
  const { status, data } = await request("/api/checkins/nonexistent123");

  assert(status === 404, `不存在应返回 404，实际: ${status}`);
  assert(data.code === "CHECKIN_NOT_FOUND", `错误码应为 CHECKIN_NOT_FOUND`);
});

test("CHECKIN-15: 按 POI ID 获取打卡记录", async () => {
  if (!global.__testPoiId) {
    console.log("  ⚠️ 跳过（无测试 POI ID）");
    return;
  }

  const { status, data } = await request(`/api/checkins/poi/${global.__testPoiId}`);

  assert(status === 200, `按 POI 查询应返回 200`);
  assert(data.code === 0, `code 应为 0`);
  assert(Array.isArray(data.data), "data 应为数组");
  if (data.data.length > 0) {
    const allMatch = data.data.every(item => item.poiId === global.__testPoiId);
    assert(allMatch, "所有结果的 poiId 应匹配");
  }
});

// ========== 统计数据测试 ==========

test("CHECKIN-16: 获取打卡统计", async () => {
  const { status, data } = await request("/api/checkins/stats");

  assert(status === 200, `获取统计应返回 200`);
  assert(data.code === 0, `code 应为 0`);
  assert(typeof data.data.totalCount === "number", "totalCount 应为数字");
  assert(typeof data.data.monthCount === "number", "monthCount 应为数字");
  assert(Array.isArray(data.data.cities), "cities 应为数组");
  assert(Array.isArray(data.data.categories), "categories 应为数组");

  console.log(`    📊 累计打卡: ${data.data.totalCount}, 本月: ${data.data.monthCount}`);
  if (data.data.cities.length > 0) {
    console.log(`    🗺️ 打卡城市: ${data.data.cities.map(c => `${c.name}(${c.count})`).join(", ")}`);
  }
});

test("CHECKIN-17: 统计数据 - 城市分布", async () => {
  const { status, data } = await request("/api/checkins/stats");

  assert(status === 200, `获取统计应返回 200`);
  if (data.data.cities.length > 0) {
    const firstCity = data.data.cities[0];
    assert(typeof firstCity.name === "string", "城市名应为字符串");
    assert(typeof firstCity.count === "number", "城市计数应为数字");
    assert(firstCity.count > 0, "计数应大于 0");
  }
});

test("CHECKIN-18: 统计数据 - 分类分布", async () => {
  const { status, data } = await request("/api/checkins/stats");

  assert(status === 200, `获取统计应返回 200`);
  if (data.data.categories.length > 0) {
    const firstCat = data.data.categories[0];
    assert(typeof firstCat.name === "string", "分类名应为字符串");
    assert(typeof firstCat.count === "number", "分类计数应为数字");
    assert(firstCat.count > 0, "计数应大于 0");
  }
});

// ========== 更新打卡测试 ==========

test("CHECKIN-19: 更新打卡 - PATCH 部分更新", async () => {
  console.log("    🔍 开始测试...");

  // 先创建一个打卡
  const createResp = await request("/api/checkins", {
    method: "POST",
    body: JSON.stringify({
      poiId: "B00200",
      shopName: "待更新店铺",
      rating: 3,
      comment: "初始评论"
    })
  });

  console.log(`    📝 创建响应: status=${createResp.status}`);

  if (createResp.status !== 200 || !createResp.data?.data?.id) {
    console.log(`    ❌ 创建失败: status=${createResp.status}`);
    failed++;
    return;
  }

  const checkinId = createResp.data.data.id;
  console.log(`    📝 打卡 ID: ${checkinId}`);

  // PATCH 更新评论
  const { status, data } = await request(`/api/checkins/${checkinId}`, {
    method: "PATCH",
    body: JSON.stringify({
      comment: "更新后的评论，内容更丰富"
    })
  });

  console.log(`    📝 PATCH 响应 status=${status}`);

  assert(status === 200, `PATCH 更新应返回 200，实际: ${status}`);
  assert(data.code === 0, `code 应为 0`);
  assert(data.data.comment === "更新后的评论，内容更丰富", "comment 应更新");
  assert(data.data.rating === 3, "rating 应保持不变");

  console.log(`    📝 更新成功，评论: ${data.data.comment}`);
});

test("CHECKIN-20: 更新打卡 - PATCH 更新段位", async () => {
  const resp = await request("/api/checkins", {
    method: "POST",
    body: JSON.stringify({
      poiId: "B00201",
      shopName: "段位更新测试",
      rating: 2
    })
  });

  const checkinId = resp.data.data.id;

  // PATCH 更新段位
  const { status, data } = await request(`/api/checkins/${checkinId}`, {
    method: "PATCH",
    body: JSON.stringify({
      rating: 5
    })
  });

  assert(status === 200, `PATCH 更新应返回 200`);
  assert(data.data.rating === 5, "rating 应更新为 5");
  assert(data.data.ratingLabel === "夯", "ratingLabel 应更新");
  assert(data.data.updatedAt, "应有 updatedAt");

  console.log(`    ⭐ 段位更新: 2 → 5`);
});

test("CHECKIN-21: 更新打卡 - PUT 完整更新", async () => {
  const resp = await request("/api/checkins", {
    method: "POST",
    body: JSON.stringify({
      poiId: "B00202",
      shopName: "完整更新测试",
      city: "杭州",
      rating: 3,
      category: "local",
      comment: "初始"
    })
  });

  const checkinId = resp.data.data.id;

  // PUT 完整更新
  const { status, data } = await request(`/api/checkins/${checkinId}`, {
    method: "PUT",
    body: JSON.stringify({
      poiId: "B00202",
      shopName: "完整更新测试（已改名）",
      city: "苏州",
      rating: 4,
      category: "dessert",
      comment: "完整更新后的评论"
    })
  });

  assert(status === 200, `PUT 更新应返回 200`);
  assert(data.data.shopName === "完整更新测试（已改名）", "shopName 应更新");
  assert(data.data.city === "苏州", "city 应更新");
  assert(data.data.rating === 4, "rating 应更新");
  assert(data.data.category === "dessert", "category 应更新");
  assert(data.data.comment === "完整更新后的评论", "comment 应更新");
});

test("CHECKIN-22: 更新打卡 - 不存在", async () => {
  const { status, data } = await request("/api/checkins/nonexistent999", {
    method: "PATCH",
    body: JSON.stringify({
      comment: "新评论"
    })
  });

  assert(status === 404, `更新不存在应返回 404`);
  assert(data.code === "CHECKIN_NOT_FOUND", `错误码应为 CHECKIN_NOT_FOUND`);
});

// ========== 删除打卡测试 ==========

test("CHECKIN-23: 删除打卡", async () => {
  // 先创建一个待删除的打卡
  const resp = await request("/api/checkins", {
    method: "POST",
    body: JSON.stringify({
      poiId: "B00300",
      shopName: "待删除店铺",
      rating: 3
    })
  });

  const checkinId = resp.data.data.id;

  // 删除
  const { status, data } = await request(`/api/checkins/${checkinId}`, {
    method: "DELETE"
  });

  assert(status === 200, `删除应返回 200`);
  assert(data.code === 0, `code 应为 0`);
  assert(data.data.success === true, "success 应为 true");

  // 验证已删除
  const { status: getStatus } = await request(`/api/checkins/${checkinId}`);
  assert(getStatus === 404, "删除后查询应返回 404");

  console.log(`    🗑️ 删除成功`);
});

test("CHECKIN-24: 删除打卡 - 不存在", async () => {
  const { status, data } = await request("/api/checkins/nonexistent888", {
    method: "DELETE"
  });

  assert(status === 404, `删除不存在应返回 404`);
  assert(data.code === "CHECKIN_NOT_FOUND", `错误码应为 CHECKIN_NOT_FOUND`);
});

// ========== 排序测试 ==========

test("CHECKIN-25: 打卡列表 - 按时间倒序", async () => {
  const { status, data } = await request("/api/checkins?limit=5");

  assert(status === 200, `获取列表应返回 200`);
  if (data.data.list.length >= 2) {
    // 验证时间倒序
    const dates = data.data.list.map(item => new Date(item.createdAt));
    for (let i = 0; i < dates.length - 1; i++) {
      const isDescending = dates[i] >= dates[i + 1];
      assert(isDescending, `列表应按时间倒序排列`);
    }
    console.log(`    📅 最新打卡: ${data.data.list[0].createdAt}`);
  }
});

// ========== 图片上传测试 ==========

test("CHECKIN-26: 图片上传", async () => {
  // 创建一个简单的测试图片（1x1 红色 PNG）
  const pngData = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
    0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
    0x54, 0x08, 0xD7, 0x63, 0xF8, 0xCF, 0xC0, 0x00,
    0x00, 0x00, 0x03, 0x00, 0x01, 0x00, 0x18, 0xDD,
    0x8D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45,
    0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
  ]);

  const formData = new FormData();
  formData.append("file", new Blob([pngData]), "test.png");

  const response = await fetch(`${API_BASE}/api/uploads`, {
    method: "POST",
    body: formData
  });

  const data = await response.json();
  assert(response.status === 200, `上传应返回 200，实际: ${response.status}`);
  assert(data.uploadId, "应有 uploadId");
  assert(data.filename === "test.png", "filename 应为 test.png");
  assert(typeof data.size === "number", "应有 size");

  global.__testUploadId = data.uploadId;
  console.log(`    📷 上传 ID: ${global.__testUploadId}`);
});

test("CHECKIN-27: 访问上传的图片", async () => {
  if (!global.__testUploadId) {
    console.log("  ⚠️ 跳过（无上传 ID）");
    return;
  }

  const response = await fetch(`${API_BASE}/api/uploads/${global.__testUploadId}/raw`);
  assert(response.status === 200, `访问图片应返回 200，实际: ${response.status}`);
  assert(response.headers.get("content-type").includes("image"), "应为图片类型");
  console.log(`    🖼️ Content-Type: ${response.headers.get("content-type")}`);
});

test("CHECKIN-28: 创建打卡 - 带图片", async () => {
  if (!global.__testUploadId) {
    console.log("  ⚠️ 跳过（无上传 ID）");
    return;
  }

  const { status, data } = await request("/api/checkins", {
    method: "POST",
    body: JSON.stringify({
      poiId: "B00400",
      shopName: "带图片店铺",
      rating: 5,
      images: {
        uploadIds: [global.__testUploadId]
      }
    })
  });

  assert(status === 200, `创建带图片打卡应返回 200`);
  assert(Array.isArray(data.data.images), "images 应为数组");
  assert(data.data.images.length > 0, "应有图片");
  assert(data.data.images[0].includes("/api/uploads/"), "图片 URL 应正确格式");

  console.log(`    📷 图片数量: ${data.data.images.length}`);
});

// ========== CORS 测试 ==========

test("CHECKIN-29: CORS 预检", async () => {
  const response = await fetch(`${API_BASE}/api/checkins`, {
    method: "OPTIONS"
  });
  assert(response.status === 204, `OPTIONS 应返回 204，实际: ${response.status}`);
  assert(response.headers.get("access-control-allow-origin") === "*", "应有 CORS header");
});

test("CHECKIN-30: 404 处理", async () => {
  const { status } = await request("/api/nonexistent/endpoint");
  assert(status === 404, `不存在的接口应返回 404，实际: ${status}`);
});

// ========== 清理测试 ==========

test("CHECKIN-31: 清理测试数据", async () => {
  const { data: listData } = await request("/api/checkins?limit=100");

  if (listData.data.list.length > 0) {
    let deleted = 0;
    for (const item of listData.data.list) {
      // 只删除测试创建的记录（POI ID 以 B00 或 POI_ 开头）
      if (item.poiId && (item.poiId.startsWith("B00") || item.poiId.startsWith("POI_") || item.poiId === "B00123" || item.poiId === "B00124")) {
        await request(`/api/checkins/${item.id}`, { method: "DELETE" });
        deleted++;
      }
    }
    console.log(`    🧹 清理了 ${deleted} 条测试数据`);
  }

  const { data: afterData } = await request("/api/checkins?limit=1");
  assert(typeof afterData.data.pagination.total === "number", "清理后仍可正常查询");
});

// ========== 输出结果 ==========
console.log("\n" + "=".repeat(50));
console.log(`打卡功能测试结果: ✅ ${passed} 通过, ❌ ${failed} 失败`);
console.log("=".repeat(50));

if (failed > 0) {
  console.log("\n⚠️  部分测试失败，请检查上述错误信息");
  process.exit(1);
} else {
  console.log("\n🎉 所有打卡功能测试通过！");
}

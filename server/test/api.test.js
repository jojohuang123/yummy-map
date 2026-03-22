/**
 * 美食地图助手 - API 集成测试
 * 运行命令: node --env-file=.env test/api.test.js
 *
 * 注意: 需要先启动服务器 `npm run dev`
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
  console.log(`\n📋 ${name}`);
  fn();
};

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

// ========== 测试用例 ==========

test("健康检查接口", async () => {
  const { status, data } = await request("/health");
  assert(status === 200, `状态码应为 200，实际: ${status}`);
  assert(data.ok === true, "ok 应为 true");
  assert(typeof data.services === "object", "应有 services 对象");
});

test("首页返回 HTML", async () => {
  const response = await fetch(`${API_BASE}/`);
  const text = await response.text();
  assert(text.includes("Yummy Map API"), "应包含 Yummy Map API");
  assert(text.includes("健康检查"), "应包含健康检查链接");
});

test("POST /api/imports - 文本导入", async () => {
  const { status, data } = await request("/api/imports", {
    method: "POST",
    body: JSON.stringify({
      cityName: "上海",
      cityAdcode: "310000",
      text: "老吉士酒家"
    })
  });

  assert(status === 200, `状态码应为 200，实际: ${status}`);
  assert(data.importId, "应有 importId");
  assert(data.preview, "应有 preview");
  assert(data.preview.id === data.importId, "preview.id 应等于 importId");
  assert(data.preview.cityName === "上海", `城市名应为上海，实际: ${data.preview.cityName}`);
  assert(Array.isArray(data.preview.items), "items 应为数组");
  assert(data.preview.status === "enriching", `状态应为 enriching，实际: ${data.preview.status}`);

  // 保存 importId 供后续测试使用
  global.__testImportId = data.importId;
});

test("GET /api/imports/:id - 查询导入任务", async () => {
  if (!global.__testImportId) {
    console.log("  ⚠️ 跳过测试（依赖上一测试）");
    return;
  }

  const { status, data } = await request(`/api/imports/${global.__testImportId}`);
  assert(status === 200, `状态码应为 200，实际: ${status}`);
  assert(data.id === global.__testImportId, "ID 应匹配");
  assert(Array.isArray(data.items), "应有 items 数组");
});

test("POST /api/imports/:id/confirm - 确认导入", async () => {
  if (!global.__testImportId) {
    console.log("  ⚠️ 跳过测试（依赖上一测试）");
    return;
  }

  // 先更新选中项
  await request(`/api/imports/${global.__testImportId}/items`, {
    method: "PATCH",
    body: JSON.stringify({ selectedItemIds: [] })
  });

  // 等待 enrichment 完成（最多 10 秒）
  console.log("  ⏳ 等待 enrichment 完成...");
  let attempts = 0;
  let preview = null;
  while (attempts < 20) {
    const resp = await request(`/api/imports/${global.__testImportId}`);
    preview = resp.data;
    if (preview.status === "preview_ready") break;
    await new Promise(r => setTimeout(r, 500));
    attempts++;
  }

  if (preview && preview.status === "preview_ready" && preview.items.some(i => i.selected)) {
    const { status, data } = await request(`/api/imports/${global.__testImportId}/confirm`, {
      method: "POST"
    });
    assert(status === 200, `状态码应为 200，实际: ${status}`);
    assert(typeof data.importedCount === "number", "应有 importedCount");
    assert(typeof data.favoritesCount === "number", "应有 favoritesCount");
    global.__testFavoriteId = "test"; // 标记有收藏
  } else {
    console.log("  ⚠️ 跳过确认（无可选项目）");
  }
});

test("GET /api/favorites - 获取收藏列表", async () => {
  const { status, data } = await request("/api/favorites");
  assert(status === 200, `状态码应为 200，实际: ${status}`);
  assert(typeof data.total === "number", "应有 total");
  assert(Array.isArray(data.items), "items 应为数组");
});

test("GET /api/favorites/map - 获取地图数据", async () => {
  const { status, data } = await request("/api/favorites/map");
  assert(status === 200, `状态码应为 200，实际: ${status}`);
  assert(typeof data.total === "number", "应有 total");
  assert(Array.isArray(data.items), "items 应为数组");
});

test("POST /api/imports - 文本导入 (详细验证)", async () => {
  const { status, data: createData } = await request("/api/imports", {
    method: "POST",
    body: JSON.stringify({
      cityName: "上海",
      cityAdcode: "310000",
      text: "老吉士酒家"
    })
  });

  assert(status === 200, `状态码应为 200，实际: ${status}`);
  assert(createData.importId, "应有 importId");
  assert(createData.preview, "应有 preview");
  assert(createData.preview.items.length > 0, "应有识别结果");

  // 保存 importId
  global.__testImportId2 = createData.importId;
});

test("404 - 不存在的接口", async () => {
  const { status } = await request("/api/nonexistent");
  assert(status === 404, `状态码应为 404，实际: ${status}`);
});

test("OPTIONS - CORS 预检", async () => {
  const response = await fetch(`${API_BASE}/api/favorites`, {
    method: "OPTIONS"
  });
  assert(response.status === 204, `状态码应为 204，实际: ${response.status}`);
});

test("POST /api/imports - 无效输入", async () => {
  const { status, data } = await request("/api/imports", {
    method: "POST",
    body: JSON.stringify({})
  });

  assert(status === 400, `状态码应为 400，实际: ${status}`);
  assert(data.code === "IMPORT_INVALID_INPUT", `错误码应为 IMPORT_INVALID_INPUT，实际: ${data.code}`);
});

test("POST /api/imports - 无文本无图片", async () => {
  const { status, data } = await request("/api/imports", {
    method: "POST",
    body: JSON.stringify({
      cityName: "上海",
      cityAdcode: "310000",
      text: "   "  // 只有空白
    })
  });

  assert(status === 400, `状态码应为 400，实际: ${status}`);
});

// ========== 输出结果 ==========
console.log("\n" + "=".repeat(40));
console.log(`API 集成测试结果: ✅ ${passed} 通过, ❌ ${failed} 失败`);
console.log("=".repeat(40));

if (failed > 0) {
  process.exit(1);
}

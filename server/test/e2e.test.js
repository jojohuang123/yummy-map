/**
 * 美食地图助手 - E2E 流程测试
 * 测试完整的用户流程：导入 → 预览 → 收藏 → 地图
 *
 * 运行命令: node --env-file=.env test/e2e.test.js
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
  fn();
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

// ========== 测试数据 ==========
const TEST_CASES = [
  {
    name: "单店导入",
    cityName: "上海",
    cityAdcode: "310000",
    text: "老吉士酒家"
  },
  {
    name: "多店导入（换行分隔）",
    cityName: "上海",
    cityAdcode: "310000",
    text: "老吉士酒家\n阿娘面馆\n兰心餐厅"
  },
  {
    name: "多店导入（逗号分隔）",
    cityName: "上海",
    cityAdcode: "310000",
    text: "老吉士酒家，阿娘面馆，兰心餐厅"
  },
  {
    name: "带序号导入",
    cityName: "上海",
    cityAdcode: "310000",
    text: "1. 老吉士酒家\n2. 阿娘面馆\n3. 兰心餐厅"
  },
  {
    name: "带噪声词导入",
    cityName: "上海",
    cityAdcode: "310000",
    text: "老吉士酒家\n人均120\n收藏打卡\n阿娘面馆\n评分4.4\n兰心餐厅"
  }
];

// ========== E2E 测试流程 ==========

test("E2E-1: 健康检查", async () => {
  const { status, data } = await request("/health");
  assert(status === 200, "健康检查应成功");
  assert(data.ok === true, "服务应正常运行");
});

test("E2E-2: 清理测试数据", async () => {
  // 获取所有收藏并删除
  const { data: favData } = await request("/api/favorites");
  if (favData.items && favData.items.length > 0) {
    const ids = favData.items.map(item => item.id);
    await request("/api/favorites/batch-delete", {
      method: "POST",
      body: JSON.stringify({ favoriteIds: ids })
    });
  }

  const { data: afterData } = await request("/api/favorites");
  assert(afterData.total === 0, `清理后收藏应为 0，实际: ${afterData.total}`);
});

for (const tc of TEST_CASES) {
  test(`E2E-3: 文本导入流程 - ${tc.name}`, async () => {
    // 步骤 1: 创建导入
    console.log(`    📝 导入: ${tc.text.substring(0, 30)}...`);
    const { status, data: createData } = await request("/api/imports", {
      method: "POST",
      body: JSON.stringify({
        cityName: tc.cityName,
        cityAdcode: tc.cityAdcode,
        text: tc.text
      })
    });

    assert(status === 200, "创建导入应成功");
    assert(createData.importId, "应有 importId");
    const importId = createData.importId;

    // 步骤 2: 等待 enrichment 完成
    console.log("    ⏳ 等待门店信息补充...");
    let preview = null;
    for (let i = 0; i < 30; i++) {
      const { data } = await request(`/api/imports/${importId}`);
      preview = data;
      if (preview.status === "preview_ready") break;
      await sleep(500);
    }

    assert(preview.status === "preview_ready", `enrichment 应完成，实际: ${preview.status}`);
    assert(preview.items.length > 0, `应至少有一个识别结果，实际: ${preview.items.length}`);

    // 步骤 3: 更新选中项（全选）
    const matchedItems = preview.items.filter(i => i.matchStatus === "matched");
    if (matchedItems.length > 0) {
      const { status: updateStatus } = await request(`/api/imports/${importId}/items`, {
        method: "PATCH",
        body: JSON.stringify({
          selectedItemIds: matchedItems.map(i => i.id)
        })
      });
      assert(updateStatus === 200, "更新选中项应成功");

      // 步骤 4: 确认导入
      const { data: confirmData } = await request(`/api/imports/${importId}/confirm`, {
        method: "POST"
      });
      assert(confirmData.importedCount >= 0, "应有 importedCount");
      assert(confirmData.favoritesCount >= 0, "应有 favoritesCount");

      console.log(`    ✅ 成功导入 ${confirmData.importedCount} 家，当前共 ${confirmData.favoritesCount} 家`);
    } else {
      console.log("    ⚠️ 无匹配门店，跳过导入步骤");
    }
  });
}

test("E2E-4: 验证收藏完整性", async () => {
  const { data } = await request("/api/favorites");
  assert(data.items.length > 0, "应有收藏数据");

  // 验证数据结构
  const firstItem = data.items[0];
  assert(firstItem.id, "应有 id");
  assert(firstItem.poiId, "应有 poiId");
  assert(firstItem.name, "应有 name");
  assert(typeof firstItem.rating === "number" || firstItem.rating === null, "rating 应为数字或 null");
  assert(firstItem.latitude, "应有 latitude");
  assert(firstItem.longitude, "应有 longitude");
  assert(firstItem.address, "应有 address");

  console.log(`    📊 共 ${data.total} 家收藏`);
});

test("E2E-5: 地图数据验证", async () => {
  const { data } = await request("/api/favorites/map");
  assert(data.items.length > 0, "地图数据应不为空");

  // 验证所有门店都有坐标
  const allHasLocation = data.items.every(item =>
    item.latitude && item.longitude
  );
  assert(allHasLocation, "所有门店应有有效坐标");

  console.log(`    🗺️ 地图数据包含 ${data.items.length} 个点位`);
});

test("E2E-6: 删除收藏功能", async () => {
  const { data: favData } = await request("/api/favorites");
  if (favData.items.length > 0) {
    const firstId = favData.items[0].id;
    const { status } = await request(`/api/favorites/${firstId}`, {
      method: "DELETE"
    });
    assert(status === 200, "删除收藏应成功");

    // 验证已删除
    const { data: afterData } = await request("/api/favorites");
    assert(afterData.total === favData.total - 1, "收藏数应减 1");
    console.log(`    🗑️ 删除成功，剩余 ${afterData.total} 家`);
  } else {
    console.log("    ⚠️ 无收藏可删除");
  }
});

test("E2E-7: 批量删除功能", async () => {
  // 重新导入一些数据
  const { data: createData } = await request("/api/imports", {
    method: "POST",
    body: JSON.stringify({
      cityName: "上海",
      cityAdcode: "310000",
      text: "老吉士酒家\n阿娘面馆"
    })
  });

  // 等待并确认导入
  const importId = createData.importId;
  for (let i = 0; i < 30; i++) {
    const { data } = await request(`/api/imports/${importId}`);
    if (data.status === "preview_ready") {
      const matchedItems = data.items.filter(i => i.matchStatus === "matched");
      if (matchedItems.length > 0) {
        await request(`/api/imports/${importId}/items`, {
          method: "PATCH",
          body: JSON.stringify({ selectedItemIds: matchedItems.map(i => i.id) })
        });
        await request(`/api/imports/${importId}/confirm`, { method: "POST" });
      }
      break;
    }
    await sleep(500);
  }

  // 批量删除
  const { data: favData } = await request("/api/favorites");
  if (favData.items.length >= 2) {
    const idsToDelete = favData.items.slice(0, 2).map(i => i.id);
    const { data: result } = await request("/api/favorites/batch-delete", {
      method: "POST",
      body: JSON.stringify({ favoriteIds: idsToDelete })
    });
    assert(result.success === true, "批量删除应成功");
    console.log(`    🗑️ 批量删除 ${result.deletedCount} 家成功`);
  }
});

test("E2E-8: 重复导入处理", async () => {
  // 尝试重复导入同一店铺
  const { data: createData } = await request("/api/imports", {
    method: "POST",
    body: JSON.stringify({
      cityName: "上海",
      cityAdcode: "310000",
      text: "老吉士酒家"
    })
  });

  const importId = createData.importId;
  for (let i = 0; i < 30; i++) {
    const { data } = await request(`/api/imports/${importId}`);
    if (data.status === "preview_ready") {
      const matchedItems = data.items.filter(i => i.matchStatus === "matched");
      if (matchedItems.length > 0) {
        await request(`/api/imports/${importId}/items`, {
          method: "PATCH",
          body: JSON.stringify({ selectedItemIds: matchedItems.map(i => i.id) })
        });
        const { data: confirmData } = await request(`/api/imports/${importId}/confirm`, {
          method: "POST"
        });
        // 应该检测到重复
        assert(confirmData.duplicateCount >= 0, "应有 duplicateCount");
        console.log(`    🔄 检测到 ${confirmData.duplicateCount} 个重复`);
      }
      break;
    }
    await sleep(500);
  }
});

test("E2E-9: 错误处理 - 空输入", async () => {
  const { status, data } = await request("/api/imports", {
    method: "POST",
    body: JSON.stringify({
      cityName: "上海",
      cityAdcode: "310000",
      text: ""
    })
  });
  assert(status === 400, "空输入应返回 400");
  assert(data.code === "IMPORT_INVALID_INPUT", "错误码应为 IMPORT_INVALID_INPUT");
});

test("E2E-10: 错误处理 - 无法识别的文本", async () => {
  const { status, data } = await request("/api/imports", {
    method: "POST",
    body: JSON.stringify({
      cityName: "上海",
      cityAdcode: "310000",
      text: "xyzabc123无法识别的文本###"
    })
  });
  // 可能返回 400（无候选）或 200（enriching 后无匹配）
  assert(status === 200 || status === 400, `状态码应为 200 或 400，实际: ${status}`);
});

// ========== 输出结果 ==========
console.log("\n" + "=".repeat(50));
console.log(`E2E 流程测试结果: ✅ ${passed} 通过, ❌ ${failed} 失败`);
console.log("=".repeat(50));

if (failed > 0) {
  console.log("\n⚠️  部分测试失败，请检查上述错误信息");
  process.exit(1);
} else {
  console.log("\n🎉 所有 E2E 测试通过！");
}

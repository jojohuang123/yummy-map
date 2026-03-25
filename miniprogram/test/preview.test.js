/**
 * 识别预览页排序与展示规则测试
 */

const TEST_ITEMS = [
  {
    id: "filtered_1",
    poiName: ":31",
    inputName: ":31",
    matchStatus: "filtered",
    rating: null,
    topTagsLabel: ""
  },
  {
    id: "matched_1",
    poiName: "梅苑食街(嘉兴苑店)",
    inputName: "梅苑食街",
    matchStatus: "matched",
    rating: 4.4,
    topTagsLabel: ""
  },
  {
    id: "matched_2",
    poiName: "知味桑拿鸡",
    inputName: "知味桑拿鸡",
    matchStatus: "matched",
    rating: 4.8,
    topTagsLabel: "粤菜 / 鸡煲"
  }
];

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
  try {
    fn();
  } catch (error) {
    failed++;
    console.log(`  ❌ 测试执行错误: ${error.message}`);
  }
};

const decorateItems = (items) => {
  const decorated = items.map((item, index) => {
    const numRating = Number(item.rating) || 0;
    const isMatched = item.matchStatus === "matched";
    let ratingClass = "rating-low";
    let priority = 0;

    if (numRating >= 4.7) {
      ratingClass = "rating-top";
    } else if (numRating >= 4.4) {
      ratingClass = "rating-high";
    } else if (numRating >= 4.0) {
      ratingClass = "rating-mid";
    }

    if (isMatched) {
      priority = 1000 + numRating;
    } else {
      priority = index * -1;
    }

    return Object.assign({}, item, {
      isMatched,
      ratingClass,
      ratingBadgeText: item.rating ? `★ ${item.rating}` : "未评分",
      tagText: item.topTagsLabel || "",
      showTag: Boolean(item.topTagsLabel),
      priority
    });
  });

  return decorated.sort((left, right) => {
    if (left.isMatched !== right.isMatched) {
      return left.isMatched ? -1 : 1;
    }
    return (right.priority || 0) - (left.priority || 0);
  });
};

const buildGroups = (items, filterType) => {
  const matchedItems = items.filter((item) => item.isMatched);
  const filteredItems = items.filter((item) => !item.isMatched);
  const groups = [];

  if (matchedItems.length) {
    groups.push({
      id: "matched",
      items: matchedItems
    });
  }

  if (filterType === "all" && filteredItems.length) {
    groups.push({
      id: "filtered",
      items: filteredItems
    });
  }

  return groups;
};

test("预览排序 - 可导入项应排在前面", () => {
  const items = decorateItems(TEST_ITEMS);
  assert(items[0].id === "matched_2", `最高分可导入项应在最前，实际: ${items[0].id}`);
  assert(items[1].id === "matched_1", `第二个应是次高分可导入项，实际: ${items[1].id}`);
  assert(items[2].id === "filtered_1", `无效项应排到最后，实际: ${items[2].id}`);
});

test("预览分组 - 全部模式应分推荐和弱匹配", () => {
  const items = decorateItems(TEST_ITEMS);
  const groups = buildGroups(items, "all");
  assert(groups.length === 2, `全部模式应有2个分组，实际: ${groups.length}`);
  assert(groups[0].id === "matched", `第一个分组应是可导入，实际: ${groups[0].id}`);
  assert(groups[1].id === "filtered", `第二个分组应是弱匹配，实际: ${groups[1].id}`);
});

test("预览标签 - 无标签时应隐藏而不是显示占位文案", () => {
  const items = decorateItems(TEST_ITEMS);
  const noTagItem = items.find((item) => item.id === "matched_1");
  const hasTagItem = items.find((item) => item.id === "matched_2");
  assert(noTagItem.showTag === false, `无标签项应隐藏标签，实际: ${noTagItem.showTag}`);
  assert(hasTagItem.showTag === true, `有标签项应展示标签，实际: ${hasTagItem.showTag}`);
});

test("评分文案 - 应明确带星标", () => {
  const items = decorateItems(TEST_ITEMS);
  const item = items.find((entry) => entry.id === "matched_1");
  assert(item.ratingBadgeText === "★ 4.4", `评分文案应为★ 4.4，实际: ${item.ratingBadgeText}`);
  assert(item.ratingClass === "rating-high", `4.4分应进入高分档，实际: ${item.ratingClass}`);
});

console.log("\n==================================================");
console.log(`测试结果: ✅ ${passed} 通过, ❌ ${failed} 失败`);
console.log("==================================================");

process.exitCode = failed > 0 ? 1 : 0;

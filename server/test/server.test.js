/**
 * 美食地图助手 - 服务端单元测试
 * 运行命令: node --env-file=.env test/server.test.js
 */

import { normalizeCandidateNames } from "../src/services/text-normalize.js";
import { findMockPlace } from "../src/services/mock-data.js";

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

// ========== text-normalize 测试 ==========
test("文本清洗 - 基本拆分", () => {
  const result = normalizeCandidateNames("老吉士酒家\n阿娘面馆\n兰心餐厅");
  assert(result.length === 3, `应该识别出3家店，实际: ${result.length}`);
  assert(result.includes("老吉士酒家"), "应包含老吉士酒家");
  assert(result.includes("阿娘面馆"), "应包含阿娘面馆");
  assert(result.includes("兰心餐厅"), "应包含兰心餐厅");
});

test("文本清洗 - 逗号分隔", () => {
  const result = normalizeCandidateNames("老吉士酒家，阿娘面馆，兰心餐厅");
  assert(result.length === 3, `应该识别出3家店，实际: ${result.length}`);
});

test("文本清洗 - 序号去除", () => {
  const result = normalizeCandidateNames("1. 老吉士酒家\n2. 阿娘面馆\n3. 兰心餐厅");
  assert(result.length === 3, `应该识别出3家店，实际: ${result.length}`);
  result.forEach(name => {
    assert(!name.startsWith("1.") && !name.startsWith("2.") && !name.startsWith("3."),
      `序号应被去除: ${name}`);
  });
});

test("文本清洗 - 序号去除 (01格式)", () => {
  const result = normalizeCandidateNames("01老吉士酒家\n02阿娘面馆");
  assert(result.length === 2, `应该识别出2家店，实际: ${result.length}`);
});

test("文本清洗 - 噪声词过滤", () => {
  const result = normalizeCandidateNames("老吉士酒家\n人均\n评分\n收藏\n打卡");
  assert(result.length === 1, `应该只识别出1家店（过滤噪声词），实际: ${result.length}`);
  assert(result[0] === "老吉士酒家", "应保留老吉士酒家");
});

test("文本清洗 - 重复去除", () => {
  const result = normalizeCandidateNames("老吉士酒家\n老吉士酒家\n阿娘面馆");
  assert(result.length === 2, `应该去除重复，实际: ${result.length}`);
});

test("文本清洗 - 括号内容去除", () => {
  const result = normalizeCandidateNames("老吉士酒家(天平路店)\n阿娘面馆（思南路店）");
  assert(result.includes("老吉士酒家"), "应保留店名");
  assert(!result.some(n => n.includes("(")), "不应包含括号内容");
});

test("文本清洗 - 短词过滤", () => {
  const result = normalizeCandidateNames("老\n吉士\n酒家\n阿");
  assert(result.every(name => name.length >= 2), "应过滤掉单字");
});

test("文本清洗 - 分类标题过滤", () => {
  const result = normalizeCandidateNames("火锅类\n粉类\n面类\n老吉士酒家");
  assert(result.length === 1, `应过滤分类标题，实际: ${result.length}`);
  assert(result[0] === "老吉士酒家", "应保留老吉士酒家");
});

test("文本清洗 - 省市区过滤", () => {
  const result = normalizeCandidateNames("老吉士酒家\n上海市\n徐汇区\n北京市");
  assert(result.length === 1, `应过滤行政区划，实际: ${result.length}`);
});

test("文本清洗 - 复杂混合文本", () => {
  const text = `
    老吉士酒家
    阿娘面馆
    兰心餐厅
    人均
    评分
    收藏
    `;
  const result = normalizeCandidateNames(text);
  assert(result.includes("老吉士酒家"), "应包含老吉士酒家");
  assert(result.includes("阿娘面馆"), "应包含阿娘面馆");
  assert(result.includes("兰心餐厅"), "应包含兰心餐厅");
  assert(result.every(n => !["人均", "评分", "收藏"].includes(n)), "噪声词应被过滤");
});

// ========== mock-data 测试 ==========
test("Mock 数据 - 查找已知店铺", () => {
  const result = findMockPlace("老吉士酒家");
  assert(result !== null, "应找到老吉士酒家");
  assert(result.poiId === "B00123", `POI ID 应为 B00123，实际: ${result.poiId}`);
  assert(result.rating === 4.6, `评分应为 4.6，实际: ${result.rating}`);
  assert(result.cost === 168, `人均应为 168，实际: ${result.cost}`);
});

test("Mock 数据 - 未知店铺返回 null", () => {
  const result = findMockPlace("不存在的店铺XYZ");
  assert(result === null, "未知店铺应返回 null");
});

test("Mock 数据 - 位置信息完整", () => {
  const result = findMockPlace("老吉士酒家");
  assert(result.location.latitude > 0, "应有有效的纬度");
  assert(result.location.longitude > 0, "应有有效的经度");
  assert(result.address.length > 0, "应有地址");
  assert(result.businessArea.length > 0, "应有商圈");
  assert(result.topTags.length > 0, "应有标签");
});

// ========== 输出结果 ==========
console.log("\n" + "=".repeat(40));
console.log(`测试结果: ✅ ${passed} 通过, ❌ ${failed} 失败`);
console.log("=".repeat(40));

if (failed > 0) {
  process.exit(1);
}

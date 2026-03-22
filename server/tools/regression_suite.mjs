import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const currentDir = path.dirname(fileURLToPath(import.meta.url));
const pythonExecutable = path.resolve(currentDir, "../.venv/bin/python");
const baseUrl = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const postJson = async (url, body) => {
  const response = await fetch(`${baseUrl}${url}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.message || `${url} failed`);
  }
  return payload;
};

const postMultipart = async (url, { buffer, filename, contentType = "image/png" }) => {
  const formData = new FormData();
  formData.append("filename", filename);
  formData.append("file", new Blob([buffer], { type: contentType }), filename);

  const response = await fetch(`${baseUrl}${url}`, {
    method: "POST",
    body: formData
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.message || `${url} failed`);
  }
  return payload;
};

const patchJson = async (url, body) => {
  const response = await fetch(`${baseUrl}${url}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.message || `${url} failed`);
  }
  return payload;
};

const deleteJson = async (url) => {
  const response = await fetch(`${baseUrl}${url}`, {
    method: "DELETE"
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.message || `${url} failed`);
  }
  return payload;
};

const getJson = async (url) => {
  const response = await fetch(`${baseUrl}${url}`);
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.message || `${url} failed`);
  }
  return payload;
};

const waitForImportReady = async (importId, timeoutMs = 60000) => {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const preview = await getJson(`/api/imports/${importId}`);
    if (preview.status === "preview_ready") {
      return preview;
    }

    await new Promise((resolve) => setTimeout(resolve, 800));
  }

  throw new Error(`import ${importId} enrichment timeout`);
};

const buildFixtureImage = async (fileName, lines, width = 1242, height = 2208, fontSize = 54, lineGap = 110) => {
  const filePath = path.join(os.tmpdir(), fileName);
  const text = lines.join("\\n");
  const pythonScript = `
from PIL import Image, ImageDraw, ImageFont
output_path = r"""${filePath}"""
text = """${text}"""
image = Image.new("RGB", (${width}, ${height}), (16, 18, 30))
draw = ImageDraw.Draw(image)
font = ImageFont.truetype("/System/Library/Fonts/STHeiti Medium.ttc", ${fontSize})
y = 160
for line in text.split("\\n"):
    draw.text((60, y), line, fill=(245, 245, 245), font=font)
    y += ${lineGap}
image.save(output_path, format="PNG")
print(output_path)
`;

  await execFileAsync(pythonExecutable, ["-c", pythonScript]);
  return fs.readFile(filePath);
};

const run = async () => {
  const results = [];

  const health = await getJson("/health");
  assert(health.ok === true, "health check failed");
  results.push("health");

  const guiyangText = [
    "豆米火锅吃裕丰",
    "酸汤吃玉珍",
    "豆豉吃熊二娘",
    "烤肉推荐龙姐或者醉会烤",
    "肠旺面推荐：大师傅肠旺面",
    "牛肉粉推荐：玉厂路的老贵阳全牛肉粉",
    "夺夺粉：龙老太和笔记都ok",
    "辣子鸡：去环南巷炒一只打包",
    "丝娃娃：小忆丝杨姨妈都可以",
    "糯米饭：六广门或者交通街章家",
    "洋芋粑：余嬢",
    "豆腐圆子：必须席家",
    "荷塘月色豆花烤鱼",
    "省委吴记豆花面",
    "石板房今天就整杀猪饭",
    "六子烤鸡"
  ].join("，");

  const textImport = await postJson("/api/imports", {
    cityName: "贵州",
    cityAdcode: "520000",
    text: guiyangText,
    images: []
  });
  const textPreview = await waitForImportReady(textImport.importId);
  assert(textPreview.summary.total >= 10, "text import total too low");
  assert(textPreview.summary.matched >= 10, "text import matched too low");
  results.push("text_import");

  const qingyuanText = [
    "清远英德之行",
    "清远鸡真的很锻炼咬肌",
    "但是有鸡味很好吃",
    "1 梅苑食街 晴嗜鸡煲",
    "2 知味桑拿鸡",
    "3 蓝胖子烧烤餐吧",
    "4 竹味柴火竹筒饭",
    "5 T3茶园的绿茶味雪糕",
    "#记录旅途中的美食 #清远 #清远旅行 #英德 #清远美食"
  ].join("\n");
  const qingyuanImport = await postJson("/api/imports", {
    cityName: "自动识别",
    cityAdcode: "",
    text: qingyuanText,
    images: []
  });
  const qingyuanPreview = await waitForImportReady(qingyuanImport.importId);
  assert(qingyuanPreview.cityAdcode === "441800", "qingyuan text should resolve to Qingyuan city");
  assert(qingyuanPreview.summary.total >= 4, "qingyuan text importable count too low");
  results.push("qingyuan_city_detect");

  const nonFoodImport = await postJson("/api/imports", {
    cityName: "自动识别",
    cityAdcode: "",
    text: "北京市，ModuleJob.run，internalat async onImport.tracePromise.__proto__，JS舞蹈(横岗店)，对讲机执法记录仪仪工厂直营店，美博主",
    images: []
  });
  const nonFoodPreview = await waitForImportReady(nonFoodImport.importId);
  assert(nonFoodPreview.summary.total === 0, "non-food content should not remain importable");
  results.push("non_food_filtered");

  const selectedIds = [];
  const selectedPoiIds = new Set();
  for (const item of textPreview.items) {
    if (item.matchStatus !== "matched" || !item.poiId || selectedPoiIds.has(item.poiId)) {
      continue;
    }

    selectedPoiIds.add(item.poiId);
    selectedIds.push(item.id);
    if (selectedIds.length >= 5) break;
  }
  const patchedPreview = await patchJson(`/api/imports/${textImport.importId}/items`, {
    selectedItemIds: selectedIds
  });
  assert(patchedPreview.summary.selected === selectedIds.length, "selection patch failed");
  results.push("selection_patch");

  const confirmed = await postJson(`/api/imports/${textImport.importId}/confirm`, {});
  assert(confirmed.importedCount + confirmed.duplicateCount === selectedIds.length, "confirm import count mismatch");
  results.push("confirm_import");

  const favorites = await getJson("/api/favorites");
  assert(favorites.total >= selectedIds.length, "favorites list missing items");
  const removable = favorites.items[0];
  assert(removable && removable.id, "favorite removable item missing");
  results.push("favorites_list");

  const deleteResult = await deleteJson(`/api/favorites/${removable.id}`);
  assert(deleteResult.success === true, "delete favorite failed");
  const afterDelete = await getJson("/api/favorites");
  assert(afterDelete.total === favorites.total - 1, "favorite total did not decrease");
  results.push("delete_favorite");

  const ocrImageBuffer = await buildFixtureImage("yummy-regression-ocr.png", [
    "清远英德之行",
    "1 梅苑食街 晴嗜鸡煲",
    "2 知味桑拿鸡",
    "3 蓝胖子烧烤餐吧",
    "4 竹味柴火竹筒饭",
    "5 T3茶园的绿茶味雪糕"
  ]);
  const ocrImport = await postJson("/api/imports", {
    cityName: "自动识别",
    cityAdcode: "",
    text: "",
    images: [
      {
        name: "ocr-fixture.png",
        mimeType: "image/png",
        base64: ocrImageBuffer.toString("base64")
      }
    ]
  });
  const ocrPreview = await waitForImportReady(ocrImport.importId);
  assert(ocrPreview.ocrProvider && ocrPreview.ocrProvider !== "none", "ocr provider should not be none");
  assert(ocrPreview.summary.total >= 3, "ocr import total too low");
  results.push("ocr_import");

  const noteImageBuffer = await buildFixtureImage(
    "yummy-regression-note.png",
    [
      "贵阳饮食攻略",
      "参考来源",
      "纪录片 up主 美食博主 评论区",
      "一 火锅类",
      "1 酸笋火锅 玉珍",
      "2 豆米火锅 土风 唐记 云岩忠祥饮食店",
      "3 豆豉火锅 何姨妈 熊二娘",
      "4 白酸汤火锅 自然生酸汤味 省医店",
      "二 粉 面类",
      "1 肠旺面 蒋家 金牌罗记",
      "2 牛肉粉 周记黄焖 花溪王记",
      "3 兴义王氏剪粉",
      "4 小平香辣老素粉",
      "5 怪噜范"
    ],
    1242,
    2600,
    46,
    120
  );
  const noteImport = await postJson("/api/imports", {
    cityName: "贵州",
    cityAdcode: "520000",
    text: "",
    images: [
      {
        name: "ocr-note.png",
        mimeType: "image/png",
        base64: noteImageBuffer.toString("base64")
      }
    ]
  });
  const notePreview = await waitForImportReady(noteImport.importId);
  assert(notePreview.summary.total >= 5, "food note image should produce importable food shops");
  results.push("ocr_food_note");

  const uploadIds = [];
  for (let index = 0; index < 3; index += 1) {
    const upload = await postMultipart("/api/uploads", {
      buffer: ocrImageBuffer,
      filename: `ocr-upload-${index + 1}.png`
    });
    assert(upload.uploadId, "upload id missing");
    uploadIds.push(upload.uploadId);
  }

  const uploadStartAt = Date.now();
  const uploadedImport = await postJson("/api/imports", {
    cityName: "自动识别",
    cityAdcode: "",
    text: "",
    images: {
      uploadIds
    }
  });
  const uploadElapsedMs = Date.now() - uploadStartAt;
  assert(uploadedImport.status === "enriching", "upload import should return enriching");
  assert(uploadElapsedMs <= 5000, `upload import first response too slow: ${uploadElapsedMs}ms`);
  const uploadedPreview = await waitForImportReady(uploadedImport.importId);
  assert(uploadedPreview.summary.total >= 3, "upload import total too low");
  results.push("upload_import_under_5s");

  const mapData = await getJson("/api/favorites/map");
  assert(Array.isArray(mapData.items), "favorites map items missing");
  if (mapData.items.length > 0) {
    const hasAdcode = mapData.items.some((item) => !!item.adcode);
    assert(hasAdcode, "imported items should have adcode for city filtering");
  }
  results.push("favorites_map");

  console.log(
    JSON.stringify(
      {
        ok: true,
        baseUrl,
        uploadElapsedMs,
        passed: results
      },
      null,
      2
    )
  );
};

run().catch((error) => {
  console.error(
    JSON.stringify(
      {
        ok: false,
        baseUrl,
        message: error.message || String(error)
      },
      null,
      2
    )
  );
  process.exit(1);
});

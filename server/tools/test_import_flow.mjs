import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const pythonExecutable = path.resolve(process.cwd(), ".venv/bin/python");
const fixturePath = path.join(os.tmpdir(), "yummy-qingyuan-fixture.png");
const fixtureText = [
  "清远英德之行，没有一家踩雷的干饭记录！",
  "1 梅苑食街 晴嗜鸡煲",
  "2 知味桑拿鸡",
  "3 蓝胖子烧烤餐吧",
  "4 竹味柴火竹筒饭",
  "5 T3茶园的绿茶味雪糕"
].join("\\n");

const pythonScript = `
from PIL import Image, ImageDraw, ImageFont

output_path = r"""${fixturePath}"""
text = """${fixtureText}"""
width, height = 1242, 2208
image = Image.new("RGB", (width, height), (16, 18, 30))
draw = ImageDraw.Draw(image)
font_path = "/System/Library/Fonts/STHeiti Medium.ttc"
title_font = ImageFont.truetype(font_path, 72)
body_font = ImageFont.truetype(font_path, 54)
y = 180
lines = text.split("\\n")
for index, line in enumerate(lines):
    font = title_font if index == 0 else body_font
    draw.text((72, y), line, fill=(245, 245, 245), font=font)
    y += 120 if index == 0 else 100
image.save(output_path, format="PNG")
print(output_path)
`;

const createFixture = async () => {
  await execFileAsync(pythonExecutable, ["-c", pythonScript]);
  return fixturePath;
};

const loadFixtureBase64 = async (filePath) => {
  const buffer = await fs.readFile(filePath);
  return buffer.toString("base64");
};

const run = async () => {
  const imagePath = await createFixture();
  const base64 = await loadFixtureBase64(imagePath);
  const response = await fetch("http://127.0.0.1:3000/api/imports", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      cityName: "清远",
      cityAdcode: "441800",
      text: "",
      images: [
        {
          name: "qingyuan-note.png",
          mimeType: "image/png",
          base64
        }
      ]
    })
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(`导入失败: ${payload.message || response.status}`);
  }

  const preview = payload.preview || {};
  const items = Array.isArray(preview.items) ? preview.items : [];
  const matchedNames = items.filter((item) => item.matchStatus === "matched").map((item) => item.poiName);

  console.log(JSON.stringify({
    status: preview.status,
    ocrProvider: preview.ocrProvider,
    total: items.length,
    matched: matchedNames.length,
    matchedNames
  }, null, 2));
};

run().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});

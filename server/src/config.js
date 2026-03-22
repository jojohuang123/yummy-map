export const config = {
  port: Number(process.env.PORT || 3000),
  amapWebApiKey: process.env.AMAP_WEB_API_KEY || "",
  tencentSecretId: process.env.TENCENT_SECRET_ID || "",
  tencentSecretKey: process.env.TENCENT_SECRET_KEY || "",
  tencentOcrRegion: process.env.TENCENT_OCR_REGION || "ap-guangzhou",
  ocrTimeoutMs: 15000,
  amapTimeoutMs: 10000
};

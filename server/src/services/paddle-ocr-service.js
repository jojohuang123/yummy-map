import * as tencentcloud from "tencentcloud-sdk-nodejs-ocr";
import { config } from "../config.js";
import { AppError } from "../lib/errors.js";
import { withTimeout } from "../lib/async.js";

const OcrClient = tencentcloud.ocr.v20181119.Client;

const callTencentOcr = async (imageBase64) => {
  const { tencentSecretId, tencentSecretKey, tencentOcrRegion } = config;
  
  const clientConfig = {
    credential: {
      secretId: tencentSecretId,
      secretKey: tencentSecretKey,
    },
    region: tencentOcrRegion,
    profile: {
      httpProfile: {
        endpoint: "ocr.tencentcloudapi.com",
      },
    },
  };

  const client = new OcrClient(clientConfig);
  
  try {
    const result = await client.GeneralBasicOCR({
      ImageBase64: imageBase64
    });
    
    const textDetections = result.TextDetections || [];
    return textDetections.map((item) => String(item.DetectedText || "").trim()).filter(Boolean);
  } catch (error) {
    const errCode = error.code || "OCR_API_ERROR";
    const errMsg = error.message || "腾讯云 OCR 识别失败";
    throw new AppError(502, errCode, `腾讯云OCR报错: ${errMsg}`);
  }
};

// --- public API (same interface as old paddle-ocr-service) ---

export const recognizeImages = async (images) => {
  if (!images.length) {
    return { lines: [], provider: "none" };
  }

  if (!config.tencentSecretId || !config.tencentSecretKey) {
    throw new AppError(
      503,
      "OCR_NOT_CONFIGURED",
      "腾讯云 OCR 未配置，请在 .env 中设置 TENCENT_SECRET_ID 和 TENCENT_SECRET_KEY"
    );
  }

  const allLines = [];

  for (const image of images) {
    const base64 = String(image.base64 || "").replace(/^data:.+;base64,/, "");
    if (!base64) continue;

    const lines = await withTimeout(
      async () => callTencentOcr(base64),
      config.ocrTimeoutMs,
      () => new AppError(504, "OCR_TIMEOUT", "OCR 识别超时，请重试")
    );

    allLines.push(...lines);
  }

  return {
    provider: "tencent",
    lines: allLines
  };
};

export const warmupPaddleOcr = () => {};

export const isPaddleOcrReady = () => Boolean(config.tencentSecretId && config.tencentSecretKey);

export const getPaddleOcrStatus = () => ({
  provider: "tencent",
  configured: Boolean(config.tencentSecretId && config.tencentSecretKey),
  region: config.tencentOcrRegion
});

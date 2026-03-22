import fs from "fs";
import * as tencentcloud from "tencentcloud-sdk-nodejs-ocr";
import { config } from "./src/config.js";

const testObj = async () => {
  const OcrClient = tencentcloud.ocr.v20181119.Client;
  const clientConfig = {
    credential: {
      secretId: config.tencentSecretId,
      secretKey: config.tencentSecretKey,
    },
    region: config.tencentOcrRegion,
    profile: {
      httpProfile: {
        endpoint: "ocr.tencentcloudapi.com",
      },
    },
  };
  const client = new OcrClient(clientConfig);
  // Using the exact image the user uploaded (Wait, the user uploaded the image on their phone/simulator)
  // But wait, they said it's the exact same image with 5 shops as before.
  // The regression test image might not match what they uploaded.
  
  // Actually, I can just check the uploadsStore? No, it's sqlite, but upload is consumed & deleted on import!
  // BUT the imports table still holds the raw output in `data.items` if... NO. But we can just write a script to look at `data.imports`. 
  // Wait, I already saw what survives: "1梅苑食街·嗜睹鸡煲(市里面的老字号"
}
testObj();

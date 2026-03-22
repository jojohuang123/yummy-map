import { createId } from "../lib/id.js";
import { AppError } from "../lib/errors.js";
import { setUpload, getUpload, deleteUpload } from "../lib/db.js";

export const saveUpload = async ({ filename, contentType, buffer }) => {
  if (!buffer || !buffer.length) {
    throw new AppError(400, "UPLOAD_EMPTY", "上传文件为空");
  }

  const uploadId = createId("upl");
  const upload = {
    id: uploadId,
    filename: filename || "upload.jpg",
    contentType: contentType || "application/octet-stream",
    size: buffer.length,
    base64: buffer.toString("base64"),
    createdAt: new Date().toISOString()
  };

  await setUpload(uploadId, upload);
  return upload;
};

export const consumeUploads = async (uploadIds) => {
  const results = [];

  for (const uploadId of uploadIds || []) {
    const upload = await getUpload(uploadId);
    if (!upload) {
      throw new AppError(404, "UPLOAD_NOT_FOUND", "上传文件不存在或已失效");
    }

    await deleteUpload(uploadId);
    results.push({
      name: upload.filename,
      mimeType: upload.contentType,
      base64: upload.base64
    });
  }

  return results;
};

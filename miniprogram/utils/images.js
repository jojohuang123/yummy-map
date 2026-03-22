const getMimeType = (path) => {
  const lowerPath = String(path || "").toLowerCase();
  if (lowerPath.endsWith(".png")) return "image/png";
  if (lowerPath.endsWith(".webp")) return "image/webp";
  if (lowerPath.endsWith(".gif")) return "image/gif";
  return "image/jpeg";
};

const downloadTempFile = (url) =>
  new Promise((resolve, reject) => {
    wx.downloadFile({
      url,
      success: (result) => {
        if (result.statusCode >= 200 && result.statusCode < 300 && result.tempFilePath) {
          resolve(result.tempFilePath);
          return;
        }

        reject(new Error("download_failed"));
      },
      fail: () => reject(new Error("download_failed"))
    });
  });

const compressLocalImage = (src) =>
  new Promise((resolve, reject) => {
    wx.compressImage({
      src,
      quality: 60,
      success: (result) => resolve(result.tempFilePath || src),
      fail: () => reject(new Error("compress_failed"))
    });
  });

const getImageInfoPath = (src) =>
  new Promise((resolve, reject) => {
    wx.getImageInfo({
      src,
      success: (result) => {
        if (result && result.path) {
          resolve(result.path);
          return;
        }

        reject(new Error("image_info_failed"));
      },
      fail: () => reject(new Error("image_info_failed"))
    });
  });

const readFileAsBase64 = (filePath) =>
  new Promise((resolve, reject) => {
    const fs = wx.getFileSystemManager();
    fs.readFile({
      filePath,
      encoding: "base64",
      success: (result) => resolve(result.data),
      fail: () => reject(new Error("read_failed"))
    });
  });

const requestImageAsBase64 = (url) =>
  new Promise((resolve, reject) => {
    wx.request({
      url,
      method: "GET",
      responseType: "arraybuffer",
      success: (result) => {
        if (result.statusCode >= 200 && result.statusCode < 300 && result.data) {
          resolve(wx.arrayBufferToBase64(result.data));
          return;
        }

        reject(new Error("request_failed"));
      },
      fail: () => reject(new Error("request_failed"))
    });
  });

const resolveLocalImagePath = async (filePath) => {
  const normalizedPath = String(filePath || "");
  if (!normalizedPath) {
    throw new Error("未读取到有效图片路径，请重新选择图片");
  }

  const urlLike = /^https?:\/\//.test(normalizedPath);
  const readableCandidates = urlLike
    ? [() => getImageInfoPath(normalizedPath), () => downloadTempFile(normalizedPath)]
    : [() => Promise.resolve(normalizedPath)];

  for (const getPath of readableCandidates) {
    try {
      const readablePath = await getPath();
      try {
        return await compressLocalImage(readablePath);
      } catch {
        return readablePath;
      }
    } catch {}
  }

  throw new Error("图片读取失败，请重新选择截图");
};

const resolveBase64Payload = async (filePath) => {
  const normalizedPath = String(filePath || "");
  const urlLike = /^https?:\/\//.test(normalizedPath);

  try {
    const localPath = await resolveLocalImagePath(normalizedPath);
    return {
      filePath: localPath,
      base64: await readFileAsBase64(localPath)
    };
  } catch {}

  if (urlLike) {
    try {
      return {
        filePath: normalizedPath,
        base64: await requestImageAsBase64(normalizedPath)
      };
    } catch {}
  }

  throw new Error("图片读取失败，请重新选择截图");
};

const readSingleImage = (file) =>
  new Promise(async (resolve, reject) => {
    if (!file || !file.tempFilePath) {
      reject(new Error("未读取到有效图片路径，请重新选择图片"));
      return;
    }

    try {
      const payload = await resolveBase64Payload(file.tempFilePath);
      resolve({
        name: String(payload.filePath || file.tempFilePath).split("/").pop(),
        mimeType: getMimeType(payload.filePath || file.tempFilePath),
        base64: payload.base64
      });
    } catch (error) {
      reject(new Error(error.message || "图片读取失败，请重新选择截图"));
    }
  });

const prepareSingleImage = async (file) => {
  if (!file || !file.tempFilePath) {
    throw new Error("未读取到有效图片路径，请重新选择图片");
  }

  const localPath = await resolveLocalImagePath(file.tempFilePath);
  return {
    filePath: localPath,
    name: String(localPath || file.tempFilePath).split("/").pop(),
    mimeType: getMimeType(localPath || file.tempFilePath)
  };
};

const serializeImages = (files) => Promise.all((files || []).map((file) => readSingleImage(file)));
const prepareImagesForUpload = (files) => Promise.all((files || []).map((file) => prepareSingleImage(file)));

module.exports = {
  serializeImages,
  prepareImagesForUpload
};

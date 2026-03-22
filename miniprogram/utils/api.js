const buildFailMessage = (error, apiBaseUrl) => {
  const errMsg = error && error.errMsg ? error.errMsg : "";

  if (errMsg.includes("timeout")) {
    return "请求超时，请确认后端服务和 OCR 处理状态";
  }

  if (apiBaseUrl.includes("127.0.0.1") || apiBaseUrl.includes("localhost")) {
    return "请求不到本地服务。开发者工具请确认后端已启动；真机请改成电脑局域网 IP。";
  }

  return "请求失败，请确认接口地址和网络连接";
};

const request = ({ url, method = "GET", data, timeout = 15000 }) =>
  new Promise((resolve, reject) => {
    const app = getApp();
    const apiBaseUrl = app.globalData.apiBaseUrl;
    wx.request({
      url: `${apiBaseUrl}${url}`,
      method,
      data,
      timeout,
      success: (response) => {
        if (response.statusCode >= 200 && response.statusCode < 300) {
          resolve(response.data);
          return;
        }

        reject(response.data || { message: "请求失败" });
      },
      fail: (error) =>
        reject({
          message: buildFailMessage(error, apiBaseUrl),
          errMsg: error.errMsg || ""
        })
    });
  });

const api = {
  uploadImage: ({ filePath, name = "upload.jpg" }) =>
    new Promise((resolve, reject) => {
      const app = getApp();
      wx.uploadFile({
        url: `${app.globalData.apiBaseUrl}/api/uploads`,
        filePath,
        name: "file",
        timeout: 90000,
        formData: {
          filename: name
        },
        success: (response) => {
          const data = JSON.parse(response.data || "{}");
          if (response.statusCode >= 200 && response.statusCode < 300) {
            resolve(data);
            return;
          }

          reject(data || { message: "上传失败" });
        },
        fail: (error) =>
          reject({
            message: buildFailMessage(error, app.globalData.apiBaseUrl),
            errMsg: error.errMsg || ""
          })
      });
    }),
  createImport: (payload) => request({ url: "/api/imports", method: "POST", data: payload, timeout: 90000 }),
  getImport: (importId) => request({ url: `/api/imports/${importId}` }),
  updateImportItems: (importId, selectedItemIds) =>
    request({
      url: `/api/imports/${importId}/items`,
      method: "PATCH",
      data: { selectedItemIds }
    }),
  confirmImport: (importId) =>
    request({
      url: `/api/imports/${importId}/confirm`,
      method: "POST"
    }),
  getFavoritesMap: () => request({ url: "/api/favorites/map" }),
  getFavorites: () => request({ url: "/api/favorites" }),
  deleteFavorite: (favoriteId) =>
    request({
      url: `/api/favorites/${favoriteId}`,
      method: "DELETE"
    }),
  batchDeleteFavorites: (favoriteIds) =>
    request({
      url: "/api/favorites/batch-delete",
      method: "POST",
      data: { favoriteIds }
    })
};

module.exports = {
  api
};

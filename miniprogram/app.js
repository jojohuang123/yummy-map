const { appConfig } = require("./config/env");

App({
  globalData: {
    apiBaseUrl: appConfig.apiBaseUrl,
    apiMode: appConfig.apiMode,
    selectedCity: {
      name: "上海",
      adcode: "310000"
    },
    currentImportDraft: null,
    currentPreviewResult: null,
    focusFavoriteId: ""
  }
});

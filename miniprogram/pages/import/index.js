const app = getApp();
const { api } = require("../../utils/api");
const { prepareImagesForUpload } = require("../../utils/images");

Page({
  data: {
    cityOptions: [
      { name: "自动识别", adcode: "" },
      { name: "北京", adcode: "110000" },
      { name: "天津", adcode: "120000" },
      { name: "河北", adcode: "130000" },
      { name: "山西", adcode: "140000" },
      { name: "内蒙古", adcode: "150000" },
      { name: "辽宁", adcode: "210000" },
      { name: "吉林", adcode: "220000" },
      { name: "黑龙江", adcode: "230000" },
      { name: "上海", adcode: "310000" },
      { name: "江苏", adcode: "320000" },
      { name: "浙江", adcode: "330000" },
      { name: "安徽", adcode: "340000" },
      { name: "福建", adcode: "350000" },
      { name: "江西", adcode: "360000" },
      { name: "山东", adcode: "370000" },
      { name: "河南", adcode: "410000" },
      { name: "湖北", adcode: "420000" },
      { name: "湖南", adcode: "430000" },
      { name: "广东", adcode: "440000" },
      { name: "广西", adcode: "450000" },
      { name: "海南", adcode: "460000" },
      { name: "重庆", adcode: "500000" },
      { name: "四川", adcode: "510000" },
      { name: "贵州", adcode: "520000" },
      { name: "云南", adcode: "530000" },
      { name: "西藏", adcode: "540000" },
      { name: "陕西", adcode: "610000" },
      { name: "甘肃", adcode: "620000" },
      { name: "青海", adcode: "630000" },
      { name: "宁夏", adcode: "640000" },
      { name: "新疆", adcode: "650000" },
      { name: "台湾", adcode: "710000" },
      { name: "香港", adcode: "810000" },
      { name: "澳门", adcode: "820000" }
    ],
    cityIndex: 0,
    textValue: "",
    images: [],
    drawerOpen: false,
    isSubmitting: false,
    stageText: "",
    errorText: "",
    uploadProgress: "",
    apiBaseUrl: "",
    apiMode: ""
  },

  onLoad() {
    this.setData({
      apiBaseUrl: app.globalData.apiBaseUrl,
      apiMode: app.globalData.apiMode
    });
  },

  onShow() {
    const draft = app.globalData.currentImportDraft;
    if (!draft) {
      this.setData({
        drawerOpen: false,
        textValue: "",
        images: [],
        errorText: ""
      });
      return;
    }

    this.setData({
      drawerOpen: true,
      cityIndex: this.findCityIndex(draft.cityAdcode),
      textValue: draft.textValue || "",
      images: draft.images || []
    });
  },

  findCityIndex(adcode) {
    const index = this.data.cityOptions.findIndex((item) => item.adcode === adcode);
    return index >= 0 ? index : 0;
  },

  handleCityChange(event) {
    this.setData({
      cityIndex: Number(event.detail.value)
    });
  },

  handleTextInput(event) {
    this.setData({
      textValue: event.detail.value
    });
  },

  handleOpenDrawer() {
    this.setData({
      drawerOpen: true
    });
  },

  handleCloseDrawer() {
    if (this.data.isSubmitting) return;
    this.setData({
      drawerOpen: false
    });
  },

  handleDrawerTap() {},

  handleChooseImage() {
    if (this.data.images.length >= 3) {
      wx.showToast({
        title: "最多上传3张",
        icon: "none"
      });
      return;
    }

    wx.chooseImage({
      count: 3 - this.data.images.length,
      sizeType: ["compressed"],
      sourceType: ["album", "camera"],
      success: (result) => {
        const tempFilePaths = result.tempFilePaths || [];
        const tempFiles = result.tempFiles || [];
        const nextImages = tempFilePaths.map((tempFilePath, index) => ({
          tempFilePath,
          size: tempFiles[index] ? tempFiles[index].size || 0 : 0
        }));

        this.setData({
          images: this.data.images.concat(nextImages).slice(0, 3)
        });
      }
    });
  },

  handleRemoveImage(event) {
    const index = Number(event.currentTarget.dataset.index);
    const nextImages = this.data.images.filter((_, itemIndex) => itemIndex !== index);
    this.setData({
      images: nextImages
    });
  },

  handleGoMap() {
    wx.switchTab({
      url: "/pages/map/index"
    });
  },

  async handleSubmit() {
    const selectedCity = this.data.cityOptions[this.data.cityIndex];
    const textValue = this.data.textValue.trim();
    const hasImages = this.data.images.length > 0;

    if (!selectedCity) {
      this.setData({ errorText: "请先选择城市" });
      return;
    }

    if (!textValue && !hasImages) {
      this.setData({ errorText: "请先粘贴文本或上传图片" });
      return;
    }

    this.setData({
      isSubmitting: true,
      stageText: hasImages ? "图片上传中..." : "门店检索中...",
      errorText: ""
    });

    const timeoutId = setTimeout(() => {
      if (!this.data.isSubmitting) return;
      this.setData({
        stageText: "识别时间较长，仍在处理中..."
      });
    }, 8000);

    app.globalData.currentImportDraft = {
      cityName: selectedCity.name,
      cityAdcode: selectedCity.adcode,
      textValue,
      images: this.data.images
    };

    try {
      let preparedImages = [];
      if (this.data.images.length) {
        this.setData({ stageText: "读取图片中..." });
        const imageResults = await Promise.allSettled(
          this.data.images.map((img) => prepareImagesForUpload([img]).then((arr) => arr[0]))
        );
        preparedImages = imageResults
          .filter((r) => r.status === "fulfilled")
          .map((r) => r.value);
        const failCount = imageResults.filter((r) => r.status === "rejected").length;
        if (failCount > 0 && preparedImages.length === 0 && !textValue) {
          throw new Error(`${failCount}张图片全部读取失败，请重新选择图片`);
        }
        if (failCount > 0) {
          this.setData({ stageText: `${failCount}张图片读取失败，继续处理剩余内容...` });
        }
      }

      const uploadedImages = [];
      for (let i = 0; i < preparedImages.length; i++) {
        this.setData({
          stageText: `上传图片 ${i + 1}/${preparedImages.length}...`,
          uploadProgress: `${i + 1}/${preparedImages.length}`
        });
        try {
          uploadedImages.push(await api.uploadImage(preparedImages[i]));
        } catch (err) {
          console.warn(`图片 ${i + 1} 上传失败:`, err);
          if (i === preparedImages.length - 1 && uploadedImages.length === 0 && !textValue) {
            throw new Error("所有图片上传失败，请检查网络后重试");
          }
        }
      }

      this.setData({
        stageText: uploadedImages.length ? "店名提取中..." : "门店检索中...",
        uploadProgress: ""
      });

      const result = await api.createImport({
        cityName: selectedCity.name,
        cityAdcode: selectedCity.adcode,
        text: textValue,
        images: {
          uploadIds: uploadedImages.map((item) => item.uploadId)
        }
      });

      if (!result.importId) {
        throw new Error("识别失败，请重试");
      }

      app.globalData.currentPreviewResult = result.preview || null;
      app.globalData.currentImportDraft = null;

      this.setData({
        isSubmitting: false,
        stageText: "",
        uploadProgress: "",
        textValue: "",
        images: []
      });

      wx.navigateTo({
        url: `/pages/preview/index?importId=${result.importId}`
      });
    } catch (error) {
      this.setData({
        errorText: error.message || error.errMsg || "识别超时或服务不可用，请重试",
        isSubmitting: false,
        stageText: "",
        uploadProgress: ""
      });
    } finally {
      clearTimeout(timeoutId);
    }
  }
});

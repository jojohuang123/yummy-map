const app = getApp();
const { api } = require("../../utils/api");

Page({
  data: {
    importId: "",
    status: "",
    rawCandidateCount: 0,
    filteredCount: 0,
    summary: {
      total: 0,
      matched: 0,
      selected: 0
    },
    items: [],
    // 渲染用的列表，受滤镜影响
    
    isSubmitting: false,
    isEnriching: false,
    // 当前选中的分数过滤器
    filterType: "all", // all | 4.5+ | 4.0-4.4 | <4.0
    filters: [
      { id: "all", label: "全部" },
      { id: "4.5+", label: "4.5分以上" },
      { id: "4.0-4.4", label: "4.0-4.4分" },
      { id: "<4.0", label: "4分以下/暂无" }
    ]
  },

  async onLoad(options) {
    const importId = options.importId || "";
    let preview = app.globalData.currentPreviewResult || {};

    if (importId && (!preview.id || preview.id !== importId)) {
      try {
        preview = await api.getImport(importId);
        app.globalData.currentPreviewResult = preview;
      } catch (error) {
        wx.showToast({
          title: error.message || "加载失败",
          icon: "none"
        });
      }
    }

    this.applyPreview(importId, preview);
    if (preview.status === "enriching") {
      this.startPolling();
    }
  },

  onUnload() {
    this.stopPolling();
  },

  applyPreview(importId, preview) {
    const allItems = preview.items || [];
    const visibleItems = allItems.filter(
      (item) => item.matchStatus === "matched" || item.matchStatus === "filtered"
    );
    this.setData({
      importId,
      status: preview.status || "",
      rawCandidateCount: Number(preview.rawCandidateCount || 0),
      filteredCount: allItems.filter((item) => item.matchStatus === "filtered").length,
      isEnriching: preview.status === "enriching",
      summary: preview.summary || { total: 0, matched: 0, selected: 0 },
      items: this.decorateItems(visibleItems)
    });
    
  },

  decorateItems(items) {
    return items.map((item) => {
      let ratingClass = "rating-gray";
      const numRating = Number(item.rating) || 0;

      if (numRating >= 4.5) {
        ratingClass = "rating-gold";
      } else if (numRating >= 4.0 && numRating < 4.5) {
        ratingClass = "rating-green";
      }

      return Object.assign({}, item, {
        cardClass: item.matchStatus === "pending" ? "item-card-pending" : item.matchStatus !== "matched" ? "item-card-disabled" : "",
        ratingClass
      });
    });
  },

  startPolling() {
    this.stopPolling();
    this.pollTimer = setInterval(async () => {
      if (!this.data.importId) return;

      try {
        const preview = await api.getImport(this.data.importId);
        app.globalData.currentPreviewResult = preview;
        this.applyPreview(this.data.importId, preview);
        if (preview.status !== "enriching") {
          this.stopPolling();
        }
      } catch {}
    }, 1200);
  },

  stopPolling() {
    if (!this.pollTimer) return;
    clearInterval(this.pollTimer);
    this.pollTimer = null;
  },

  updateSummary(items) {
    const matched = items.filter((item) => item.matchStatus === "matched").length;
    const selected = items.filter((item) => item.selected).length;

    this.setData({
      items: this.decorateItems(items),
      filteredCount: Math.max(this.data.rawCandidateCount - matched, 0),
      summary: {
        total: items.length,
        matched,
        selected
      }
    });
    
  },

  

  

  handleToggle(event) {
    const itemId = event.currentTarget.dataset.id;
    const nextItems = this.data.items.map((item) => {
      if (item.id !== itemId || item.matchStatus !== "matched") return item;
      return Object.assign({}, item, { selected: !item.selected });
    });
    this.updateSummary(nextItems);
  },

  handleSelectAll() {
    const nextItems = this.data.items.map((item) =>
      Object.assign({}, item, { selected: item.matchStatus === "matched" })
    );
    this.updateSummary(nextItems);
  },

  handleSelectNone() {
    const nextItems = this.data.items.map((item) => Object.assign({}, item, { selected: false }));
    this.updateSummary(nextItems);
  },

  handleOnlyMatched() {
    const nextItems = this.data.items.map((item) =>
      Object.assign({}, item, { selected: item.matchStatus === "matched" })
    );
    this.updateSummary(nextItems);
  },

  async handleConfirm() {
    if (this.data.isEnriching) {
      wx.showToast({
        title: "门店信息补充中，请稍候",
        icon: "none"
      });
      return;
    }

    if (!this.data.summary.selected) {
      wx.showToast({
        title: "没有可导入的门店",
        icon: "none"
      });
      return;
    }

    if (this.data.isSubmitting) return;

    this.setData({ isSubmitting: true });
    try {
      const selectedIds = this.data.items.filter((i) => i.selected).map((i) => i.id);
      await api.updateImportItems(this.data.importId, selectedIds);
      const result = await api.confirmImport(this.data.importId);
      app.globalData.focusFavoriteId = "";
      wx.showModal({
        title: "导入成功",
        content: `成功导入 ${result.importedCount} 家门店。原收藏 ${result.duplicateCount} 家（已跳过）。当前共 ${result.favoritesCount} 家收藏。`,
        showCancel: false,
        success: () => {
          wx.switchTab({
            url: "/pages/map/index"
          });
        }
      });
    } catch (error) {
      wx.showToast({
        title: error.message || "导入失败",
        icon: "none"
      });
      this.setData({ isSubmitting: false });
    }
  }
});

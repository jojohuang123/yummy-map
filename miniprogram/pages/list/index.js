const app = getApp();
const { api } = require("../../utils/api");

// 格式化日期为易读格式
const formatDate = (isoString) => {
  if (!isoString) return "";
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return "今天";
    } else if (diffDays === 1) {
      return "昨天";
    } else if (diffDays < 7) {
      return `${diffDays}天前`;
    } else {
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${month}-${day}`;
    }
  } catch {
    return "";
  }
};

Page({
  data: {
    favorites: [],
    isEditMode: false,
    selectedIds: [],
    allSelected: false
  },

  async onShow() {
    const response = await api.getFavorites().catch(() => ({ items: [] }));
    this.setData({
      favorites: (response.items || []).map((item) => {
        let ratingClass = "rating-low";
        const numRating = Number(item.rating) || 0;
        let ratingLabel = item.rating ? `★ ${item.rating}` : "-";
        if (numRating >= 4.7) {
          ratingClass = "rating-top";
        } else if (numRating >= 4.4) {
          ratingClass = "rating-high";
        } else if (numRating >= 4.0) {
          ratingClass = "rating-mid";
        }

        return Object.assign({}, item, {
          topTagsLabel: item.topTagsLabel || (item.topTags || []).join(" / ") || "未分类",
          ratingClass,
          ratingLabel,
          costLabel: item.cost ? `¥${item.cost}` : "-",
          createdAtLabel: formatDate(item.createdAt)
        });
      }),
      isEditMode: false,
      selectedIds: [],
      allSelected: false
    });
  },

  handleToggleEdit() {
    this.setData({
      isEditMode: !this.data.isEditMode,
      selectedIds: [],
      allSelected: false
    });
  },

  handleToggleItem(event) {
    const itemId = event.currentTarget.dataset.id;
    const selectedIds = this.data.selectedIds.slice();
    const index = selectedIds.indexOf(itemId);

    if (index >= 0) {
      selectedIds.splice(index, 1);
    } else {
      selectedIds.push(itemId);
    }

    this.setData({
      selectedIds,
      allSelected: selectedIds.length === this.data.favorites.length
    });
  },

  handleSelectAll() {
    if (this.data.allSelected) {
      this.setData({
        selectedIds: [],
        allSelected: false
      });
    } else {
      this.setData({
        selectedIds: this.data.favorites.map((item) => item.id),
        allSelected: true
      });
    }
  },

  async handleBatchDelete() {
    const count = this.data.selectedIds.length;
    if (!count) {
      wx.showToast({ title: "请先勾选要删除的门店", icon: "none" });
      return;
    }

    const confirmed = await new Promise((resolve) => {
      wx.showModal({
        title: "确认删除",
        content: `确定要删除这 ${count} 家收藏门店吗？`,
        confirmColor: "#FF6B6B",
        success: (res) => resolve(res.confirm)
      });
    });

    if (!confirmed) return;

    const result = await api.batchDeleteFavorites(this.data.selectedIds).catch((error) => {
      wx.showToast({ title: error.message || "删除失败", icon: "none" });
      return null;
    });

    if (!result) return;

    wx.showToast({ title: `已删除 ${result.deletedCount} 家`, icon: "success" });
    await this.onShow();
  },

  async handleRemove(event) {
    const favoriteId = event.currentTarget.dataset.id;
    wx.showModal({
      title: "确认删除",
      content: "真的要从收藏里移除这家店吗？",
      confirmColor: "#FF6B6B",
      success: async (res) => {
        if (!res.confirm) return;
        const result = await api.deleteFavorite(favoriteId).catch((error) => {
          wx.showToast({
            title: error.message || "删除失败",
            icon: "none"
          });
          return null;
        });
        if (!result || result.success !== true) return;

        await this.onShow();

        wx.showToast({
          title: "已删除",
          icon: "success"
        });
      }
    });
  },

  handleLocate(event) {
    const favoriteId = event.currentTarget.dataset.id;
    app.globalData.focusFavoriteId = favoriteId;
    wx.switchTab({
      url: "/pages/map/index"
    });
  },

  handleNavigate(event) {
    const favoriteId = event.currentTarget.dataset.id;
    const fav = this.data.favorites.find((f) => f.id === favoriteId);
    if (!fav || !fav.latitude || !fav.longitude) {
      wx.showToast({ title: "缺少坐标信息", icon: "none" });
      return;
    }
    wx.openLocation({
      latitude: fav.latitude,
      longitude: fav.longitude,
      name: fav.name,
      address: fav.address,
      scale: 16
    });
  }
});

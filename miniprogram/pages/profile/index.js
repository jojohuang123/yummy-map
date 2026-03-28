const { api } = require("../../utils/api");

Page({
  data: {
    loading: true,
    stats: {
      monthCount: 0,
      totalCount: 0,
      cities: [],
      categories: []
    },
    checkins: [],
    filteredCheckins: [],
    pagination: {
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0
    },
    selectedCity: "",
    selectedCategory: "",
    selectedCategoryLabel: "",
    cityList: [],
    categoryList: [],
    showFilterSheet: false,
    categoryMap: {
      western: "西餐",
      seasia: "东南亚菜",
      japanese: "日料",
      bbq: "烧烤",
      hotpot: "火锅",
      local: "本地菜",
      dessert: "甜品蛋糕",
      cafe: "奶茶咖啡"
    }
  },

  _ratingMap: {
    1: { label: "拉完了", emoji: "😫", color: "#9E9E9E" },
    2: { label: "NPC", emoji: "😐", color: "#78909C" },
    3: { label: "人上人", emoji: "😊", color: "#66BB6A" },
    4: { label: "顶级", emoji: "😍", color: "#FF7043" },
    5: { label: "夯", emoji: "🤩", color: "#FFCA28" }
  },

  _categoryMap: {
    western: "西餐",
    seasia: "东南亚菜",
    japanese: "日料",
    bbq: "烧烤",
    hotpot: "火锅",
    local: "本地菜",
    dessert: "甜品蛋糕",
    cafe: "奶茶咖啡"
  },

  async onShow() {
    await this._loadData();
  },

  async _loadData() {
    this.setData({ loading: true });

    try {
      const [statsRes, checkinsRes] = await Promise.all([
        api.getCheckinsStats(),
        api.getCheckins({ page: 1, limit: 20 })
      ]);

      const stats = statsRes.data || {
        monthCount: 0,
        totalCount: 0,
        cities: [],
        categories: []
      };

      const checkins = (checkinsRes.data?.list || []).map((item) => {
        const ratingInfo = this._ratingMap[item.rating] || this._ratingMap[1];
        return {
          ...item,
          ratingColor: ratingInfo.color,
          ratingLabel: ratingInfo.label,
          ratingEmoji: ratingInfo.emoji,
          categoryLabel: this._categoryMap[item.category] || "",
          formattedDate: this._formatDate(item.createdAt)
        };
      });

      const cityList = [
        { name: "全部", value: "", cityCount: 0 },
        ...stats.cities.map((c) => ({ name: c.name, value: c.name, cityCount: c.count }))
      ];

      const cityDots = stats.cities.map((c, index) => ({
        left: 20 + (index * 25) % 60,
        top: 30 + Math.floor(index / 3) * 30
      }));

      const categoryList = [
        { name: "全部", value: "" },
        ...stats.categories.map((c) => ({
          name: this._categoryMap[c.name] || c.name,
          value: c.name
        }))
      ];

      this.setData({
        loading: false,
        stats,
        checkins,
        filteredCheckins: checkins,
        pagination: checkinsRes.data?.pagination || {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0
        },
        cityList,
        cityDots,
        categoryList
      });
    } catch (err) {
      this.setData({ loading: false });
      wx.showToast({ title: "加载失败", icon: "none" });
    }
  },

  _formatDate(dateStr) {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  },

  onCitySelect(e) {
    const city = e.currentTarget.dataset.city;
    this.setData({ selectedCity: city });
    this._applyFilters();
  },

  onCategorySelect(e) {
    const category = e.currentTarget.dataset.category;
    const categoryMap = this.data.categoryMap;
    this.setData({
      selectedCategory: category,
      selectedCategoryLabel: category ? (categoryMap[category] || category) : ""
    });
    this._applyFilters();
  },

  async _applyFilters() {
    const { selectedCity, selectedCategory } = this.data;

    this.setData({ loading: true });

    try {
      const res = await api.getCheckins({
        page: 1,
        limit: 100,
        city: selectedCity || undefined,
        category: selectedCategory || undefined
      });

      const checkins = (res.data?.list || []).map((item) => {
        const ratingInfo = this._ratingMap[item.rating] || this._ratingMap[1];
        return {
          ...item,
          ratingColor: ratingInfo.color,
          ratingLabel: ratingInfo.label,
          ratingEmoji: ratingInfo.emoji,
          categoryLabel: this._categoryMap[item.category] || "",
          formattedDate: this._formatDate(item.createdAt)
        };
      });

      this.setData({
        loading: false,
        filteredCheckins: checkins,
        pagination: res.data?.pagination || this.data.pagination
      });
    } catch (err) {
      this.setData({ loading: false });
    }
  },

  onToggleFilterSheet() {
    this.setData({ showFilterSheet: !this.data.showFilterSheet });
  },

  onCloseFilterSheet() {
    this.setData({ showFilterSheet: false });
  },

  async onCheckinTap(e) {
    const checkin = this.data.filteredCheckins[e.currentTarget.dataset.index];
    if (!checkin) return;

    wx.showModal({
      title: "确认删除",
      content: `确定要删除「${checkin.shopName}」的打卡记录吗？`,
      confirmColor: "#C97D77",
      success: async (result) => {
        if (!result.confirm) return;

        try {
          await api.deleteCheckin(checkin.id);
          wx.showToast({ title: "已删除", icon: "success" });
          await this._loadData();
        } catch (err) {
          wx.showToast({ title: "删除失败", icon: "none" });
        }
      }
    });
  },

  onGoToMap() {
    wx.switchTab({ url: "/pages/map/index" });
  },

  onRefresh() {
    this._loadData();
  }
});

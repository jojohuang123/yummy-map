const app = getApp();
const { api } = require("../../utils/api");

Page({
  data: {
    favorites: [],
    filteredFavorites: [],
    markers: [],
    includePoints: [],
    latitude: 31.2304,
    longitude: 121.4737,
    selectedFavorite: null,
    scale: 12,
    cityList: [],
    cityIndex: 0,
    searchKeyword: "",

    // 面板状态
    panelExpanded: false,
    panelHeight: 220,  // 收起状态高度 rpx（只显示当前商家卡片）
    panelExpandedHeight: 500,  // 展开状态高度 rpx（显示卡片+附近商家）
    nearbyStores: []
  },

  // 城市名前缀映射
  _cityNameMap: {
    "11": "北京", "12": "天津", "31": "上海", "32": "江苏",
    "33": "浙江", "35": "福建", "36": "江西", "37": "山东",
    "41": "河南", "42": "湖北", "43": "湖南", "44": "广东",
    "45": "广西", "46": "海南", "50": "重庆", "51": "四川",
    "52": "贵州", "53": "云南", "61": "陕西", "62": "甘肃",
    "63": "青海", "64": "宁夏", "65": "新疆"
  },

  _getCityName(adcode) {
    if (!adcode || adcode === "other") return "其他";
    const prefix = String(adcode).slice(0, 2);
    return this._cityNameMap[prefix] || prefix;
  },

  _buildCityList(favorites) {
    const cityMap = new Map();
    favorites.forEach(item => {
      if (item.adcode) {
        const code = String(item.adcode);
        const prefix = code.slice(0, 2);
        if (!cityMap.has(prefix)) {
          cityMap.set(prefix, {
            name: this._getCityName(prefix * 10000),
            adcode: prefix
          });
        }
      }
    });
    const cities = Array.from(cityMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name, 'zh-CN')
    );
    return [{ name: "全部", adcode: "" }, ...cities];
  },

  // 计算两点间的平面距离（简化版，单位米）
  _calcDistance(lat1, lng1, lat2, lng2) {
    const R = 6371000; // 地球半径米
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  },

  // 格式化距离
  _formatDistance(meters) {
    if (meters < 1000) {
      return Math.round(meters) + 'm';
    } else {
      return (meters / 1000).toFixed(1) + 'km';
    }
  },

  // 计算附近商家
  _calcNearbyStores(currentStore, allStores, maxCount = 10) {
    if (!currentStore) return [];

    const otherStores = allStores.filter(s => s.id !== currentStore.id);

    // 计算距离并排序
    const storesWithDistance = otherStores.map(store => {
      const distance = this._calcDistance(
        currentStore.latitude, currentStore.longitude,
        store.latitude, store.longitude
      );
      return { ...store, distance, distanceText: this._formatDistance(distance) };
    });

    storesWithDistance.sort((a, b) => a.distance - b.distance);

    return storesWithDistance.slice(0, maxCount);
  },

  async onShow() {
    const focusFavoriteId = app.globalData.focusFavoriteId;
    const response = await api.getFavoritesMap().catch(() => ({ items: [] }));
    const favorites = (response.items || []).map((item) => {
      const numRating = Number(item.rating) || 0;
      return Object.assign({}, item, {
        topTagsLabel: item.topTagsLabel || (item.topTags || []).join(" / ") || "未分类",
        ratingLabel: item.rating || "-",
        costLabel: item.cost ? `¥${item.cost}` : "-",
        ratingClass: numRating >= 4.5 ? 'rating-gold' : numRating >= 4 ? 'rating-green' : 'rating-gray'
      });
    });

    this.allFavorites = favorites;
    const dynamicCityList = this._buildCityList(favorites);

    let cityIndex = 0;
    let selectedFavorite = null;

    if (focusFavoriteId) {
      selectedFavorite = favorites.find((item) => item.id === focusFavoriteId) || null;
      if (selectedFavorite && selectedFavorite.adcode) {
        const code = String(selectedFavorite.adcode);
        const prefix = code.slice(0, 2);
        const foundIdx = dynamicCityList.findIndex(c => c.adcode === prefix);
        if (foundIdx > 0) cityIndex = foundIdx;
      }
    }

    this.setData({
      favorites,
      cityList: dynamicCityList,
      cityIndex,
      searchKeyword: ""
    });

    this.applyFilter(selectedFavorite || undefined);
  },

  applyFilter(selectedFavoriteOverride) {
    const { cityIndex, searchKeyword } = this.data;
    const cityList = this.data.cityList.length > 0 ? this.data.cityList : this._buildCityList(this.allFavorites);
    const cityAdcode = cityList[cityIndex]?.adcode || "";
    const keyword = (searchKeyword || "").trim().toLowerCase();

    let filtered = this.allFavorites || [];

    if (cityAdcode) {
      filtered = filtered.filter((item) => {
        const code = String(item.adcode || "");
        return code.startsWith(cityAdcode);
      });
    }

    if (keyword) {
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(keyword) ||
          (item.topTagsLabel || "").toLowerCase().includes(keyword) ||
          (item.address || "").toLowerCase().includes(keyword)
      );
    }

    let selectedFavorite =
      selectedFavoriteOverride !== undefined
        ? selectedFavoriteOverride
        : filtered.find((item) => item.id === (this.data.selectedFavorite || {}).id) ||
          filtered[0] ||
          null;

    // 计算附近商家
    const nearbyStores = this._calcNearbyStores(selectedFavorite, filtered);

    const markers = filtered.map((item, index) => {
      const isSelected = selectedFavorite && selectedFavorite.id === item.id;
      return {
        id: index, // 使用数字索引作为 marker ID，确保类型一致
        storeId: item.id, // 保留原始 store ID
        latitude: item.latitude,
        longitude: item.longitude,
        width: 24, height: 32, iconPath: "/assets/marker.png",
        callout: {
          content: item.name,
          display: "ALWAYS",
          padding: isSelected ? 8 : 4,
          borderRadius: 24,
          bgColor: isSelected ? "#07C160" : "#ffffff",
          color: isSelected ? "#ffffff" : "#333333",
          borderWidth: 1,
          borderColor: "#dddddd",
          fontSize: 14,
          textAlign: "center"
        }
      };
    });

    const includePoints = filtered.map((item) => ({
      latitude: item.latitude,
      longitude: item.longitude
    }));

    let targetLat, targetLng, targetScale;

    if (selectedFavorite) {
      targetLat = selectedFavorite.latitude;
      targetLng = selectedFavorite.longitude;
      targetScale = filtered.length > 1 ? 12 : 14;
    } else if (includePoints.length > 0) {
      targetLat = includePoints[0].latitude;
      targetLng = includePoints[0].longitude;
      targetScale = filtered.length > 1 ? 12 : 14;
    } else {
      targetLat = 31.2304;
      targetLng = 121.4737;
      targetScale = 12;
    }

    const setStateData = () => {
      this.setData({
        filteredFavorites: filtered,
        markers,
        includePoints,
        selectedFavorite,
        nearbyStores,
        latitude: targetLat,
        longitude: targetLng,
        scale: targetScale
      });
    };

    if (!selectedFavorite && includePoints.length === 0) {
      wx.getLocation({
        type: "gcj02",
        success: (res) => {
          targetLat = res.latitude;
          targetLng = res.longitude;
          setStateData();
        },
        fail: () => {
          setStateData();
        }
      });
    } else {
      setStateData();
    }
  },

  // ========== Marker 点击处理 ==========
  handleMarkerTap(e) {
    // 从事件中获取 markerId（是数字索引）
    const markerId = e.detail?.markerId ?? e.markerId;

    if (markerId === undefined || markerId === null) {
      console.log('No markerId in event:', e.detail);
      return;
    }

    // 使用索引获取对应的商家
    const index = Number(markerId);
    const item = this.data.filteredFavorites[index];

    if (item) {
      this.applyFilter(item);
    } else {
      console.log('Store not found for index:', index);
    }
  },

  // ========== 面板拖动处理 ==========
  onPanelTouchStart(e) {
    this.panelStartY = e.touches[0].clientY;
    this.panelStartHeight = this.data.panelHeight;
    this.isPanelDragging = true;
  },

  onPanelTouchMove(e) {
    if (!this.isPanelDragging) return;

    const currentY = e.touches[0].clientY;
    const deltaY = this.panelStartY - currentY; // 上拉为正，下拉为负
    const deltaHeight = deltaY * 1.5; // 转换 rpx

    let newHeight = this.panelStartHeight + deltaHeight;
    // 限制在最小和最大高度之间
    const minHeight = this.data.panelHeight; // 最小高度（收起状态）
    newHeight = Math.max(minHeight, Math.min(this.data.panelExpandedHeight, newHeight));

    this.setData({ panelHeight: newHeight });
  },

  onPanelTouchEnd(e) {
    if (!this.isPanelDragging) return;
    this.isPanelDragging = false;

    // 如果拖动后高度超过中点，则展开；否则收起
    const midPoint = 360; // (220 + 500) / 2
    const shouldExpand = this.data.panelHeight > midPoint;

    this.setData({
      panelExpanded: shouldExpand,
      panelHeight: shouldExpand ? this.data.panelExpandedHeight : this.data.panelHeight
    });
  },

  togglePanel() {
    const willExpand = !this.data.panelExpanded;
    this.setData({
      panelExpanded: willExpand,
      panelHeight: willExpand ? this.data.panelExpandedHeight : this.data.panelHeight
    });
  },

  // ========== 选择附近商家 ==========
  onSelectNearbyStore(e) {
    const storeId = e.currentTarget.dataset.id;
    // 使用原始 ID 查找商家
    const item = this.data.filteredFavorites.find((f) => f.id === storeId);
    if (item) {
      // 更新选中的商家，保持展开状态
      this.applyFilter(item);
    }
  },

  // ========== 其他事件处理 ==========
  handleCityChange(event) {
    const cityIndex = event.detail.value;
    this.setData({ cityIndex });
    this.applyFilter();
  },

  handleSearchInput(event) {
    const searchKeyword = event.detail.value;
    this.setData({ searchKeyword });
    this.applyFilter();
  },

  handleSearchClear() {
    this.setData({ searchKeyword: "" });
    this.applyFilter();
  },

  handleNavigate() {
    const { selectedFavorite } = this.data;
    if (!selectedFavorite) return;
    wx.openLocation({
      latitude: selectedFavorite.latitude,
      longitude: selectedFavorite.longitude,
      name: selectedFavorite.name,
      address: selectedFavorite.address,
      scale: 16
    });
  },

  async handleRemoveFavorite() {
    const { selectedFavorite } = this.data;
    if (!selectedFavorite) return;

    wx.showModal({
      title: "确认移除",
      content: "真的要从地图上移除这家店吗？",
      confirmColor: "#FF6B6B",
      success: async (res) => {
        if (!res.confirm) return;
        const result = await api.deleteFavorite(selectedFavorite.id).catch((error) => {
          wx.showToast({
            title: error.message || "移除失败",
            icon: "none"
          });
          return null;
        });

        if (!result || result.success !== true) return;

        wx.showToast({ title: "已移除", icon: "success" });
        await this.onShow();
      }
    });
  },

  handleGoList() {
    wx.navigateTo({
      url: "/pages/list/index"
    });
  },

  handleGoImport() {
    wx.switchTab({
      url: "/pages/import/index"
    });
  }
});

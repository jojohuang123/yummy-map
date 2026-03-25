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
    panelExpanded: false,
    panelCollapsedHeight: 440,
    panelHeight: 440,
    panelExpandedHeight: 780,
    nearbyStores: []
  },

  _markerConfig: {
    top: {
      iconPath: "/assets/marker-score-top.png",
      activeIconPath: "/assets/marker-score-top-active.png"
    },
    high: {
      iconPath: "/assets/marker-score-high.png",
      activeIconPath: "/assets/marker-score-high-active.png"
    },
    mid: {
      iconPath: "/assets/marker-score-mid.png",
      activeIconPath: "/assets/marker-score-mid-active.png"
    },
    low: {
      iconPath: "/assets/marker-score-low.png",
      activeIconPath: "/assets/marker-score-low-active.png"
    }
  },

  _cityNameMap: {
    "11": "北京",
    "12": "天津",
    "31": "上海",
    "32": "江苏",
    "33": "浙江",
    "35": "福建",
    "36": "江西",
    "37": "山东",
    "41": "河南",
    "42": "湖北",
    "43": "湖南",
    "44": "广东",
    "45": "广西",
    "46": "海南",
    "50": "重庆",
    "51": "四川",
    "52": "贵州",
    "53": "云南",
    "61": "陕西",
    "62": "甘肃",
    "63": "青海",
    "64": "宁夏",
    "65": "新疆"
  },

  _getMarkerType(favorite) {
    const rating = Number(favorite.rating) || 0;
    if (rating >= 4.7) return "top";
    if (rating >= 4.4) return "high";
    if (rating >= 4.0) return "mid";
    return "low";
  },

  _getCityName(adcode) {
    if (!adcode || adcode === "other") return "其他";
    const prefix = String(adcode).slice(0, 2);
    return this._cityNameMap[prefix] || prefix;
  },

  _buildCityList(favorites) {
    const cityMap = new Map();
    favorites.forEach((item) => {
      if (!item.adcode) return;
      const prefix = String(item.adcode).slice(0, 2);
      if (cityMap.has(prefix)) return;
      cityMap.set(prefix, {
        name: this._getCityName(prefix),
        adcode: prefix
      });
    });

    const cities = Array.from(cityMap.values()).sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
    return [{ name: "全部", adcode: "" }, ...cities];
  },

  _calcDistance(lat1, lng1, lat2, lng2) {
    const earthRadius = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadius * c;
  },

  _formatDistance(meters) {
    if (meters < 1000) return `${Math.round(meters)}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  },

  _calcNearbyStores(currentStore, allStores, maxCount = 10) {
    if (!currentStore) return [];

    return allStores
      .filter((store) => store.id !== currentStore.id)
      .map((store) => {
        const distance = this._calcDistance(
          currentStore.latitude,
          currentStore.longitude,
          store.latitude,
          store.longitude
        );

        return Object.assign({}, store, {
          distance,
          distanceText: this._formatDistance(distance)
        });
      })
      .sort((left, right) => left.distance - right.distance)
      .slice(0, maxCount);
  },

  _buildMarkers(items, selectedFavorite) {
    return items.map((item, index) => {
      const isSelected = selectedFavorite && selectedFavorite.id === item.id;
      const markerConfig = this._markerConfig[item.markerType] || this._markerConfig.low;

      return {
        id: index,
        storeId: item.id,
        latitude: item.latitude,
        longitude: item.longitude,
        iconPath: isSelected ? markerConfig.activeIconPath : markerConfig.iconPath,
        width: isSelected ? 40 : 32,
        height: isSelected ? 54 : 44,
        anchor: {
          x: 0.5,
          y: 1
        },
        callout: {
          content: item.rating ? `${item.rating} · ${item.name}` : item.name,
          display: isSelected ? "ALWAYS" : "BYCLICKING",
          padding: isSelected ? 11 : 8,
          borderRadius: 18,
          bgColor: isSelected ? "#FFF8F0" : "#FFFDF9",
          color: "#342A24",
          borderWidth: 1,
          borderColor: isSelected ? "#E58A6B" : "#D8C8B8",
          fontSize: 13,
          textAlign: "center"
        }
      };
    });
  },

  _findHighestRatedFavorite(items) {
    if (!Array.isArray(items) || !items.length) return null;

    return items
      .slice()
      .sort((left, right) => {
        const leftRating = Number(left.rating) || 0;
        const rightRating = Number(right.rating) || 0;
        if (rightRating !== leftRating) {
          return rightRating - leftRating;
        }
        return String(left.name || "").localeCompare(String(right.name || ""), "zh-CN");
      })[0];
  },

  _resolveInitialFocus(favorites, cityList, focusFavoriteId, pendingImportFocus) {
    let cityIndex = 0;
    let selectedFavorite = null;
    let shouldExpand = false;

    if (focusFavoriteId) {
      selectedFavorite = favorites.find((item) => item.id === focusFavoriteId) || null;
    } else if (pendingImportFocus && pendingImportFocus.importId) {
      const importedFavorites = favorites.filter((item) => item.importId === pendingImportFocus.importId);
      selectedFavorite = this._findHighestRatedFavorite(importedFavorites);
      shouldExpand = Boolean(selectedFavorite);
    }

    if (selectedFavorite && selectedFavorite.adcode) {
      const prefix = String(selectedFavorite.adcode).slice(0, 2);
      const foundIndex = cityList.findIndex((city) => city.adcode === prefix);
      if (foundIndex > 0) {
        cityIndex = foundIndex;
      }
    }

    return {
      cityIndex,
      selectedFavorite,
      shouldExpand
    };
  },

  async onShow() {
    const focusFavoriteId = app.globalData.focusFavoriteId;
    const pendingImportFocus = app.globalData.pendingImportFocus;
    const response = await api.getFavoritesMap().catch(() => ({ items: [] }));
    const favorites = (response.items || []).map((item) => {
      const numRating = Number(item.rating) || 0;
      let ratingClass = "rating-low";
      let markerType = "low";

      if (numRating >= 4.7) {
        ratingClass = "rating-top";
        markerType = "top";
      } else if (numRating >= 4.4) {
        ratingClass = "rating-high";
        markerType = "high";
      } else if (numRating >= 4.0) {
        ratingClass = "rating-mid";
        markerType = "mid";
      }

      return Object.assign({}, item, {
        topTagsLabel: item.topTagsLabel || (item.topTags || []).join(" / ") || "未分类",
        ratingLabel: item.rating || "-",
        ratingBadgeText: item.rating ? `★ ${item.rating}` : "-",
        costLabel: item.cost ? `¥${item.cost}` : "-",
        ratingClass,
        markerType
      });
    });

    this.allFavorites = favorites;
    const cityList = this._buildCityList(favorites);
    const { cityIndex, selectedFavorite, shouldExpand } = this._resolveInitialFocus(
      favorites,
      cityList,
      focusFavoriteId,
      pendingImportFocus
    );

    app.globalData.pendingImportFocus = null;

    this.setData({
      favorites,
      cityList,
      cityIndex,
      searchKeyword: "",
      panelExpanded: shouldExpand,
      panelHeight: shouldExpand ? this.data.panelExpandedHeight : this.data.panelCollapsedHeight
    });

    this.applyFilter(selectedFavorite || undefined);
  },

  applyFilter(selectedFavoriteOverride) {
    const cityAdcode = (this.data.cityList[this.data.cityIndex] || {}).adcode || "";
    const keyword = String(this.data.searchKeyword || "").trim().toLowerCase();

    let filteredFavorites = this.allFavorites || [];

    if (cityAdcode) {
      filteredFavorites = filteredFavorites.filter((item) => String(item.adcode || "").startsWith(cityAdcode));
    }

    if (keyword) {
      filteredFavorites = filteredFavorites.filter(
        (item) =>
          String(item.name || "").toLowerCase().includes(keyword) ||
          String(item.topTagsLabel || "").toLowerCase().includes(keyword) ||
          String(item.address || "").toLowerCase().includes(keyword)
      );
    }

    const selectedFavorite =
      selectedFavoriteOverride !== undefined
        ? selectedFavoriteOverride
        : filteredFavorites.find((item) => item.id === (this.data.selectedFavorite || {}).id) ||
          filteredFavorites[0] ||
          null;

    const nearbyStores = this._calcNearbyStores(selectedFavorite, filteredFavorites).map((item) =>
      Object.assign({}, item, {
        ratingBadgeText: item.rating ? `★ ${item.rating}` : "未评分"
      })
    );
    const decoratedSelectedFavorite = selectedFavorite
      ? Object.assign({}, selectedFavorite, {
          nearestDistanceText: nearbyStores[0] ? nearbyStores[0].distanceText : ""
        })
      : null;
    const markers = this._buildMarkers(filteredFavorites, selectedFavorite);
    const includePoints = filteredFavorites.map((item) => ({
      latitude: item.latitude,
      longitude: item.longitude
    }));

    let latitude = 31.2304;
    let longitude = 121.4737;
    let scale = 12;

    if (selectedFavorite) {
      latitude = selectedFavorite.latitude;
      longitude = selectedFavorite.longitude;
      scale = filteredFavorites.length > 1 ? 12 : 14;
    } else if (includePoints.length > 0) {
      latitude = includePoints[0].latitude;
      longitude = includePoints[0].longitude;
      scale = filteredFavorites.length > 1 ? 12 : 14;
    }

    const nextState = {
      filteredFavorites,
      markers,
      includePoints,
      selectedFavorite: decoratedSelectedFavorite,
      nearbyStores,
      latitude,
      longitude,
      scale
    };

    if (!selectedFavorite && includePoints.length === 0) {
      wx.getLocation({
        type: "gcj02",
        success: (result) => {
          this.setData(
            Object.assign({}, nextState, {
              latitude: result.latitude,
              longitude: result.longitude
            })
          );
        },
        fail: () => {
          this.setData(nextState);
        }
      });
      return;
    }

    this.setData(nextState);
  },

  handleMarkerTap(event) {
    const markerId = event.detail?.markerId ?? event.markerId;
    if (markerId === undefined || markerId === null) return;

    const targetFavorite = this.data.filteredFavorites[Number(markerId)];
    if (!targetFavorite) return;

    this.applyFilter(targetFavorite);
  },

  onPanelTouchStart(event) {
    this.panelStartY = event.touches[0].clientY;
    this.panelStartHeight = this.data.panelHeight;
    this.isPanelDragging = true;
  },

  onPanelTouchMove(event) {
    if (!this.isPanelDragging) return;

    const deltaY = this.panelStartY - event.touches[0].clientY;
    const nextHeight = Math.max(
      this.data.panelCollapsedHeight,
      Math.min(this.data.panelExpandedHeight, this.panelStartHeight + deltaY * 1.5)
    );

    this.setData({
      panelHeight: nextHeight
    });
  },

  onPanelTouchEnd() {
    if (!this.isPanelDragging) return;
    this.isPanelDragging = false;

    const midpoint = (this.data.panelCollapsedHeight + this.data.panelExpandedHeight) / 2;
    const shouldExpand = this.data.panelHeight > midpoint;

    this.setData({
      panelExpanded: shouldExpand,
      panelHeight: shouldExpand ? this.data.panelExpandedHeight : this.data.panelCollapsedHeight
    });
  },

  togglePanel() {
    const panelExpanded = !this.data.panelExpanded;
    this.setData({
      panelExpanded,
      panelHeight: panelExpanded ? this.data.panelExpandedHeight : this.data.panelCollapsedHeight
    });
  },

  onSelectNearbyStore(event) {
    const targetFavorite = this.data.filteredFavorites.find((item) => item.id === event.currentTarget.dataset.id);
    if (!targetFavorite) return;

    this.applyFilter(targetFavorite);
    this.setData({
      panelExpanded: false,
      panelHeight: this.data.panelCollapsedHeight
    });
  },

  handleCityChange(event) {
    this.setData({
      cityIndex: Number(event.detail.value)
    });
    this.applyFilter();
  },

  handleSearchInput(event) {
    this.setData({
      searchKeyword: event.detail.value
    });
    this.applyFilter();
  },

  handleSearchClear() {
    this.setData({
      searchKeyword: ""
    });
    this.applyFilter();
  },

  handleNavigate() {
    const selectedFavorite = this.data.selectedFavorite;
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
    const selectedFavorite = this.data.selectedFavorite;
    if (!selectedFavorite) return;

    wx.showModal({
      title: "确认移除",
      content: "确定要把这家店从收藏里移除吗？",
      confirmColor: "#C97D77",
      success: async (result) => {
        if (!result.confirm) return;

        const response = await api.deleteFavorite(selectedFavorite.id).catch((error) => {
          wx.showToast({
            title: error.message || "移除失败",
            icon: "none"
          });
          return null;
        });

        if (!response || response.success !== true) return;

        wx.showToast({
          title: "已移除",
          icon: "success"
        });
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

const { api } = require("../../utils/api");

Component({
  properties: {
    visible: {
      type: Boolean,
      value: false,
      observer(newVal) {
        this.setData({ showDrawer: newVal });
        if (newVal) {
          this._initForm();
        }
      }
    },
    target: {
      type: Object,
      value: null
    }
  },

  data: {
    showDrawer: false,
    rating: null,
    category: "",
    comment: "",
    images: [],
    uploadingImages: false,
    submitting: false,
    commentRemaining: 140,
    submitButtonText: "提交打卡"
  },

  methods: {
    _initForm() {
      const { target } = this.data;
      const hasExistingCheckin = target && target.existingCheckin;
      if (hasExistingCheckin) {
        this.setData({
          rating: target.existingCheckin.rating,
          category: target.existingCheckin.category || "",
          comment: target.existingCheckin.comment || "",
          images: target.existingCheckin.images || [],
          commentRemaining: 140 - (target.existingCheckin.comment ? target.existingCheckin.comment.length : 0),
          submitButtonText: "更新打卡"
        });
      } else {
        this.setData({
          rating: null,
          category: "",
          comment: "",
          images: [],
          commentRemaining: 140,
          submitButtonText: "提交打卡"
        });
      }
    },

    onCommentInput(e) {
      const value = e.detail.value || "";
      const remaining = 140 - value.length;
      this.setData({
        comment: value.slice(0, 140),
        commentRemaining: remaining
      });
    },

    onRatingSelect(e) {
      const rating = Number(e.currentTarget.dataset.rating);
      this.setData({ rating });
    },

    onCategorySelect(e) {
      const category = e.currentTarget.dataset.category;
      const currentCategory = this.data.category;
      this.setData({
        category: currentCategory === category ? "" : category
      });
    },

    async onChooseImage() {
      const { images } = this.data;
      if (images.length >= 3) {
        wx.showToast({ title: "最多上传3张图片", icon: "none" });
        return;
      }

      wx.chooseImage({
        count: 3 - images.length,
        sizeType: ["compressed"],
        sourceType: ["album", "camera"],
        success: async (res) => {
          const tempFilePaths = res.tempFilePaths;
          this.setData({ uploadingImages: true });

          try {
            for (const filePath of tempFilePaths) {
              const result = await api.uploadImage({ filePath });
              if (result.uploadId) {
                this.setData({
                  images: [...this.data.images, `/api/uploads/${result.uploadId}/raw`]
                });
              }
            }
          } catch (err) {
            wx.showToast({ title: "图片上传失败", icon: "none" });
          } finally {
            this.setData({ uploadingImages: false });
          }
        }
      });
    },

    onRemoveImage(e) {
      const index = Number(e.currentTarget.dataset.index);
      const images = [...this.data.images];
      images.splice(index, 1);
      this.setData({ images });
    },

    onMaskTap() {
      this.onClose();
    },

    onDragStart(e) {
      this.dragStartY = e.touches[0].clientY;
    },

    onDragMove(e) {
      if (!this.dragStartY) return;
      const deltaY = e.touches[0].clientY - this.dragStartY;
      if (deltaY > 100) {
        this.onClose();
      }
    },

    onDragEnd() {
      this.dragStartY = null;
    },

    onClose() {
      this.triggerEvent("close");
    },

    async onSubmit() {
      const { rating, target } = this.data;
      if (!rating) {
        wx.showToast({ title: "请选择段位", icon: "none" });
        return;
      }

      if (!target?.favorite) {
        wx.showToast({ title: "数据异常", icon: "none" });
        return;
      }

      this.setData({ submitting: true });

      const favorite = target.favorite;
      const payload = {
        poiId: favorite.poiId,
        favoriteId: favorite.id || null,
        shopName: favorite.name,
        address: favorite.address || "",
        city: this._extractCity(favorite),
        latitude: favorite.latitude,
        longitude: favorite.longitude,
        rating,
        category: this.data.category || null,
        comment: this.data.comment || null,
        images: this.data.images
      };

      try {
        if (target.existingCheckin) {
          await api.updateCheckin(target.existingCheckin.id, payload);
          wx.showToast({ title: "打卡已更新 ✓", icon: "success" });
        } else {
          await api.createCheckin(payload);
          wx.showToast({ title: "打卡成功 ✓", icon: "success" });
        }
        this.triggerEvent("success");
      } catch (err) {
        wx.showToast({
          title: err.message || "打卡失败，请重试",
          icon: "none"
        });
      } finally {
        this.setData({ submitting: false });
      }
    },

    _extractCity(favorite) {
      // 只有当 businessArea 是非空字符串时才使用
      if (typeof favorite.businessArea === 'string' && favorite.businessArea) {
        return favorite.businessArea;
      }
      // 用 adcode 前4位映射城市
      if (favorite.adcode) {
        const prefix = String(favorite.adcode).slice(0, 4);
        const cityMap = {
          "4418": "清远", "4413": "广州", "4419": "东莞", "4420": "中山",
          "3100": "上海", "3302": "宁波", "3301": "杭州", "3305": "温州",
          "3205": "苏州", "3201": "南京", "3202": "无锡", "3203": "常州",
          "4401": "深圳", "4403": "深圳", "4406": "珠海", "4407": "佛山",
          "1100": "北京", "1200": "天津", "5000": "重庆", "5101": "成都"
        };
        return cityMap[prefix] || "";
      }
      return "";
    }
  }
});

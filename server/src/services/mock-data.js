const mockPlaces = {
  老吉士酒家: {
    poiId: "B00123",
    poiName: "老吉士酒家(天平路店)",
    rating: 4.6,
    cost: 168,
    address: "天平路41号",
    businessArea: "徐家汇",
    adcode: "310104",
    topTags: ["红烧肉", "葱烤大排", "蟹粉豆腐"],
    location: { latitude: 31.206, longitude: 121.437 }
  },
  阿娘面馆: {
    poiId: "B00987",
    poiName: "阿娘面馆",
    rating: 4.4,
    cost: 52,
    address: "思南路36号",
    businessArea: "淮海中路",
    adcode: "310101",
    topTags: ["黄鱼面", "蟹粉面", "雪菜黄鱼"],
    location: { latitude: 31.213, longitude: 121.467 }
  },
  兰心餐厅: {
    poiId: "B00666",
    poiName: "兰心餐厅",
    rating: 4.5,
    cost: 120,
    address: "进贤路130号",
    businessArea: "淮海中路",
    adcode: "310101",
    topTags: ["葱油鸡", "咸肉菜饭", "蚝油牛肉"],
    location: { latitude: 31.221, longitude: 121.459 }
  }
};

export const findMockPlace = (keyword) => mockPlaces[keyword] || null;

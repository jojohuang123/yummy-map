const regionCatalog = [
  { name: "清远", adcode: "441800", aliases: ["清远", "英德", "清城区", "清新", "连州", "佛冈"] },
  { name: "贵阳", adcode: "520100", aliases: ["贵阳", "云岩", "南明", "花溪", "乌当", "观山湖"] },
  { name: "广州", adcode: "440100", aliases: ["广州", "天河", "越秀", "海珠", "白云", "番禺"] },
  { name: "深圳", adcode: "440300", aliases: ["深圳", "南山", "福田", "罗湖", "龙岗"] },
  { name: "上海", adcode: "310100", aliases: ["上海", "浦东", "静安", "徐汇", "长宁"] },
  { name: "北京", adcode: "110100", aliases: ["北京", "东城", "西城", "朝阳", "海淀"] },
  { name: "杭州", adcode: "330100", aliases: ["杭州", "西湖", "上城", "拱墅"] },
  { name: "成都", adcode: "510100", aliases: ["成都", "锦江", "青羊", "武侯"] },
  { name: "武汉", adcode: "420100", aliases: ["武汉", "江岸", "武昌", "洪山"] },
  { name: "长沙", adcode: "430100", aliases: ["长沙", "芙蓉", "天心", "岳麓"] },
  { name: "南京", adcode: "320100", aliases: ["南京", "玄武", "鼓楼", "秦淮"] },
  { name: "苏州", adcode: "320500", aliases: ["苏州", "姑苏", "工业园区"] },
  { name: "厦门", adcode: "350200", aliases: ["厦门", "思明", "湖里"] },
  { name: "福州", adcode: "350100", aliases: ["福州", "鼓楼", "台江"] },
  { name: "青岛", adcode: "370200", aliases: ["青岛", "市南", "崂山"] },
  { name: "济南", adcode: "370100", aliases: ["济南", "历下", "市中"] },
  { name: "重庆", adcode: "500100", aliases: ["重庆", "渝中", "南岸", "江北"] },
  { name: "昆明", adcode: "530100", aliases: ["昆明", "五华", "盘龙"] },
  { name: "西安", adcode: "610100", aliases: ["西安", "雁塔", "碑林"] },
  { name: "南宁", adcode: "450100", aliases: ["南宁", "青秀", "兴宁"] },
  { name: "海口", adcode: "460100", aliases: ["海口", "龙华", "美兰"] },
  { name: "天津", adcode: "120100", aliases: ["天津", "和平", "河西"] },
  { name: "广东", adcode: "440000", aliases: ["广东", "粤"] },
  { name: "贵州", adcode: "520000", aliases: ["贵州", "黔"] },
  { name: "浙江", adcode: "330000", aliases: ["浙江"] },
  { name: "江苏", adcode: "320000", aliases: ["江苏"] },
  { name: "福建", adcode: "350000", aliases: ["福建"] },
  { name: "山东", adcode: "370000", aliases: ["山东"] },
  { name: "四川", adcode: "510000", aliases: ["四川"] },
  { name: "湖北", adcode: "420000", aliases: ["湖北"] },
  { name: "湖南", adcode: "430000", aliases: ["湖南"] },
  { name: "云南", adcode: "530000", aliases: ["云南"] },
  { name: "陕西", adcode: "610000", aliases: ["陕西"] },
  { name: "广西", adcode: "450000", aliases: ["广西"] },
  { name: "海南", adcode: "460000", aliases: ["海南"] }
];

export const detectCityFromText = (rawText) => {
  const text = String(rawText || "").trim();
  if (!text) return null;

  const matchedRegions = regionCatalog
    .map((region) => ({
      ...region,
      score: region.aliases.reduce((count, alias) => count + (text.includes(alias) ? 1 : 0), 0)
    }))
    .filter((region) => region.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return String(right.adcode).length - String(left.adcode).length;
    });

  if (!matchedRegions.length) return null;

  return {
    name: matchedRegions[0].name,
    adcode: matchedRegions[0].adcode
  };
};

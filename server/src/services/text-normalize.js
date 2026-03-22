const noisePatterns = [
  /人均/,
  /评分/,
  /地址/,
  /收藏/,
  /定位/,
  /打卡/,
  /营业时间/,
  /避雷/,
  /攻略/,
  /参考来源/,
  /美食博主/,
  /评论区/,
  /up主/i,
  /纪录片|记录片/,
  /(火锅|粉|面|烧烤|甜品|小吃)\s*类/,
  /粉\s*\/\s*面类|粉面类/,
  /之行/,
  /很好吃/,
  /旅途/,
  /咬肌/,
  /慢慢炖/,
  /味道很/,
  /服务也/,
  /当天去/,
  /附近散步/,
  /立马打开软件/,
  /收到.*差评/,
  /^#/
];

const splitPattern = /[\n\r,，;；、]/;
const genericOnlyPattern = /^(烤肉|丝娃娃|糯米饭|辣子鸡|豆腐圆子|洋芋粑|夺夺粉|牛肉粉|肠旺面|豆米火锅|酸汤|豆豉)$/;
const joinedNameMarkers = ["杨姨妈", "章家", "席家", "余嬢", "龙姐", "龙老太", "吴记"];
const regionOnlyPattern = /^[\u4e00-\u9fa5]{2,8}(省|市|区|县)$/;
const codeLikePattern =
  /(__proto__|modulejob|tracepromise|promise|internal|async|await|node\.js|nodejs|listen|import|export|proto|esm|modules?|address:|runtime|v\d+\.\d+(\.\d+)?)/i;
const latinHeavyPattern = /^[A-Za-z0-9._\-/'():\s]{4,}$/;
const categoryHeaderPattern = /^[一二三四五六七八九十0-9]+\s*(火锅|粉|面|烧烤|甜品|小吃)\s*类$/;

const stripBrackets = (value) => String(value || "").replace(/[（(][^）)]*[）)]/g, "").trim();

const cleanOption = (value) =>
  stripBrackets(value)
    .replace(/^(去|吃|就去|必须|推荐|另外再推荐一些我N刷的店给你|另外再推荐一些|另外再推荐)/, "")
    .replace(/(都ok.*|都可以.*|可以.*|ok.*|求你换一家.*|我看起都打脑壳.*)$/i, "")
    .replace(/今天就整/g, "")
    .trim();

const attachCategory = (option, category) => {
  if (!category) return option;
  if (option.includes(category)) return option;
  if (option.endsWith(category.charAt(0))) {
    return `${option}${category.slice(1)}`;
  }
  return `${option}${category}`;
};

const splitJoinedOptions = (option) => {
  for (const marker of joinedNameMarkers) {
    const index = option.indexOf(marker);
    if (index > 1) {
      const left = option.slice(0, index).trim();
      const right = option.slice(index).trim();
      return [left, right].filter(Boolean);
    }
  }
  return [option];
};

const extractStructuredCandidates = (segment) => {
  const cleanSegment = stripBrackets(segment);
  const colonIndex = cleanSegment.indexOf("：") >= 0 ? cleanSegment.indexOf("：") : cleanSegment.indexOf(":");
  const pairs = [];

  if (colonIndex > 0) {
    pairs.push({
      category: cleanSegment.slice(0, colonIndex).trim(),
      options: cleanSegment.slice(colonIndex + 1).trim()
    });
  }

  const verbMatch = cleanSegment.match(/^(.{1,10}?)(吃|推荐)(.+)$/);
  if (verbMatch) {
    pairs.push({
      category: verbMatch[1].trim(),
      options: verbMatch[3].trim()
    });
  }

  for (const pair of pairs) {
    const rawCategory = pair.category
      .replace(/(推荐|必吃|吃|另外再推荐一些我N刷的店给你|另外再推荐一些|另外再推荐)$/g, "")
      .trim();

    const rawOptions = cleanOption(pair.options);
    const options = rawOptions
      .split(/或者|或|\/|和/)
      .map((item) => cleanOption(item))
      .flatMap((item) => splitJoinedOptions(item))
      .filter(Boolean)
      .filter((item) => !/^(笔记|附近|都ok|都可以)$/.test(item));

    if (!options.length) continue;

    return options.map((item) => attachCategory(item, rawCategory));
  }

  return [];
};

export const normalizeCandidateNames = (rawText) => {
  const unique = new Set();
  const textWithoutBrackets = rawText.replace(/[（(][^）)]*[）)]/g, "");

  return textWithoutBrackets
    .split(splitPattern)
    .map((item) => item.trim())
    .map((item) => item.replace(/^\s*(?:(?:No\.?\s*)?\d+[\.\-、\s]*)/i, "").trim())
    .flatMap((item) => {
      const structured = extractStructuredCandidates(item);
      if (structured.length) return structured;

      const plain = cleanOption(item);
      return plain ? [plain] : [];
    })
    .map((item) => item.replace(/^(必须|推荐)/, "").trim())
    .filter((item) => item.length >= 2)
    .filter((item) => !genericOnlyPattern.test(item))
    .filter((item) => !regionOnlyPattern.test(item))
    .filter((item) => !categoryHeaderPattern.test(item.replace(/\s+/g, "")))
    .filter((item) => !codeLikePattern.test(item))
    .filter((item) => !latinHeavyPattern.test(item))
    .filter((item) => !noisePatterns.some((pattern) => pattern.test(item)))
    .filter((item) => {
      if (unique.has(item)) return false;
      unique.add(item);
      return true;
    });
};

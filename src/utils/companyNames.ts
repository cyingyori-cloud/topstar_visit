const companyNameMap: Record<string, string> = {
  // S级
  '深圳华星光电': '深圳华星光电技术有限公司',
  '华星光电': '深圳华星光电技术有限公司',
  'TCL华星': 'TCL华星光电技术有限公司',
  '富士康科技': '富士康科技集团',
  '富士康': '富士康科技集团',
  '立讯精密': '立讯精密工业股份有限公司',
  '格力电器': '珠海格力电器股份有限公司',
  // A级
  '深圳比亚迪电子有限公司': '深圳比亚迪电子有限公司',
  '深圳比亚迪电子': '深圳比亚迪电子有限公司',
  '比亚迪电子': '深圳比亚迪电子有限公司',
  '比亚迪': '深圳比亚迪电子有限公司',
  '长盈精密': '长盈精密技术股份有限公司',
  '欣旺达': '深圳欣旺达电子股份有限公司',
  '大族激光': '大族激光科技产业集团股份有限公司',
  '深天马': '天马微电子股份有限公司',
  // B级
  '德赛电池': '惠州德赛电池有限公司',
  '木林森照明': '中山木林森照明科技有限公司',
  '木林森': '中山木林森照明科技有限公司',
  '瑞声科技': '瑞声科技控股有限公司',
  '亿纬锂能': '亿纬锂能股份有限公司',
  '信利光电': '信利光电股份有限公司',
  '蓝思科技': '蓝思科技股份有限公司',
  '伯恩光学': '伯恩光学有限公司',
  '领益智造': '领益智造股份有限公司',
  '欧菲光': '欧菲光集团股份有限公司',
  '合力泰': '合力泰科技股份有限公司',
  // C级
  '京东方': '京东方科技集团股份有限公司',
  '天马微电子': '天马微电子股份有限公司',
  '维信诺': '维信诺科技股份有限公司',
  '柔宇科技': '柔宇科技有限公司',
  '汇顶科技': '深圳市汇顶科技股份有限公司',
  '兆易创新': '兆易创新科技股份有限公司',
  '韦尔股份': '上海韦尔半导体股份有限公司',
  '闻泰科技': '闻泰科技股份有限公司',
  '龙旗科技': '上海龙旗科技股份有限公司',
  '华勤技术': '华勤技术股份有限公司',
};

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const companyEntries = Object.entries(companyNameMap).sort((a, b) => b[0].length - a[0].length);
const companyNamePattern = new RegExp(companyEntries.map(([name]) => escapeRegExp(name)).join('|'), 'g');
const canonicalCompanyNames = Array.from(new Set(Object.values(companyNameMap))).sort((a, b) => b.length - a.length);

function repairKnownCompanyNameArtifacts(text: string) {
  return text.replace(/(?:深圳){2,}比亚迪(?:电子有限公司)+(?:有限公司)*/g, '深圳比亚迪电子有限公司');
}

function collapseRepeatedCanonicalNames(text: string) {
  return canonicalCompanyNames.reduce((result, fullName) => {
    return result.replace(new RegExp(`(?:${escapeRegExp(fullName)}){2,}`, 'g'), fullName);
  }, text);
}

export function getFullCompanyName(name: string) {
  return companyNameMap[name] || name;
}

export function normalizeCompanyNames(text: string) {
  const repaired = repairKnownCompanyNameArtifacts(text);
  const normalized = repaired.replace(companyNamePattern, match => companyNameMap[match] || match);
  return collapseRepeatedCanonicalNames(repairKnownCompanyNameArtifacts(normalized));
}

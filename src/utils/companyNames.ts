const companyNameMap: Record<string, string> = {
  '深圳华星光电': '深圳华星光电技术有限公司',
  '华星光电': '深圳华星光电技术有限公司',
  '富士康科技': '富士康科技集团',
  '富士康': '富士康科技集团',
  '立讯精密': '立讯精密工业股份有限公司',
  '比亚迪电子': '深圳比亚迪电子有限公司',
  '比亚迪': '深圳比亚迪电子有限公司',
  '长盈精密': '长盈精密技术股份有限公司',
  '德赛电池': '惠州德赛电池有限公司',
  '欣旺达': '深圳欣旺达电子股份有限公司',
  '木林森照明': '中山木林森照明科技有限公司',
  '木林森': '中山木林森照明科技有限公司',
  '格力电器': '珠海格力电器股份有限公司',
  '瑞声科技': '瑞声科技控股有限公司',
};

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function getFullCompanyName(name: string) {
  return companyNameMap[name] || name;
}

export function normalizeCompanyNames(text: string) {
  return Object.keys(companyNameMap)
    .sort((a, b) => b.length - a.length)
    .reduce((result, key) => {
      return result.replace(new RegExp(escapeRegExp(key), 'g'), companyNameMap[key]);
    }, text);
}

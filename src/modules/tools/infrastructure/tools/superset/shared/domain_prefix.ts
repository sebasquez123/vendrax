export const withDomainPrefix = (chartName: string, domain?: { contain?: string }): string => {
  if (!domain?.contain) return chartName;
  const bareName = chartName.replace(/^(\s*\[METBOT - [^\]]*\]\s*)+/, '');
  return `[METBOT - ${domain.contain}] ${bareName}`;
};

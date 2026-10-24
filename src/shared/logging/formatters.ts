export const toolsByServerLine = (entries: { server: string; tools: { name: string }[] }[]): string =>
  entries.map(({ server, tools }) => `${server}(${tools.length}): ${tools.map((tool) => tool.name).join(', ') || '-'}`).join(' | ') || '-';

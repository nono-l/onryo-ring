/**
 * 棚が HTML から読む更新日。
 * modified が無いページはタグを出さない。
 * published が modified と同じ、または未指定なら公開日タグは出さない。
 * 日時そのものは scripts/page-dates.mjs が本文の変化から書く。
 */
export function articleDateHead(dates: { modified?: string; published?: string }) {
  const modified = dates.modified;
  if (!modified) return { meta: [], scripts: [] };
  const published = dates.published && dates.published !== modified ? dates.published : undefined;
  const ld: Record<string, string> = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    dateModified: modified,
  };
  if (published) ld.datePublished = published;
  const meta: Array<{ property: string; content: string }> = [
    { property: "article:modified_time", content: modified },
  ];
  if (published) meta.push({ property: "article:published_time", content: published });
  return {
    meta,
    scripts: [{ type: "application/ld+json", children: JSON.stringify(ld) }],
  };
}

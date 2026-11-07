export const pageHead = (title: string, description: string) => () => ({
  meta: [
    { title: `${title} · Brightpath Student Administration` },
    { name: "description", content: description },
    { property: "og:title", content: `${title} · Brightpath Student Administration` },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ],
});

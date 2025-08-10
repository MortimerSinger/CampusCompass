import Parser from "rss-parser";

export async function POST(request: Request) {
  try {
    const { urls } = await request.json();
    if (!Array.isArray(urls) || urls.length === 0) {
      return new Response(JSON.stringify({ error: "Provide { urls: string[] }" }), { status: 400 });
    }
    const parser = new Parser();
    const results = await Promise.all(urls.map(async (u) => {
      try {
        const feed = await parser.parseURL(u);
        const items = (feed.items || []).slice(0, 5).map(i => ({
          title: i.title,
          link: i.link,
          isoDate: i.isoDate
        }));
        return { url: u, title: feed.title, items };
      } catch (e:any) {
        return { url: u, error: e?.message || "Failed to parse" };
      }
    }));
    return Response.json({ feeds: results });
  } catch (e:any) {
    return new Response(JSON.stringify({ error: e?.message || "Bad request" }), { status: 400 });
  }
}

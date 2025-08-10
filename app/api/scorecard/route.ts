export async function POST(request: Request) {
  const body = await request.json();
  const { query } = body || {};
  const apiKey = process.env.SCORECARD_API_KEY;
  if (!apiKey) return new Response(JSON.stringify({ error: "Missing SCORECARD_API_KEY" }), { status: 500 });
  const url = new URL("https://api.data.gov/ed/collegescorecard/v1/schools");
  url.searchParams.set("api_key", apiKey);
  // Minimal fields for MVP
  url.searchParams.set("fields", "id,school.name,school.city,school.state,school.school_url,latest.admissions.admission_rate.overall,latest.admissions.sat_scores.average.overall,latest.cost.net_price.public.by_income_level.0-110000,latest.cost.net_price.private.by_income_level.0-110000,latest.completion.rate_suppressed.overall,latest.earnings.10_yrs_after_entry.median_earnings");
  if (typeof query === "string" && query.trim().length) {
    url.searchParams.set("school.name", query);
  } else {
    url.searchParams.set("per_page", "5");
  }
  const res = await fetch(url.toString());
  if (!res.ok) return new Response(JSON.stringify({ error: "Scorecard request failed" }), { status: 500 });
  const data = await res.json();
  return Response.json(data);
}

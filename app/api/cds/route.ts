import pdf from "pdf-parse";

export async function POST(request: Request) {
  try {
    const { url } = await request.json();
    if (!url || typeof url !== "string") {
      return new Response(JSON.stringify({ error: "Provide { url }" }), { status: 400 });
    }
    const res = await fetch(url);
    if (!res.ok) return new Response(JSON.stringify({ error: "Failed to fetch PDF" }), { status: 502 });
    const buff = Buffer.from(await res.arrayBuffer());
    const data = await pdf(buff);
    const text = data.text || "";
    // Naive extraction: find block around "C7"
    const idx = text.indexOf("C7");
    let snippet = "";
    if (idx !== -1) {
      const start = Math.max(0, idx - 800);
      const end = Math.min(text.length, idx + 2400);
      snippet = text.substring(start, end);
    } else {
      // try alternate
      const idx2 = text.toUpperCase().indexOf("C7");
      if (idx2 !== -1) {
        const start = Math.max(0, idx2 - 800);
        const end = Math.min(text.length, idx2 + 2400);
        snippet = text.substring(start, end);
      }
    }
    // Attempt trivial mapping: look for lines like "Rigor of secondary school record" followed by markers
    const factors = [
      "Rigor of secondary school record","Class rank","Academic GPA","Standardized test scores","Application Essay","Recommendation(s)",
      "Interview","Extracurricular activities","Talent/ability","Character/personal qualities","First generation","Alumni/ae relation",
      "Geographical residence","State residency","Religious affiliation/commitment","Racial/ethnic status","Volunteer work",
      "Work experience","Level of applicant’s interest","Level of applicant's interest"
    ];
    const result = { very_important: [] as string[], important: [] as string[], considered: [] as string[], not_considered: [] as string[] };
    const lines = (snippet || text).split(/\r?\n/).map(l=>l.trim()).filter(Boolean);

    function assignFactor(name: string, line: string) {
      const l = line.toLowerCase();
      if (/(very\s*important|\bvi\b)/i.test(l)) result.very_important.push(name);
      else if (/(\bimportant\b|\bi\b)/i.test(l)) result.important.push(name);
      else if (/(considered|\bc\b)/i.test(l)) result.considered.push(name);
      else if (/(not considered|\bn\b)/i.test(l)) result.not_considered.push(name);
    }

    for (const f of factors) {
      const ix = lines.findIndex(l => l.toLowerCase().includes(f.toLowerCase()));
      if (ix !== -1) {
        const windowLines = lines.slice(ix, Math.min(ix+3, lines.length));
        const combo = windowLines.join(" ");
        assignFactor(f, combo);
      }
    }

    const counts = Object.values(result).reduce((a:any,arr:any)=>a+arr.length,0);
    if (counts === 0) {
      return Response.json({ status: "unparsed", snippet: snippet || lines.slice(0, 120).join("\n") });
    }
    return Response.json({ status: "ok", c7: result, snippet });
  } catch (e:any) {
    return new Response(JSON.stringify({ error: e?.message || "CDS parse failed" }), { status: 500 });
  }
}

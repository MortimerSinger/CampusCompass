"use client";
import { useEffect, useMemo, useState } from "react";
import "./styles/global.css";

type C7 = { very_important: string[]; important: string[]; considered: string[]; not_considered: string[] };

type School = {
  id: string;
  name: string;
  city?: string;
  state?: string;
  website?: string;
  rss?: string[]; // admissions/news feeds
  cdsC7Url?: string; // Common Data Set link
  notes?: string;
  c7?: C7;
  metrics?: {
    admit_rate?: number; // 0-1
    sat_midpoint?: number; // 400-1600
    cost_avg?: number; // net price
    grad_rate?: number; // 0-1
    earnings_median?: number; // $
    size?: number; // undergrads
  };
  weights?: Weights;
};
type Weights = { academics: number; outcomes: number; cost: number; selectivity: number; student_life: number; };
const DEFAULT_WEIGHTS: Weights = { academics: 0.3, outcomes: 0.25, cost: 0.15, selectivity: 0.2, student_life: 0.1 };

const LOCAL_KEY = "cc.schools.v1";


function useNews(feeds: string[] | undefined) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const refresh = async () => {
    if (!feeds || feeds.length===0) return;
    setLoading(true);
    try {
      const res = await fetch("/api/rss", { method: "POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ urls: feeds }) });
      const data = await res.json();
      const flat = (data.feeds||[]).flatMap((f:any)=> (f.items||[]).map((it:any)=> ({...it, source:f.title||f.url})) ).sort((a:any,b:any)=> (new Date(b.isoDate||0).getTime() - new Date(a.isoDate||0).getTime())).slice(0,6);
      setItems(flat);
    } catch(e) {} finally { setLoading(false); }
  };
  useEffect(()=>{ refresh(); },[]);
  return { items, loading, refresh };
}

function FitTips({ c7 }: { c7?: C7 }) {
  if (!c7) return null;
  const top = [...(c7.very_important||[]), ...(c7.important||[])].slice(0,6);
  if (top.length===0) return null;
  return (
    <div style={{ marginTop:8 }}>
      <div className="tag">Admissions Fit Tips</div>
      <ul style={{ margin: "8px 0", paddingLeft: 18 }}>
        {top.map((t,i)=>(<li key={i} style={{ fontSize:14 }}>{t}</li>))}
      </ul>
    </div>
  );
}

export default function Home() {
  const [schools, setSchools] = useState<School[]>([]);
  const [editing, setEditing] = useState<School | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (raw) setSchools(JSON.parse(raw));
    else setSchools(seed());
  }, []);

  useEffect(() => {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(schools));
  }, [schools]);

  const filtered = useMemo(() => {
    if (!query.trim()) return schools;
    return schools.filter(s => s.name.toLowerCase().includes(query.toLowerCase()));
  }, [schools, query]);

  function seed(): School[] {
    return [
      { id:"harvard", name:"Harvard University", city:"Cambridge", state:"MA", website:"https://www.harvard.edu/",
        rss:["https://college.harvard.edu/admissions/blog/rss.xml", "https://news.harvard.edu/rss/"],
        cdsC7Url:"https://oir.harvard.edu/common-data-set",
        notes:"Target. Emphasize academic rigor + impact. Potential CS + humanities crossover.",
        metrics:{ admit_rate:0.031, sat_midpoint:1530, cost_avg:16972, grad_rate:0.98, earnings_median:98900, size:7700 }
      },
      { id:"upenn", name:"University of Pennsylvania", city:"Philadelphia", state:"PA", website:"https://www.upenn.edu/",
        rss:["https://penntoday.upenn.edu/rss.xml", "https://admissions.upenn.edu/blog/rss.xml"],
        cdsC7Url:"https://oir.upenn.edu/common-data-set",
        notes:"Strong for interdisciplinary programs (Huntsman/LSM/VIPER).",
        metrics:{ admit_rate:0.055, sat_midpoint:1510, cost_avg:25167, grad_rate:0.96, earnings_median:95000, size:10600 }
      },
      { id:"wake", name:"Wake Forest University", city:"Winston-Salem", state:"NC", website:"https://www.wfu.edu/",
        rss:["https://news.wfu.edu/feed/","https://admissions.wfu.edu/feed/"],
        cdsC7Url:"https://prod.wp.cdn.aws.wfu.edu/sites/234/2024/11/CDS_2023-2024.pdf",
        notes:"Mid-size, strong community. Consider pre-business track.",
        metrics:{ admit_rate:0.26, sat_midpoint:1390, cost_avg:35700, grad_rate:0.90, earnings_median:78200, size:5600 }
      }
    ].map(s => ({...s, weights: DEFAULT_WEIGHTS}));
  }

  function addOrUpdateSchool(s: School) {
    setSchools(prev => {
      const exists = prev.find(p => p.id === s.id);
      if (exists) return prev.map(p => p.id === s.id ? s : p);
      return [...prev, s];
    });
    setEditing(null);
  }
  function remove(id: string) {
    if (!confirm("Remove this school?")) return;
    setSchools(prev => prev.filter(p => p.id !== id));
  }

  function score(s: School): number {
    const w = s.weights ?? DEFAULT_WEIGHTS;
    // Normalize a few metrics to 0-100 with simple heuristics
    const academics = norm(s.metrics?.sat_midpoint ?? 1200, 1000, 1560);
    const outcomes  = avg([norm(s.metrics?.grad_rate ?? 0.8, 0.6, 0.99), norm(s.metrics?.earnings_median ?? 60000, 40000, 110000)]);
    const cost      = 100 - norm(s.metrics?.cost_avg ?? 30000, 10000, 70000);
    const select    = 100 - norm(s.metrics?.admit_rate ?? 0.3, 0.02, 0.6);
    const life      = norm(s.metrics?.size ?? 8000, 1000, 40000); // proxy by size preference
    return w.academics*academics + w.outcomes*outcomes + w.cost*cost + w.selectivity*select + w.student_life*life;
  }
  function norm(value:number, min:number, max:number) {
    const clamped = Math.max(min, Math.min(max, value));
    return ((clamped - min) / (max - min)) * 100;
  }
  function avg(arr:number[]) { return arr.reduce((a,b)=>a+b,0)/arr.length; }

  const ranked = [...filtered].sort((a,b)=>score(b)-score(a));

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="panel">
        <div style={{ display:"flex", gap:12, alignItems:"center", justifyContent:"space-between" }}>
          <input className="input" placeholder="Search schools..." value={query} onChange={e=>setQuery(e.target.value)} />
          <button className="btn" onClick={()=>setEditing({ id: crypto.randomUUID(), name:"", weights: DEFAULT_WEIGHTS })}>+ Add School</button>
        </div>
      </div>

      <div className="panel">
        <h3 style={{ marginTop: 0 }}>Compare & Rank</h3>
        <table className="table">
          <thead>
            <tr>
              <th>School</th>
              <th>Admit</th>
              <th>SAT</th>
              <th>Net Price</th>
              <th>Grad Rate</th>
              <th>Earnings</th>
              <th>Score</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {ranked.map(s => (
              <tr key={s.id}>
                <td>
                  <div style={{ display:"flex", flexDirection:"column" }}>
                    <strong>{s.name}</strong>
                    <small className="muted">{s.city}, {s.state}</small>
                    <div style={{ display:"flex", gap:6, marginTop:6, flexWrap:"wrap" }}>
                      {s.rss?.map((u,i)=>(<span key={i} className="tag">RSS {i+1}</span>))}
                      {s.cdsC7Url && <span className="tag">CDS C7</span>}
                    </div>
                  </div>
                </td>
                <td>{s.metrics?.admit_rate!=null ? (s.metrics.admit_rate*100).toFixed(1)+'%' : '—'}</td>
                <td>{s.metrics?.sat_midpoint ?? '—'}</td>
                <td>{s.metrics?.cost_avg!=null ? `$${s.metrics.cost_avg.toLocaleString()}` : '—'}</td>
                <td>{s.metrics?.grad_rate!=null ? (s.metrics.grad_rate*100).toFixed(0)+'%' : '—'}</td>
                <td>{s.metrics?.earnings_median!=null ? `$${s.metrics.earnings_median.toLocaleString()}` : '—'}</td>
                <td><strong>{score(s).toFixed(0)}</strong></td>
                <td>
                  <button className="btn" onClick={()=>setEditing(s)}>Edit</button>&nbsp;
                  <button className="btn" onClick={()=>remove(s.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <h3 style={{ marginTop: 0 }}>Notes & Alerts</h3>
        <div className="grid grid-3">
          {schools.map(s=>(
            <div key={s.id} className="panel">
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <strong>{s.name}</strong>
                <a className="tag" href={s.website ?? "#"} target="_blank">Website</a>
              </div>
              <textarea className="textarea" rows={6} placeholder="Your notes..." value={s.notes ?? ""} onChange={e=>{
                const v = e.target.value;
                setSchools(prev=>prev.map(p=>p.id===s.id?{...p, notes:v}:p));
              }} />
              <FitTips c7={s.c7} />
              <NewsWidget feeds={s.rss} />
              <div style={{ display:"flex", gap:8, marginTop:8, flexWrap:"wrap" }}>
                {(s.rss??[]).map((u,i)=>(<a key={i} className="tag" href={u} target="_blank">Feed {i+1}</a>))}
                {s.cdsC7Url && <a className="tag" href={s.cdsC7Url} target="_blank">Admissions Factors (C7)</a>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {editing && <Editor school={editing} onSave={addOrUpdateSchool} onCancel={()=>setEditing(null)} />}
    </div>
  );
}

function Editor({ school, onSave, onCancel }:{ school: School, onSave:(s:School)=>void, onCancel:()=>void }) {
  async function autofillFromScorecard() {
    if (!s.name) return alert("Enter school name first");
    try {
      const res = await fetch("/api/scorecard", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ query: s.name }) });
      const data = await res.json();
      const r = (data.results && data.results[0]) || null;
      if (!r) return alert("No results found");
      const admit = r['latest.admissions.admission_rate.overall'];
      const sat = r['latest.admissions.sat_scores.average.overall'];
      const netPub = r['latest.cost.net_price.public.by_income_level.0-110000'];
      const netPriv = r['latest.cost.net_price.private.by_income_level.0-110000'];
      const grad = r['latest.completion.rate_suppressed.overall'];
      const earn = r['latest.earnings.10_yrs_after_entry.median_earnings'];
      const url = r['school.school_url'];
      const city = r['school.city']; const state = r['school.state'];
      setS(prev=>({...prev,
        city: city || prev.city,
        state: state || prev.state,
        website: url ? (url.startsWith("http")? url : "https://"+url) : prev.website,
        metrics: { ...prev.metrics,
          admit_rate: typeof admit === 'number' ? admit : prev.metrics?.admit_rate,
          sat_midpoint: typeof sat === 'number' ? Math.round(sat) : prev.metrics?.sat_midpoint,
          cost_avg: typeof netPriv === 'number' ? Math.round(netPriv) : (typeof netPub === 'number' ? Math.round(netPub) : prev.metrics?.cost_avg),
          grad_rate: typeof grad === 'number' ? grad : prev.metrics?.grad_rate,
          earnings_median: typeof earn === 'number' ? Math.round(earn) : prev.metrics?.earnings_median
        }
      }));
    } catch (e) {
      alert("Scorecard lookup failed");
    }
  }

  async function importC7() {
    if (!s.cdsC7Url) return alert("Add a CDS C7 URL first");
    try {
      const res = await fetch("/api/cds", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ url: s.cdsC7Url }) });
      const data = await res.json();
      if (data.c7) setS(prev=>({...prev, c7: data.c7 }));
      else alert("Could not auto-parse. You can paste factors manually below.");
    } catch(e) { alert("C7 import failed"); }
  }

  const [s, setS] = useState<School>(school);
  function upd<K extends keyof School>(k:K, v: School[K]) { setS(prev => ({...prev, [k]: v})); }
  return (
    <div className="panel">
      <h3 style={{ marginTop:0 }}>Edit School</h3>
      <div className="grid grid-2">
        <label> Name<input className="input" value={s.name} onChange={e=>upd("name", e.target.value)} /></label>
        <label> ID<input className="input" value={s.id} onChange={e=>upd("id", e.target.value)} /></label>
        <label> City<input className="input" value={s.city ?? ""} onChange={e=>upd("city", e.target.value)} /></label>
        <label> State<input className="input" value={s.state ?? ""} onChange={e=>upd("state", e.target.value)} /></label>
        <label> Website<input className="input" value={s.website ?? ""} onChange={e=>upd("website", e.target.value)} /></label>
        <label> CDS C7 URL<input className="input" value={s.cdsC7Url ?? ""} onChange={e=>upd("cdsC7Url", e.target.value)} /></label>
      </div>
      <label>RSS feeds (comma-separated)
        <input className="input" value={(s.rss??[]).join(", ")} onChange={e=>upd("rss", e.target.value.split(",").map(v=>v.trim()).filter(Boolean))} />
      </label>
      <div className="grid grid-3">
        <label> Admit Rate (%)
          <input className="input" type="number" step="0.1" placeholder="e.g. 5.5" value={s.metrics?.admit_rate!=null ? (s.metrics.admit_rate*100).toString() : ""}
            onChange={e=>setS(prev=>({...prev, metrics:{...prev.metrics, admit_rate: e.target.value? Number(e.target.value)/100 : undefined}}))} />
        </label>
        <label> SAT Midpoint
          <input className="input" type="number" placeholder="e.g. 1510" value={s.metrics?.sat_midpoint ?? ""}
            onChange={e=>setS(prev=>({...prev, metrics:{...prev.metrics, sat_midpoint: e.target.value? Number(e.target.value): undefined}}))} />
        </label>
        <label> Avg Net Price ($)
          <input className="input" type="number" placeholder="e.g. 25000" value={s.metrics?.cost_avg ?? ""}
            onChange={e=>setS(prev=>({...prev, metrics:{...prev.metrics, cost_avg: e.target.value? Number(e.target.value): undefined}}))} />
        </label>
        <label> Grad Rate (%)
          <input className="input" type="number" placeholder="e.g. 96" value={s.metrics?.grad_rate!=null ? (s.metrics.grad_rate*100).toString(): ""}
            onChange={e=>setS(prev=>({...prev, metrics:{...prev.metrics, grad_rate: e.target.value? Number(e.target.value)/100 : undefined}}))} />
        </label>
        <label> Median Earnings ($)
          <input className="input" type="number" placeholder="e.g. 95000" value={s.metrics?.earnings_median ?? ""}
            onChange={e=>setS(prev=>({...prev, metrics:{...prev.metrics, earnings_median: e.target.value? Number(e.target.value): undefined}}))} />
        </label>
        <label> Size (UG)
          <input className="input" type="number" placeholder="e.g. 8000" value={s.metrics?.size ?? ""}
            onChange={e=>setS(prev=>({...prev, metrics:{...prev.metrics, size: e.target.value? Number(e.target.value): undefined}}))} />
        </label>
      </div>

      <h4>Weights (0–1; sum auto-normalized)</h4>
      <WeightsEditor weights={s.weights ?? {academics:0.3, outcomes:0.25, cost:0.15, selectivity:0.2, student_life:0.1}} onChange={(w)=>setS(prev=>({...prev, weights:w}))} />

      <div style={{ display:"flex", gap:8, marginTop:12, flexWrap:"wrap" }}>
        <button className="btn" onClick={autofillFromScorecard}>⤓ Autofill via Scorecard</button>
        <button className="btn" onClick={importC7}>⤓ Import C7 (beta)</button>
        <button className="btn" onClick={()=>onSave(s)}>Save</button>
        <button className="btn" onClick={onCancel}>Cancel</button>
      </div>

      <div className="panel" style={{ marginTop:12 }}>
        <h4 style={{ marginTop:0 }}>Admissions factors (C7) — manual</h4>
        <div className="grid grid-2">
          <label>Very important (comma-separated)
            <input className="input" placeholder="e.g. Rigor of curriculum, Academic GPA"
              value={(s.c7?.very_important||[]).join(", ")}
              onChange={e=>setS(prev=>({...prev, c7:{...prev.c7, very_important: e.target.value.split(",").map(v=>v.trim()).filter(Boolean), important: prev.c7?.important||[], considered: prev.c7?.considered||[], not_considered: prev.c7?.not_considered||[]}}))}
            />
          </label>
          <label>Important
            <input className="input" value={(s.c7?.important||[]).join(", ")}
              onChange={e=>setS(prev=>({...prev, c7:{...prev.c7, important: e.target.value.split(",").map(v=>v.trim()).filter(Boolean), very_important: prev.c7?.very_important||[], considered: prev.c7?.considered||[], not_considered: prev.c7?.not_considered||[]}}))}
            />
          </label>
          <label>Considered
            <input className="input" value={(s.c7?.considered||[]).join(", ")}
              onChange={e=>setS(prev=>({...prev, c7:{...prev.c7, considered: e.target.value.split(",").map(v=>v.trim()).filter(Boolean), very_important: prev.c7?.very_important||[], important: prev.c7?.important||[], not_considered: prev.c7?.not_considered||[]}}))}
            />
          </label>
          <label>Not considered
            <input className="input" value={(s.c7?.not_considered||[]).join(", ")}
              onChange={e=>setS(prev=>({...prev, c7:{...prev.c7, not_considered: e.target.value.split(",").map(v=>v.trim()).filter(Boolean), very_important: prev.c7?.very_important||[], important: prev.c7?.important||[], considered: prev.c7?.considered||[]}}))}
            />
          </label>
        </div>
      </div>
    </div>
  );
}

function WeightsEditor({weights, onChange}:{weights: Weights, onChange:(w:Weights)=>void}) {
  const [w,setW] = useState<Weights>(weights);
  useEffect(()=>{
    const total = w.academics + w.outcomes + w.cost + w.selectivity + w.student_life;
    const norm = (x:number)=> x/ (total || 1);
    onChange({academics:norm(w.academics), outcomes:norm(w.outcomes), cost:norm(w.cost), selectivity:norm(w.selectivity), student_life:norm(w.student_life)});
  }, [w]);
  return (
    <div className="grid grid-3">
      {(["academics","outcomes","cost","selectivity","student_life"] as (keyof Weights)[]).map(k=> (
        <label key={k} style={{ textTransform:"capitalize" }}>{k.replace("_"," ")}
          <input className="input" type="number" step="0.05" value={(w as any)[k]}
            onChange={e=>setW(prev=>({...prev, [k]: Number(e.target.value)} as Weights))} />
        </label>
      ))}
    </div>
  );
}


function NewsWidget({ feeds }: { feeds?: string[] }) {
  const { items, loading, refresh } = useNews(feeds);
  if (!feeds || feeds.length===0) return null;
  return (
    <div style={{ marginTop:10 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <span className="tag">News & Alerts</span>
        <button className="btn" onClick={refresh} disabled={loading}>{loading?"Refreshing...":"Refresh"}</button>
      </div>
      <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
        {items.map((it, i)=> (
          <li key={i} style={{ fontSize:14 }}>
            <a href={it.link} target="_blank" rel="noreferrer">{it.title}</a> <small className="muted">{it.source}</small>
          </li>
        ))}
      </ul>
    </div>
  );
}

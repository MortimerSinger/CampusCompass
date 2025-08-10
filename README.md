# College Compass (MVP)

A lightweight, local-first web app to compare colleges, take notes, and track live updates via RSS. Built with Next.js (App Router).

## What works now
- Add/edit schools with your own weights for scoring
- Local notes per school (stored in your browser)
- Compare view with simple composite score
- Links for admissions factors (CDS C7) and RSS feeds (admissions/news)
- Server-side RSS proxy (for production) and College Scorecard API forwarder

## Quick start
1) Ensure you have Node 18+ installed.
2) `npm install`
3) Copy `.env.example` to `.env` and set `SCORECARD_API_KEY` (free at College Scorecard).
4) `npm run dev`
5) Open http://localhost:3000

## Fetching live data
- **Metrics**: Use `/api/scorecard` to search and pull official data (admission rate, SAT, net price, grad rate, earnings) from U.S. Dept of Education College Scorecard.
- **News**: Use `/api/rss` with an array of feed URLs (admissions blogs, newsrooms). For development, paste feed URLs in the school editor and open them directly; in production, wire a small client to POST to `/api/rss` and render.

## Notes on sources
- College Scorecard official API: https://collegescorecard.ed.gov/data/api-documentation/
- IPEDS/Urban Institute: https://educationdata.urban.org/documentation/
- Common Data Set (C7) varies by school; link individual CDS PDFs.
- Test-optional status: https://fairtest.org/school/

## Roadmap
- Auth + cloud sync (Supabase with RLS)
- Custom review aggregator (Reddit school subs, student newspapers)
- Alerting (email/Push for essay prompt updates & deadlines)
- One-click import for a school (autofill feeds/CDS links/metrics)

## License
MIT (prototype)
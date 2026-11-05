# WA Racing Shortlist

A mobile-first shortlist viewer for Western Australian horse racing. It is a static demo of the
analytics layer in the Punting Form project: Python ETL, PostgreSQL and FastAPI in production,
sample data and browser-side queries here.

## What it shows

- **Class droppers** — runners with a negative `ClsDiff`, with an adjustable threshold.
- **Hot form lines** — runners from a past race with a high Key Race Index (`KRI`).
- **Elite closers** — runners ranked on `L600 Var L` and `L200 Var L`, computed from 200m splits.
- **Speed maps** — one lane per predicted settle group (`PrSe`), with a Slow, Genuine or Fast pace label.
- **Trainer and jockey angles** — strike rate and $1 level-stakes ROI for 1st-up, 2nd-up and
  back-up (≤7 days) runners.
- **Runner detail** — tap a horse to see its last-start 200m splits, benchmark variance and an SVG chart.
- **Under the hood** — the PostgreSQL DDL, FastAPI endpoint list, state config switch and a live
  "current filter as API call" panel.

Only Western Australia is enabled. Other states are disabled by `CONFIG.states` in `data.js`, and the
sample data includes a Victorian meeting that the filter excludes.

## Run it

Open `index.html` in a browser, or serve the folder:

```sh
python3 -m http.server 8000
```

Then open <http://127.0.0.1:8000/>.

There is no build step, no server code, no API key and no login.

## Deploy

Cloudflare Pages: framework preset **None**, no build command, output directory `/`.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Shell, sticky header, tabs, modal root |
| `styles.css` | Responsive theme, tables, speed map lanes, modal, chart |
| `app.js` | Query functions, tab routing, rendering, API panel and modal |
| `data.js` | Sample meetings, 38 WA runners, 200m sectionals and seeded history |

All horses, trainers and jockeys are fictional. Sectional splits are generated from a fixed seed, so
the metrics and the angle ROI values do not change between reloads.

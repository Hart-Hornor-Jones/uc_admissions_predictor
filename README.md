# Predicting UC admission rates from public school data

Interactive page (`index.html`, self-contained: data and d3 embedded) predicting each California public high school's
admission rate at one University of California campus from public statistics about the school. Published at
hart-hornor-jones.github.io/uc_admissions_predictor.

## Options added in November 2026
Ported from the UC San Diego–only adaptation (Hart-Hornor-Jones/ucsd-admit-prediction) and generalized to every campus:
- **Model**: linear (weighted least squares, the default, unchanged) or logistic (quasi-binomial; predictions stay between 0 and 100%).
- **Fit model to**: all schools (default), or schools outside the campus's county, which are then used to predict the local
  schools out of sample. "Local" means the campus's own county (San Diego and Imperial counties for San Diego).
- **Actual minus predicted table**: local schools, other California schools and all schools, with standard errors and
  implied admits above prediction, for each chart.
- **View**: actual against predicted, or actual minus predicted against distance to the campus.
- **Dots**: outline the local schools.
- **Find a school** by name.
- **Variables**: GPA curvature; applicant GPA relative to the school's applicants at the other campuses; campus share of
  the school's applications; admission rate at the other campuses; LCFF+ flag defined as UPP above 75%; local-school indicator.
  These are computed in the browser from the embedded data (see the page's definitions).

With the default settings every number on the page is the same as before.

## Files
- `index.html` — the page. Do not edit it directly; rebuild it.
- `data/uc_data.json` — the school × campus × era rows embedded in the page (unchanged from the July 2026 page).
- `data/school_county.csv` — county of each school (ceeb, name, county), from the state public school directory via
  `data/schools.csv` of Hart-Hornor-Jones/ucsd-local-preference.
- `build/page_src.html` — page template; `build/d3.v7.min.js` — d3.
- `build/assemble.py` — embeds d3, the data and the county table into `../index.html`.
- `build/make_county.py` — rebuilds `data/school_county.csv` from a school-directory table with `ceeb` and `county` columns.
- `build/check_page.js` — headless checks with Playwright (Chromium); `build/baseline_stats.json` — the statistics the
  July 2026 page displayed in its default state for every campus and era, used by the `check` mode.

Rebuild (Windows, macOS or Linux; Python 3, no packages needed):
```
cd build
python assemble.py
```
Checks (Node with Playwright installed):
```
node build/check_page.js check index.html build/baseline_stats.json
node build/check_page.js matrix index.html
```

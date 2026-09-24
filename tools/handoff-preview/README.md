# Handoff preview

The design handoff (`Local file check/design_handoff_shiftos/*.dc.html`) was exported
without the design tool's `support.js` runtime, so the prototypes don't open on
their own. `support.js` here is a small stand-in: it reads the `<x-dc>` template
and the `class Component extends DCLogic` script and renders them with React 18.

```bash
node tools/handoff-preview/server.mjs      # http://localhost:5192
```

Open a prototype with its preview props in the query string, e.g.

- `http://localhost:5192/ShiftOS%20Dashboards.dc.html?role=Manager&page=Recent%20Activity`
- `…&viewState=Loading` / `…&viewState=Empty`, `…&showShifty=false`

The Manager and Supervisor dashboards open with the "Set up your branch" hours
dialog on first load; click **Save & continue** to reach the page.

To compare against the app, run the app's preview (`pnpm --filter @shiftos/web
preview:schedule`, port 5191, `?path=/recent-activity` etc.) at the same viewport.
The app has its own top bar above the page header, so line the two up by the
bottom of the page header (the app's sits 73px lower at 1440px wide).

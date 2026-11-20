# Leonida Grid — your photos, posted from Leonida

[![gta6-cover-art-01 on make.fun](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/c/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/wizzy-bounty/gta6-cover-art-01-grid/rank.svg)](https://make.fun/c/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/wizzy-bounty/gta6-cover-art-01-grid/reward.svg)](https://make.fun/c/gta6-cover-art-01)

Leonida Grid turns your own photos into GTA-style cover art on a Leonida
postcard. It is a single-page, client-side web app: everything is drawn
locally on a canvas, it works fully offline, and it makes zero network
requests — every script, style, font and image it loads is a file under
`app/` or a data URI. Your photos never leave the device.

## What it does

- **Photo intake** — add 1–6 photos by file picker or drag-and-drop. Each
  photo is cover-cropped into its panel; click a panel to select it, drag
  inside it to reposition the photo, and set its zoom with the slider.
  Two bundled demo photos (the pier, the boulevard) are one click away.
- **Six grid layouts** on the postcard's picture side — Hero Left (hero
  spans the left, the rest stack beside it), Hero Top, Twin Strip, Quad,
  Six-Up and Classic Cover (full-bleed hero with floating inset panels) —
  separated by thin cream gutters and ink borders, comic style.
- **Painted demo state** — on first load the grid is already a complete
  cover: four Leonida scenes painted in code on canvas (sunset bay, palm
  strip, neon harbor, causeway at dusk). Uploaded photos replace panels
  one by one, and a reset control restores the demo.
- **Pop-out hero** — a toggle scales the hero panel's image past its frame
  edge with a drop shadow, for the classic frame-break cover look.
- **Postcard identity** — a perforated left edge with a tear line, a corner
  postage stamp that shows the selected grade, a circular postmark reading
  "LEONIDA — MAY 26 2026", and wavy cancellation lines over the stamp.
- **Five grades** — Bronze, Silver, Gold, Platinum and Leonida Legend.
  Each grade re-tints the frame, changes the stamp's emblem and art, and
  prints its own one-line flavour caption on the card.
- **Caption bar** — an editable cover title (default "LEONIDA GRID") in big
  condensed Anton type plus an editable subtitle, in three treatments:
  Classic, Neon (glowing Pacifico script on a night panel) and Newsprint.
- **Export** — one-click PNG downloads at 1080×1080, 1080×1350 and
  1920×1080. The export renders the grid, frame, stamp, postmark and
  caption exactly as previewed, from the same drawing code.

## Running it

The app is plain static files under `app/` — no build step. Serve it
locally with the bundled development server:

```
node serve.ts        # then open http://localhost:8080
```

`main.ts` is the entry program: it copies `app/` and `screenshots/` into
the output directory (`MAKEFUN_OUTPUT_DIR`, or `/output`) and writes
`dossier.json` there with the vendored make.fun library. It is
deterministic — two runs over the same tree produce byte-identical
output.

## Layout of the repo

- `app/index.html` — the page and control panel
- `app/style.css` — studio styling and the bundled font faces
- `app/src/scenes.js` — the four painted Leonida demo scenes
- `app/src/postcard.js` — grades, grid layouts and the postcard renderer
  shared by the preview and every export size
- `app/src/app.js` — UI wiring: intake, selection, drag/zoom, exports
- `app/fonts/` — Anton and Pacifico (SIL Open Font License 1.1, see
  `app/fonts/OFL.txt`)
- `app/samples/` — the two demo photos
- `screenshots/` — captures of the real app and its exports

## License

MIT — see `LICENSE`.

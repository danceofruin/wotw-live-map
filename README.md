# WotW Live Map

Player-safe browser battlemap: https://danceofruin.github.io/wotw-live-map/

The page reads public `state.json` every two seconds while visible. Token movement needs only one state update, no image rendering. GitHub raw-content caching can delay updates; two seconds is the polling interval, not a delivery guarantee. Background polling pauses in hidden tabs. Client changes deploy through GitHub Pages (`main`, repository root).

## Use

Open the page or the HUD's Live-Karte button. Click **Demo** to test the standalone training room without changing live campaign state. Raster, coordinates, zoom and fullscreen are local controls. Click tokens for details. The JSON preview is local and never writes to GitHub. The live view is read-only: the GM owns accepted movement.

## GM update contract — schema 2

Fetch current public `state.json`, then write a complete player-safe replacement only after adjudication. Use the GitHub contents update with the fetched file SHA to avoid concurrent overwrite. Preserve all fields that did not change. Change `revision` every time the public state changes and use an ISO UTC `generated_at`. No visible change means no commit. Encounter end: `active:false`, `map:null`, `tokens:[]`, new revision.

Start from `demo.json` for the format, replacing the demo with accepted scene facts. Do not automatically activate the demo as campaign truth. The root state remains idle until a real encounter is activated.

Minimal example:

```json
{
  "schema_version": 2,
  "active": true,
  "scene_id": "example-room",
  "title": "Example room",
  "revision": "example-1",
  "generated_at": "2026-10-03T12:00:00Z",
  "grid": {"cols": 12, "rows": 8, "feet": 5},
  "map": {
    "terrain": [{"type":"floor", "x":0, "y":0, "w":12, "h":8}],
    "walls": [{"from":[0,0], "to":[12,0]}],
    "markers": [{"type":"crate", "x":4, "y":3}]
  },
  "tokens": [{"id":"styke", "name":"Styke", "label":"S", "square":"C3", "icon":"styke", "faction":"party"}]
}
```

- Token fields: stable unique `id`, `name`, short `label`, `square` (A1 etc.), `icon`, `faction`, optional `size` (default 1), `statuses` (array), optional player-known `hp` string and `elevation_ft`.
- For `size:2`, the square anchors the upper-left of a 2×2 footprint. Entire footprint must fit on the grid.
- Icons: `styke`, `vesper`, `valeria`, `ogre`, `soldier`, `boggard`, `undead`, `mage`, `beast`, `unknown`. These are permanent symbolic graphics, not character portraits. Replace the relevant SVG asset later for a permanent visual upgrade.
- Factions: `party`, `ally`, `hostile`, `neutral`, `unknown`.
- Statuses: `hidden`/`invisible`/`stealth` = player-known figure is hidden in fiction; `down` = incapacitated; `dead` = dead. Other player-visible statuses appear in the detail panel. Absence of a status removes it; these are full snapshots, not partial deltas.
- Geometry uses zero-based field units. Cell A1 spans x=0..1, y=0..1. Walls use grid-boundary points (`from:[x,y]`, `to:[x,y]`) and can be diagonal. Geometry allows fractional field units.
- Terrain rectangles: `type`, `x`, `y`, `w`, `h`. Types: `floor`, `water`, `grass`, `rubble`, `void`, `road`.
- Markers: `type`, `x`, `y`, optional `w`, `h` (defaults 1), `rotation` in degrees; door `open:true` changes display opacity. Types: `crate`, `tree`, `rock`, `fire`, `door`, `stairs`, `pillar`, `chest`. For door openings, omit the corresponding wall segment; the renderer does not cut holes automatically.
- Optional background: `map.asset` repository-relative image path or HTTPS URL, optional `map.asset_revision` for updated contents at the same path. Leave out `asset` for image-free maps. Keep terrain arrays empty when they would cover the image.
- Existing Cartographer `schema_version:1` raster-map payloads remain supported. Schema 2 should be used for image-free maps.

## Disclosure boundary

Every byte in this repository is PUBLIC. Only accepted player-visible geometry and tokens may be published. Omit unrevealed actors, secret doors, hidden features, campaign state, quest files, source references and private GM notes entirely; `visible:false` is NOT a privacy boundary in a public JSON file. Filtering in the display is merely defensive. Keep authoritative campaign truth in private `danceofruin/wotwGPT`. This repository is a display projection, not a second campaign canon or rules engine.

## Files

- `index.html`, `styles.css`, `app.js`, `model.mjs`: static client and validation.
- `state.json`: live state, initially idle.
- `demo.json`: explicitly non-canonical standalone example.
- `assets/tokens/`, `assets/markers/`: reusable SVG graphics.
- `maps/`: optional player-safe background images.

# WotW Live Map

Player-safe browser battlemap: https://danceofruin.github.io/wotw-live-map/

The page reads public `state.json` every two seconds while visible. Token movement needs only one state update, no image rendering. GitHub raw-content caching can delay updates; two seconds is the polling interval, not a delivery guarantee. Background polling pauses in hidden tabs. Client changes deploy through GitHub Pages (`main`, repository root).

## Use

Open the page or the HUD's Live-Karte button. Click **Demo** to test the standalone training room without changing live campaign state. Raster, coordinates, zoom and fullscreen are local controls. Click tokens for details. The JSON preview is local and never writes to GitHub. The live view is read-only: the GM owns accepted movement.

## Kartenverlauf

**Älter** opens the latest saved active map, then steps backward through published snapshots. **Neuer** steps toward the latest saved map. Use the selector to jump directly, **Weitere Stände laden** to load another history page, and **Zur Live-Karte** to resume live polling. History mode pauses polling, so a live update cannot replace the map being inspected. Idle/end-of-encounter snapshots are skipped. Dates in the selector identify publication time, not campaign calendar time.

The client reads the public GitHub commit history of `state.json` and fetches each snapshot at its immutable commit SHA. Repository-relative background assets use the same commit. No extra archive writes or private campaign retrieval are needed. This is the history of published updates, not an action-by-action replay. The public GitHub API's unauthenticated request limit can temporarily prevent loading the history list; live polling remains available.

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



## Horn-Atlas

**Horn-Atlas** opens prepared empty base maps. Select environment, lower caverns, Levels1–3 or Sanctum; **Aktuell** preserves current structural state (2-1 closed,3-1 passable), while **Ausbauplan** shows proposed doors/closures/table placement and the corrected bath drain. This is a local read-only viewing mode: it pauses live polling and does not write or replace `state.json`. **Zur Live-Karte** returns to the real encounter. The environment is contextual preparation, not a surveyed clearing or proof of forest line of sight.

For encounter crops, retain global frame metadata: `grid.offset_x`/`offset_y` are nonnegative integer field offsets. Published tokens still carry local `square`; the website derives and displays their global squares. A framing change cannot move an actor. An omitted offset means zero for existing schema1/2 maps. Maximum display240x240 is used by the full environment; supported limit400 per axis. Terrain additionally supports `forest`; `map.labels` contains only player-safe `{x,y,text}` labels; `map.lines` contains nonopaque display lines `{from,to,kind}` with `service` (blue dashed) or `low_wall` (muted solid). These lines are not automatic rules/LOS adjudication. `table` is an additional marker icon. Empty templates under `atlas/` contain no private campaign/source text, hidden actors, future event data or authoritative current patrols. Map history remains the history of actual `state.json` updates.

The deployed client uses immutable-named `app-atlas-v5.js` / `model-atlas-v5.mjs` copies of the app/model sources, preventing stale model code from breaking new atlas fields. Future client changes must regenerate and version these paired deployment files.

Atlas display snapshots use immutable `atlas/prepared-v3/` paths selected by the catalogue `asset_root`; this avoids serving older geometry/labels during raw-file cache turnover. Increment that asset directory for a future prepared base revision.



### Geometry repair · 2026-10-14
Floor surfaces use clipped polygons, preserving diagonal edges without row-sampling gaps. Doors are explicit endpoint segments in `map.doors`, aligned to cut wall openings; ordinary single doors are 5 ft wide. Open arches remain unobstructed. The bedroom opens north to the courtyard, the bath anteroom uses its diagonal doorway, and the six cells have physical partitions. The already discovered library access and conditional pocket-vault portal are visible; a portal does not imply ordinary traversable adjacency. Current and planned construction remain separate.

## Prepared geometry and portcullises (client v5)

The v5 app/model pair loads `atlas/prepared-v3/`. Registered Horn combat geometry comes from the private atlas export, with current construction reconciled once and global offsets preserved. The public payload contains only known geometry/actors, never private sources or construction rationale. Public `state.json` is preserved byte-for-byte during this client/atlas migration, including any newer accepted live scene.

Schema2 `map.doors` accepts `kind:"portcullis"`, stable `id`, fixed `from`/`to`, metal `material` and `state:"raised"|"lowered"|"destroyed"|"under_construction"`. State controls appearance, not endpoints, corridor shape or terrain. A lowered gate draws a thin rail with bars; raised/destroyed/unfinished gates have distinct broken-line styles and tooltip. Existing doors/portals and legacy `open` remain compatible. Geometry alone does not adjudicate movement, cover or LOS.

`?atlas=horn-level-1&view=entry` opens the empty registered entry preview. The atlas view selector offers the full floor or entrance crop; neither changes the active live encounter. The empty current floor has built gates raised; the private accepted-scene fixture checks both lowered without resuming combat.

### Atlas-Eingang und Props (Client v6, prepared-v4)

Level1's entry/Left Eye has two position-locked gates, a symbolic audible Alarm icon (no asserted trigger radius), twelve arrow slits, schematic guard-side levers and furnishings. Gates/walls/doors and live `state.json` are unchanged. **Einrichtung** and **Raumnamen** toggle fixtures and labels separately. Icons are decorative/approximate, not new loot, obstacles, cover or trap boundaries. New types: bed, barrel, shelf, rack, lever, anvil, alarm. Versioned client/model are `app-atlas-v6.js` / `model-atlas-v6.mjs`; immutable previews use `atlas/prepared-v4/` after catalogue activation.

### Horn Level-One lighting and furnishing (client v7, prepared-v5)

The complete Level-One Atlas contains 91 source-map base props plus the Jurak dining table in the current variant, 33 labelled torch/lantern sources, and the source-confirmed fountain, original entry half-wall and corrected existing door 1-13 ↔ 1-27. Movable props have stable `id`, `state`, `tactical` and `cover_candidate` fields; `possible` never grants automatic PF1e cover or blocked movement. All individual state updates (doors, lights, furnishings) require accepted GM scene `feature_states` and a fresh private `exportScene`; browser toggles change display only.

`map.lights` carries light positions, source type, current state and bright/dim radii. `map.lighting.rows` is a complete local square grid encoded as digit strings: `0` dark, `1` dim, `2` normal. Wall and closed opaque door occlusion is baked by the private exporter for the selected `workday`, `night_watch` or `blackout` scene profile. For Horn L1, the scene exporter requires an explicit profile, so the runner cannot accidentally assume the display-only default. Rays through narrow arrow slits, height, exceptional conditions and PF1e sight/cover remain GM judgments. Atlas browsing is purely a preview and does not declare an in-world torch permanently burning.

Use **Beleuchtung** to show/hide the prepared light shading independently of **Einrichtung** and **Raumnamen**. Prepared-v5 snapshots are immutable, older folders remain, and the live `state.json` is not altered by atlas work.

### Live prop lifecycle (renderer v8)
The v8 map client visually distinguishes `broken` fixtures, with their stable IDs retained. `removed` fixtures disappear from the exported scene entirely; moved minor props retain their IDs at `prop_positions`-resolved locations. These are changes only after accepted GM adjudication, never speculative client writes. Brightness and door/gate state remain independent of furniture display toggles.


## Dice log disabled (client v10)

The player prioritizes speed. Dice are verified through the actual Python execution trace and a temporary private project-local log. Do not project dice into public state, fetch private receipts, or publish log-only map changes. The client has no dice panel and ignores legacy roll_log fields in archived snapshots. Historical private receipts and immutable old client files remain untouched. Normal accepted geometry/token/status updates and map history continue unchanged. Deployment uses app-atlas-v10.js / model-atlas-v10.mjs without the roll-log module.

## Executable publication validation

Before publishing a complete candidate snapshot, run `node validate-state.mjs candidate-state.json model-atlas-v12.mjs`. Use the model actually imported by the deployed app when client versions change. The helper runs the browser's own `normalize`, not a duplicate schema. A failed check blocks publication; keep the last valid live state. The marker catalogue is exported as `MARKERS` by that model; the bell uses `alarm`, not `bell`.

The v12 client distinguishes invalid map data from a failed network request, identifies unsupported marker types and preserves the currently displayed valid map on rejected updates. Run `node test-live-validation.mjs` for startup/update/recovery regression checks. The current deployed pair is `app-atlas-v12.js` / `model-atlas-v12.mjs`.

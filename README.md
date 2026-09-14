# WotW Live Map

Player-safe live tactical map for the private Way of the Wicked campaign repository.

This repository is intentionally public. It must contain only player-visible map assets and the player-safe `state.json` projection produced by Cartographer. Never copy campaign state, quest files, GM renders, hidden tokens, source references, or unrevealed geometry here.

## GitHub Pages

Enable Pages once in repository Settings:

- Source: Deploy from a branch
- Branch: `main`
- Folder: `/ (root)`

Stable page URL:

`https://danceofruin.github.io/wotw-live-map/`

The page itself is static. While open, it polls the raw `state.json` from this repository every two seconds with cache busting. Normal token and status updates therefore do not need to wait for a Pages rebuild.

## Public contract

- `index.html`, `app.js`, `styles.css`: static display client
- `state.json`: current player-safe tactical projection
- `maps/<scene-id>/base.<ext>`: player-safe base artwork

`state.json` is idle until Cartographer activates a mapped scene.

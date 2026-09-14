(() => {
  'use strict';

  const POLL_MS = 2000;
  const STALE_MS = 120000;
  const RAW_ROOT = 'https://raw.githubusercontent.com/danceofruin/wotw-live-map/main/';
  const stateUrl = `${RAW_ROOT}state.json`;

  const els = {
    title: document.getElementById('scene-title'),
    connection: document.getElementById('connection'),
    updated: document.getElementById('updated-at'),
    revision: document.getElementById('revision'),
    empty: document.getElementById('empty-state'),
    stage: document.getElementById('stage'),
    image: document.getElementById('base-map'),
    overlay: document.getElementById('overlay'),
    detail: document.getElementById('token-detail'),
    gridToggle: document.getElementById('grid-toggle'),
    coordsToggle: document.getElementById('coords-toggle'),
    fullscreenToggle: document.getElementById('fullscreen-toggle')
  };

  let current = null;
  let showGrid = true;
  let showCoords = false;
  let timer = null;
  const positions = new Map();

  function setConnection(kind, text) {
    els.connection.className = `connection ${kind || ''}`.trim();
    els.connection.textContent = text;
  }

  function letters(index) {
    let n = index + 1;
    let out = '';
    while (n > 0) {
      const r = (n - 1) % 26;
      out = String.fromCharCode(65 + r) + out;
      n = Math.floor((n - 1) / 26);
    }
    return out;
  }

  function svgNode(tag, attrs = {}) {
    const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    return node;
  }

  function drawGrid(state) {
    const grid = state.map.grid;
    if (!showGrid || grid.baked_in_base) return;
    const group = svgNode('g', { id: 'grid-layer' });
    const x0 = grid.origin_px.x;
    const y0 = grid.origin_px.y;
    const x1 = x0 + grid.columns * grid.cell_px.width;
    const y1 = y0 + grid.rows * grid.cell_px.height;

    for (let c = 0; c <= grid.columns; c++) {
      const x = x0 + c * grid.cell_px.width;
      group.appendChild(svgNode('line', { x1: x, y1: y0, x2: x, y2: y1, class: 'grid-line' }));
    }
    for (let r = 0; r <= grid.rows; r++) {
      const y = y0 + r * grid.cell_px.height;
      group.appendChild(svgNode('line', { x1: x0, y1: y, x2: x1, y2: y, class: 'grid-line' }));
    }
    els.overlay.appendChild(group);
  }

  function drawCoords(state) {
    if (!showCoords) return;
    const grid = state.map.grid;
    const group = svgNode('g', { id: 'coord-layer' });
    const fontOffset = Math.max(10, Math.min(grid.cell_px.width, grid.cell_px.height) * 0.20);

    for (let c = 0; c < grid.columns; c++) {
      const x = grid.origin_px.x + (c + 0.5) * grid.cell_px.width;
      const y = grid.origin_px.y + fontOffset;
      const t = svgNode('text', { x, y, class: 'coord-label', 'text-anchor': 'middle' });
      t.textContent = letters(c);
      group.appendChild(t);
    }
    for (let r = 0; r < grid.rows; r++) {
      const x = grid.origin_px.x + 4;
      const y = grid.origin_px.y + (r + 0.5) * grid.cell_px.height + 4;
      const t = svgNode('text', { x, y, class: 'coord-label' });
      t.textContent = String(r + 1);
      group.appendChild(t);
    }
    els.overlay.appendChild(group);
  }

  function tokenCenter(token, grid) {
    const size = token.size || 1;
    return {
      x: grid.origin_px.x + (token.col + size / 2) * grid.cell_px.width,
      y: grid.origin_px.y + (token.row + size / 2) * grid.cell_px.height
    };
  }

  function showTokenDetail(token) {
    const statuses = token.statuses?.length ? token.statuses.join(', ') : 'none';
    const elevation = Number(token.elevation_ft || 0);
    els.detail.innerHTML = `<strong>${escapeHtml(token.name || token.label || token.id)}</strong>` +
      `${escapeHtml(token.square)} · ${escapeHtml(token.faction || 'unknown')}<br>` +
      `Status: ${escapeHtml(statuses)}${elevation ? `<br>Elevation: ${elevation} ft` : ''}`;
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function drawTokens(state, previousState) {
    const grid = state.map.grid;
    const group = svgNode('g', { id: 'token-layer' });
    const previous = new Map((previousState?.tokens || []).map(t => [t.id, t]));

    for (const token of state.tokens || []) {
      const center = tokenCenter(token, grid);
      const footprint = Math.min(grid.cell_px.width, grid.cell_px.height) * (token.size || 1);
      const radius = Math.max(12, footprint * 0.34);
      const g = svgNode('g', { class: 'token', 'data-token-id': token.id });
      g.style.transform = `translate(${center.x}px, ${center.y}px)`;

      const prev = previous.get(token.id);
      const changed = prev && (prev.square !== token.square || JSON.stringify(prev.statuses || []) !== JSON.stringify(token.statuses || []));
      if (changed) g.classList.add('changed');

      g.appendChild(svgNode('circle', {
        cx: 0,
        cy: 0,
        r: radius,
        class: 'body',
        fill: token.color || '#7c3aed'
      }));

      const label = svgNode('text', { x: 0, y: 1, class: 'label' });
      label.textContent = token.label || '?';
      g.appendChild(label);

      if (token.statuses?.length) {
        const dot = svgNode('circle', {
          cx: radius * 0.68,
          cy: -radius * 0.68,
          r: Math.max(4, radius * 0.18),
          class: 'status-dot',
          fill: '#f8fafc'
        });
        g.appendChild(dot);
      }

      g.addEventListener('click', () => showTokenDetail(token));
      group.appendChild(g);
      positions.set(token.id, center);
    }
    els.overlay.appendChild(group);
  }

  async function ensureImage(state, previousState) {
    const asset = state.map.asset;
    const changed = !previousState || previousState.map?.asset !== asset || els.image.getAttribute('src') !== asset;
    if (!changed && els.image.complete) return;

    await new Promise((resolve, reject) => {
      els.image.onload = () => resolve();
      els.image.onerror = () => reject(new Error('Base map failed to load'));
      const resolvedAsset = /^https?:\/\//i.test(asset) ? asset : `${RAW_ROOT}${String(asset).replace(/^\/+/, '')}`;
      els.image.src = `${resolvedAsset}${resolvedAsset.includes('?') ? '&' : '?'}rev=${encodeURIComponent(state.revision)}`;
    });
  }

  async function render(state) {
    if (!state.active) {
      current = state;
      els.stage.hidden = true;
      els.empty.hidden = false;
      els.title.textContent = state.title || 'Live tactical map';
      els.updated.textContent = state.generated_at ? new Date(state.generated_at).toLocaleString() : 'never';
      els.revision.textContent = state.revision || '-';
      return;
    }

    const previousState = current;
    await ensureImage(state, previousState);
    current = state;

    els.empty.hidden = true;
    els.stage.hidden = false;
    els.title.textContent = state.title || state.scene_id || 'Live tactical map';
    els.updated.textContent = new Date(state.generated_at).toLocaleString();
    els.revision.textContent = state.revision;

    els.overlay.setAttribute('viewBox', `0 0 ${state.map.width_px} ${state.map.height_px}`);
    els.overlay.replaceChildren();
    drawGrid(state);
    drawCoords(state);
    drawTokens(state, previousState);
  }

  async function poll() {
    try {
      const response = await fetch(`${stateUrl}?t=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const next = await response.json();
      if (!current || next.revision !== current.revision || next.active !== current.active) await render(next);

      if (next.generated_at) {
        const age = Date.now() - new Date(next.generated_at).getTime();
        setConnection(age > STALE_MS ? 'stale' : 'live', age > STALE_MS ? 'stale' : 'live');
      } else {
        setConnection('', 'ready');
      }
    } catch (error) {
      console.error(error);
      setConnection('error', 'offline');
    } finally {
      clearTimeout(timer);
      timer = setTimeout(poll, POLL_MS);
    }
  }

  els.gridToggle.setAttribute('aria-pressed', String(showGrid));
  els.coordsToggle.setAttribute('aria-pressed', String(showCoords));
  els.gridToggle.addEventListener('click', () => {
    showGrid = !showGrid;
    els.gridToggle.setAttribute('aria-pressed', String(showGrid));
    if (current?.active) render(current);
  });
  els.coordsToggle.addEventListener('click', () => {
    showCoords = !showCoords;
    els.coordsToggle.setAttribute('aria-pressed', String(showCoords));
    if (current?.active) render(current);
  });
  els.fullscreenToggle.addEventListener('click', async () => {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
    else await document.exitFullscreen();
  });

  poll();
})();

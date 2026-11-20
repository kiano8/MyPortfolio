(function () {
  'use strict';

  /* ── Capability & Low-Spec Detection ── */
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;
  const lowCores = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4;
  const lowMemory = navigator.deviceMemory && navigator.deviceMemory <= 4;
  const isLowSpec = prefersReducedMotion || isTouchDevice || lowCores || lowMemory;

  // Use slightly larger cell spacing on low-spec devices to halve dot count
  const CELL   = isLowSpec ? 28 : 20;
  const RADIUS = isLowSpec ? 115 : (40 + (200 - 40) * 0.65); // ~149
  const SPEED  = 1 + (10 - 1) * 0.45;                        // ~5.05
  const EASE   = 0.12 + SPEED * 0.01;
  const TAU    = Math.PI * 2;

  /* ── Create Canvas ── */
  const canvas = document.createElement('canvas');
  Object.assign(canvas.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100%',
    height: '100%',
    zIndex: '-1',
    display: 'block',
    pointerEvents: 'none',
  });
  document.body.prepend(canvas);

  const ctx = canvas.getContext('2d', { alpha: false });
  // Offscreen canvas for static background + grid lines
  const bgCanvas = document.createElement('canvas');
  const bgCtx = bgCanvas.getContext('2d', { alpha: false });

  let dpr = 1;
  let W = 0, H = 0;
  let dots = [];
  let activeIndices = new Set();
  let mouse = { x: -9999, y: -9999 };
  let isRunning = false;
  let isCanvasVisible = true;

  function getDpr() {
    const raw = window.devicePixelRatio || 1;
    return isLowSpec ? 1 : Math.min(raw, 1.5);
  }

  function renderGrid() {
    bgCanvas.width = W;
    bgCanvas.height = H;

    bgCtx.fillStyle = '#000000';
    bgCtx.fillRect(0, 0, W, H);

    bgCtx.strokeStyle = 'rgba(255,255,255,0.06)';
    bgCtx.lineWidth = 0.5 * dpr;

    const step = CELL * dpr;
    const rows = Math.ceil(H / step);
    const cols = Math.ceil(W / step);

    // Batch all grid lines into a single path & stroke call
    bgCtx.beginPath();
    for (let row = 0; row <= rows; row++) {
      const y = row * step;
      bgCtx.moveTo(0, y);
      bgCtx.lineTo(W, y);
    }
    for (let col = 0; col <= cols; col++) {
      const x = col * step;
      bgCtx.moveTo(x, 0);
      bgCtx.lineTo(x, H);
    }
    bgCtx.stroke();

    // Also pre-draw static resting dots onto bgCanvas so idle dots cost 0 draw calls
    const baseRad = 1 * dpr;
    bgCtx.fillStyle = 'rgba(255,255,255,0.5)';
    bgCtx.beginPath();
    for (let i = 0; i < dots.length; i++) {
      const d = dots[i];
      bgCtx.moveTo(d.ox + baseRad, d.oy);
      bgCtx.arc(d.ox, d.oy, baseRad, 0, TAU);
    }
    bgCtx.fill();
  }

  function initDots() {
    dots = [];
    activeIndices.clear();
    const step = CELL * dpr;
    const cols = Math.ceil(W / step);
    const rows = Math.ceil(H / step);
    for (let r = 0; r <= rows; r++) {
      const oy = r * step;
      for (let c = 0; c <= cols; c++) {
        const ox = c * step;
        dots.push({ ox, oy, x: ox, y: oy });
      }
    }
  }

  function resize() {
    dpr = getDpr();
    const newW = Math.round(window.innerWidth * dpr);
    const newH = Math.round(window.innerHeight * dpr);
    if (newW === W && newH === H) return;
    W = canvas.width = newW;
    H = canvas.height = newH;
    initDots();
    renderGrid();
    drawStaticFrame();
  }

  function drawStaticFrame() {
    ctx.drawImage(bgCanvas, 0, 0);
  }

  function requestTick() {
    if (!isRunning && isCanvasVisible && !document.hidden && !prefersReducedMotion) {
      isRunning = true;
      requestAnimationFrame(draw);
    }
  }

  /* ── Pointer Tracking (No getBoundingClientRect reflows needed for fixed top:0/left:0 canvas) ── */
  if (!prefersReducedMotion) {
    window.addEventListener('mousemove', (e) => {
      mouse.x = e.clientX * dpr;
      mouse.y = e.clientY * dpr;
      requestTick();
    }, { passive: true });

    document.addEventListener('mouseleave', () => {
      mouse.x = -9999;
      mouse.y = -9999;
      requestTick();
    }, { passive: true });

    if (!isTouchDevice) {
      window.addEventListener('touchmove', (e) => {
        if (e.touches && e.touches[0]) {
          mouse.x = e.touches[0].clientX * dpr;
          mouse.y = e.touches[0].clientY * dpr;
          requestTick();
        }
      }, { passive: true });

      window.addEventListener('touchend', () => {
        mouse.x = -9999;
        mouse.y = -9999;
        requestTick();
      }, { passive: true });
    }
  }

  // Pause canvas when tab is backgrounded
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && activeIndices.size > 0) {
      requestTick();
    }
  });

  // Expose visibility setter so script.js scroll loop can pause canvas when opaque sections cover it
  window.__setBgCanvasVisible = function (visible) {
    if (isCanvasVisible === visible) return;
    isCanvasVisible = visible;
    if (visible && activeIndices.size > 0) {
      requestTick();
    }
  };

  let resizeTimer = null;
  window.addEventListener('resize', () => {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 120);
  }, { passive: true });

  resize();

  function draw() {
    if (!isCanvasVisible || document.hidden) {
      isRunning = false;
      return;
    }

    const r = RADIUS * dpr;
    const rSq = r * r;
    const step = CELL * dpr;
    const cols = Math.ceil(W / step) + 1;
    const rows = Math.ceil(H / step) + 1;

    // Blit pre-rendered grid + static dots in one fast GPU copy
    ctx.drawImage(bgCanvas, 0, 0);

    // Find dots near the current mouse position using spatial grid bounds (O(1) neighborhood instead of O(N) full scan)
    if (mouse.x > -1000 && mouse.y > -1000) {
      const minCol = Math.max(0, Math.floor((mouse.x - r) / step));
      const maxCol = Math.min(cols - 1, Math.ceil((mouse.x + r) / step));
      const minRow = Math.max(0, Math.floor((mouse.y - r) / step));
      const maxRow = Math.min(rows - 1, Math.ceil((mouse.y + r) / step));

      for (let row = minRow; row <= maxRow; row++) {
        const rowOffset = row * cols;
        for (let col = minCol; col <= maxCol; col++) {
          const idx = rowOffset + col;
          if (idx >= 0 && idx < dots.length) {
            activeIndices.add(idx);
          }
        }
      }
    }

    if (activeIndices.size === 0) {
      isRunning = false;
      return;
    }

    const eraseRad = 1.6 * dpr;
    ctx.fillStyle = '#000000';
    ctx.beginPath();

    // First pass: update physics for active dots & mask out their static resting dot on the background
    const stillActive = [];
    activeIndices.forEach((idx) => {
      const d = dots[idx];
      if (!d) {
        activeIndices.delete(idx);
        return;
      }

      const dx = mouse.x - d.ox;
      const dy = mouse.y - d.oy;
      const distSq = dx * dx + dy * dy;
      let tx = d.ox;
      let ty = d.oy;

      if (distSq < rSq && distSq > 0) {
        const dist = Math.sqrt(distSq);
        const inf = 1 - dist / r;
        const angle = Math.atan2(dy, dx) + Math.PI * 0.5;
        const push = inf * r * 0.3;
        tx = d.ox + Math.cos(angle) * push;
        ty = d.oy + Math.sin(angle) * push;
      }

      d.x += (tx - d.x) * EASE;
      d.y += (ty - d.y) * EASE;

      const settled = Math.abs(d.x - d.ox) < 0.08 && Math.abs(d.y - d.oy) < 0.08 && distSq >= rSq;
      if (settled) {
        d.x = d.ox;
        d.y = d.oy;
        activeIndices.delete(idx);
      } else {
        // Erase the static dot at (ox, oy)
        ctx.moveTo(d.ox + eraseRad, d.oy);
        ctx.arc(d.ox, d.oy, eraseRad, 0, TAU);
        stillActive.push(d);
      }
    });
    ctx.fill();

    // Second pass: draw displaced/glowing dots without slow ctx.shadowBlur
    for (let i = 0; i < stillActive.length; i++) {
      const d = stillActive[i];
      const mx = d.x - mouse.x;
      const my = d.y - mouse.y;
      const mdSq = mx * mx + my * my;
      const prox = mdSq < rSq ? (1 - Math.sqrt(mdSq) / r) : 0;
      const coreRad = (1 + prox * 2) * dpr;

      // Fast simulated glow halo instead of expensive ctx.shadowBlur
      if (!isLowSpec && prox > 0.08) {
        ctx.beginPath();
        ctx.arc(d.x, d.y, coreRad * 2.4, 0, TAU);
        ctx.fillStyle = `rgba(255,255,255,${(prox * 0.16).toFixed(3)})`;
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(d.x, d.y, coreRad, 0, TAU);
      ctx.fillStyle = `rgba(255,255,255,${(0.5 + prox * 0.5).toFixed(3)})`;
      ctx.fill();
    }

    if (activeIndices.size > 0) {
      requestAnimationFrame(draw);
    } else {
      isRunning = false;
    }
  }
})();
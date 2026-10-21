(function () {
  const CELL   = 20;
  const RADIUS = 40 + (200 - 40) * 0.65;  // ~149
  const GLOW   = 5;
  const SPEED  = 1 + (10 - 1) * 0.45;     // ~5.05
  const EASE   = 0.12 + SPEED * 0.01;

  /* ── create canvas ── */
  const canvas = document.createElement('canvas');
  Object.assign(canvas.style, {
    position: 'fixed',
    top: '0', left: '0',
    width: '100%', height: '100%',
    zIndex: '-1',
    display: 'block',
    cursor: 'none',
    pointerEvents: 'none',
  });
  document.body.prepend(canvas);

  /* re-enable pointer events on canvas only for mouse tracking */
  canvas.style.pointerEvents = 'all';

  const ctx = canvas.getContext('2d');
  let W, H, dots = [];
  let mouse = { x: -9999, y: -9999 };
  let animId;

  function toCanvas(ex, ey) {
    const dpr  = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    return { x: (ex - rect.left) * dpr, y: (ey - rect.top) * dpr };
  }

  function initDots(dpr) {
    dots = [];
    const cols = Math.ceil(W / (CELL * dpr));
    const rows = Math.ceil(H / (CELL * dpr));
    for (let r = 0; r <= rows; r++) {
      for (let c = 0; c <= cols; c++) {
        dots.push({
          ox: c * CELL * dpr, oy: r * CELL * dpr,
          x:  c * CELL * dpr, y:  r * CELL * dpr,
        });
      }
    }
  }

  function resize() {
    const dpr  = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    W = canvas.width  = rect.width  * dpr;
    H = canvas.height = rect.height * dpr;
    initDots(dpr);
  }

  canvas.addEventListener('mousemove',  e => { mouse = toCanvas(e.clientX, e.clientY); });
  canvas.addEventListener('mouseleave', ()  => { mouse = { x: -9999, y: -9999 }; });
  canvas.addEventListener('touchmove',  e => { e.preventDefault(); mouse = toCanvas(e.touches[0].clientX, e.touches[0].clientY); }, { passive: false });
  canvas.addEventListener('touchend',   ()  => { mouse = { x: -9999, y: -9999 }; });

  /* also track mouse across the whole document so it works over content */
  document.addEventListener('mousemove', e => { mouse = toCanvas(e.clientX, e.clientY); });

  new ResizeObserver(resize).observe(document.body);
  resize();

  function draw() {
    const dpr = window.devicePixelRatio || 1;
    const r   = RADIUS * dpr;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    /* grid lines */
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth   = 0.5 * dpr;
    const rows = Math.ceil(H / (CELL * dpr));
    const cols = Math.ceil(W / (CELL * dpr));
    for (let row = 0; row <= rows; row++) {
      ctx.beginPath(); ctx.moveTo(0, row * CELL * dpr); ctx.lineTo(W, row * CELL * dpr); ctx.stroke();
    }
    for (let col = 0; col <= cols; col++) {
      ctx.beginPath(); ctx.moveTo(col * CELL * dpr, 0); ctx.lineTo(col * CELL * dpr, H); ctx.stroke();
    }

    /* dots */
    for (let i = 0; i < dots.length; i++) {
      const d  = dots[i];
      const dx = mouse.x - d.ox;
      const dy = mouse.y - d.oy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const inf  = Math.max(0, 1 - dist / r);
      let tx = d.ox, ty = d.oy;

      if (dist < r && dist > 0) {
        const angle = Math.atan2(dy, dx) + Math.PI * 0.5;
        tx = d.ox + Math.cos(angle) * inf * r * 0.3;
        ty = d.oy + Math.sin(angle) * inf * r * 0.3;
      }

      d.x += (tx - d.x) * EASE;
      d.y += (ty - d.y) * EASE;

      const mx   = d.x - mouse.x;
      const my   = d.y - mouse.y;
      const md   = Math.sqrt(mx * mx + my * my);
      const prox = Math.max(0, 1 - md / r);

      ctx.shadowBlur  = prox > 0.05 ? GLOW * 4 * dpr : 0;
      ctx.shadowColor = `rgba(255,255,255,${prox * 0.8})`;

      ctx.beginPath();
      ctx.arc(d.x, d.y, (1 + prox * 2) * dpr, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${0.5 + prox * 0.5})`;
      ctx.fill();
    }

    ctx.shadowBlur = 0;
    animId = requestAnimationFrame(draw);
  }

  draw();
})();
// Hero floating cards — drag to send them drifting around like soap bubbles.
export function setupCardPhysics() {
  const heroEl = document.querySelector('.hero');
  if (!heroEl) return;
  const cards = heroEl.querySelectorAll('.hero-cards .float-card');
  if (!cards.length) return;

  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const reduceMotion = () => motionQuery.matches;

  // Soap-bubble tuning
  const VELOCITY_SCALE = 7;     // softer flick (was 16)
  const DECAY = 0.985;          // longer drift (was 0.965)
  const WALL_BOUNCE = 0.55;     // gentler wall hit (was 0.72)
  const STOP_EPS = 0.04;        // settle threshold (was 0.12)

  cards.forEach(card => {
    let tx = 0, ty = 0;
    let vx = 0, vy = 0;
    let isDragging = false;
    let raf = 0;
    let lastX = 0, lastY = 0, lastT = 0;
    let pointerId = null;
    let baseLeft = 0, baseTop = 0, baseW = 0, baseH = 0;

    function captureBase() {
      const r = card.getBoundingClientRect();
      const h = heroEl.getBoundingClientRect();
      baseLeft = r.left - h.left - tx;
      baseTop = r.top - h.top - ty;
      baseW = r.width;
      baseH = r.height;
    }

    function setOffset() {
      card.style.setProperty('--tx', tx + 'px');
      card.style.setProperty('--ty', ty + 'px');
    }

    function clampToWalls(heroR) {
      const minTx = -baseLeft;
      const maxTx = heroR.width - baseLeft - baseW;
      const minTy = -baseTop;
      const maxTy = heroR.height - baseTop - baseH;
      if (tx < minTx) { tx = minTx; vx = -vx * WALL_BOUNCE; }
      if (tx > maxTx) { tx = maxTx; vx = -vx * WALL_BOUNCE; }
      if (ty < minTy) { ty = minTy; vy = -vy * WALL_BOUNCE; }
      if (ty > maxTy) { ty = maxTy; vy = -vy * WALL_BOUNCE; }
    }

    function bounceStep() {
      const heroR = heroEl.getBoundingClientRect();
      tx += vx;
      ty += vy;
      clampToWalls(heroR);
      vx *= DECAY;
      vy *= DECAY;
      setOffset();
      if (Math.abs(vx) < STOP_EPS && Math.abs(vy) < STOP_EPS) {
        vx = 0; vy = 0;
        raf = 0;
        return;
      }
      raf = requestAnimationFrame(bounceStep);
    }

    card.addEventListener('pointerdown', e => {
      if (e.button !== undefined && e.button !== 0) return;
      e.preventDefault();
      isDragging = true;
      pointerId = e.pointerId;
      try { card.setPointerCapture(pointerId); } catch (err) { /* ignore */ }
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      card.classList.add('is-dragging', 'has-physics');
      captureBase();
      lastX = e.clientX;
      lastY = e.clientY;
      lastT = performance.now();
      vx = 0; vy = 0;
      card.style.zIndex = '5';
    });

    card.addEventListener('pointermove', e => {
      if (!isDragging) return;
      const now = performance.now();
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      const dt = Math.max(1, now - lastT);
      tx += dx;
      ty += dy;
      // Soap-bubble velocity (much gentler than 16x/frame)
      vx = (dx / dt) * VELOCITY_SCALE;
      vy = (dy / dt) * VELOCITY_SCALE;
      lastX = e.clientX;
      lastY = e.clientY;
      lastT = now;
      const heroR = heroEl.getBoundingClientRect();
      clampToWalls(heroR);
      setOffset();
    });

    function endDrag() {
      if (!isDragging) return;
      isDragging = false;
      if (pointerId != null) {
        try { card.releasePointerCapture(pointerId); } catch (err) { /* ignore */ }
      }
      pointerId = null;
      card.classList.remove('is-dragging');
      const v2 = vx * vx + vy * vy;
      if (!reduceMotion() && v2 > 0.04) {
        raf = requestAnimationFrame(bounceStep);
      } else {
        vx = 0; vy = 0;
      }
    }

    card.addEventListener('pointerup', endDrag);
    card.addEventListener('pointercancel', endDrag);
    card.addEventListener('lostpointercapture', endDrag);
  });

  // On resize, clamp any displaced card back into the hero bounds
  let resizeRaf = 0;
  window.addEventListener('resize', () => {
    if (resizeRaf) return;
    resizeRaf = requestAnimationFrame(() => {
      resizeRaf = 0;
      const heroR = heroEl.getBoundingClientRect();
      cards.forEach(card => {
        if (!card.classList.contains('has-physics')) return;
        const r = card.getBoundingClientRect();
        let dx = 0, dy = 0;
        if (r.left < heroR.left) dx = heroR.left - r.left;
        if (r.right > heroR.right) dx = heroR.right - r.right;
        if (r.top < heroR.top) dy = heroR.top - r.top;
        if (r.bottom > heroR.bottom) dy = heroR.bottom - r.bottom;
        if (dx || dy) {
          const cur = card.style.getPropertyValue('--tx');
          const cury = card.style.getPropertyValue('--ty');
          card.style.setProperty('--tx', (parseFloat(cur) || 0) + dx + 'px');
          card.style.setProperty('--ty', (parseFloat(cury) || 0) + dy + 'px');
        }
      });
    });
  }, { passive: true });
}

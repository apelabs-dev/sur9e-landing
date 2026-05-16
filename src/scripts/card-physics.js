// Hero floating cards — drag to send them drifting; cards collide with each
// other and bounce on contact. Single shared tick loop handles motion,
// pairwise AABB collisions, and wall clamping.
export function setupCardPhysics() {
  const heroEl = document.querySelector('.hero');
  if (!heroEl) return;
  const cards = Array.from(heroEl.querySelectorAll('.hero-cards .float-card'));
  if (!cards.length) return;

  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const reduceMotion = () => motionQuery.matches;

  // Soap-bubble tuning
  const VELOCITY_SCALE = 7;
  const DECAY = 0.985;
  const WALL_BOUNCE = 0.55;
  const STOP_EPS = 0.04;
  const CARD_BOUNCE = 0.75; // elastic-ish; 0 = inelastic, 1 = perfectly elastic

  // Per-card state. Cards drift via CSS keyframes until the first
  // pointerdown — that's when we capture bases + switch them to JS physics.
  const states = cards.map(el => ({
    el,
    tx: 0,
    ty: 0,
    vx: 0,
    vy: 0,
    baseLeft: 0,
    baseTop: 0,
    baseW: 0,
    baseH: 0,
    isDragging: false,
    pointerId: null,
    lastX: 0,
    lastY: 0,
    lastT: 0,
  }));

  let raf = 0;
  let physicsActivated = false;

  function activatePhysicsForAll() {
    if (physicsActivated) return;
    physicsActivated = true;
    const heroR = heroEl.getBoundingClientRect();
    for (const s of states) {
      const r = s.el.getBoundingClientRect();
      s.baseLeft = r.left - heroR.left;
      s.baseTop = r.top - heroR.top;
      s.baseW = r.width;
      s.baseH = r.height;
      s.tx = 0;
      s.ty = 0;
      s.el.classList.add('has-physics');
    }
  }

  function clampToWalls(s, heroR) {
    const minTx = -s.baseLeft;
    const maxTx = heroR.width - s.baseLeft - s.baseW;
    const minTy = -s.baseTop;
    const maxTy = heroR.height - s.baseTop - s.baseH;
    if (s.tx < minTx) {
      s.tx = minTx;
      if (!s.isDragging) s.vx = -s.vx * WALL_BOUNCE;
    }
    if (s.tx > maxTx) {
      s.tx = maxTx;
      if (!s.isDragging) s.vx = -s.vx * WALL_BOUNCE;
    }
    if (s.ty < minTy) {
      s.ty = minTy;
      if (!s.isDragging) s.vy = -s.vy * WALL_BOUNCE;
    }
    if (s.ty > maxTy) {
      s.ty = maxTy;
      if (!s.isDragging) s.vy = -s.vy * WALL_BOUNCE;
    }
  }

  function resolveCardCollision(a, b) {
    // AABB on (baseLeft + tx, baseTop + ty, baseW, baseH).
    // Ignores rotation — cards are tilted a few degrees via CSS --rot but the
    // AABB approximation is plenty for the bounce-on-contact feel.
    const ax = a.baseLeft + a.baseW / 2 + a.tx;
    const ay = a.baseTop + a.baseH / 2 + a.ty;
    const bx = b.baseLeft + b.baseW / 2 + b.tx;
    const by = b.baseTop + b.baseH / 2 + b.ty;
    const dx = bx - ax;
    const dy = by - ay;
    const overlapX = (a.baseW + b.baseW) / 2 - Math.abs(dx);
    const overlapY = (a.baseH + b.baseH) / 2 - Math.abs(dy);
    if (overlapX <= 0 || overlapY <= 0) return;

    // Resolve along the axis with smaller penetration — that's the side
    // they're actually hitting on.
    if (overlapX < overlapY) {
      const sign = dx >= 0 ? 1 : -1;
      // Dragged card stays put (user is steering it); non-dragged absorbs
      // the full separation. If neither is dragged, split 50/50.
      if (a.isDragging && !b.isDragging) {
        b.tx += sign * overlapX;
      } else if (b.isDragging && !a.isDragging) {
        a.tx -= sign * overlapX;
      } else if (!a.isDragging && !b.isDragging) {
        a.tx -= (sign * overlapX) / 2;
        b.tx += (sign * overlapX) / 2;
      }
      // Equal-mass elastic exchange on the collision axis, scaled by
      // CARD_BOUNCE. Dragged cards keep their mouse-driven velocity.
      const av = a.vx;
      const bv = b.vx;
      if (!a.isDragging) a.vx = bv * CARD_BOUNCE;
      if (!b.isDragging) b.vx = av * CARD_BOUNCE;
    } else {
      const sign = dy >= 0 ? 1 : -1;
      if (a.isDragging && !b.isDragging) {
        b.ty += sign * overlapY;
      } else if (b.isDragging && !a.isDragging) {
        a.ty -= sign * overlapY;
      } else if (!a.isDragging && !b.isDragging) {
        a.ty -= (sign * overlapY) / 2;
        b.ty += (sign * overlapY) / 2;
      }
      const av = a.vy;
      const bv = b.vy;
      if (!a.isDragging) a.vy = bv * CARD_BOUNCE;
      if (!b.isDragging) b.vy = av * CARD_BOUNCE;
    }
  }

  function applyTransform(s) {
    s.el.style.setProperty('--tx', s.tx + 'px');
    s.el.style.setProperty('--ty', s.ty + 'px');
  }

  function tick() {
    const heroR = heroEl.getBoundingClientRect();
    // Integrate position for free cards
    for (const s of states) {
      if (s.isDragging) continue;
      s.tx += s.vx;
      s.ty += s.vy;
      s.vx *= DECAY;
      s.vy *= DECAY;
    }
    // Pairwise collisions
    for (let i = 0; i < states.length; i++) {
      for (let j = i + 1; j < states.length; j++) {
        resolveCardCollision(states[i], states[j]);
      }
    }
    // Walls
    for (const s of states) clampToWalls(s, heroR);
    // Commit transforms
    for (const s of states) applyTransform(s);

    // Continue while anything is moving or being dragged
    const active = states.some(
      s => s.isDragging || Math.abs(s.vx) > STOP_EPS || Math.abs(s.vy) > STOP_EPS,
    );
    if (active) {
      raf = requestAnimationFrame(tick);
    } else {
      for (const s of states) {
        s.vx = 0;
        s.vy = 0;
      }
      raf = 0;
    }
  }

  function ensureLoop() {
    if (!raf) raf = requestAnimationFrame(tick);
  }

  // Wire pointer handlers
  states.forEach(s => {
    s.el.addEventListener('pointerdown', e => {
      if (e.button !== undefined && e.button !== 0) return;
      e.preventDefault();
      activatePhysicsForAll();
      s.isDragging = true;
      s.pointerId = e.pointerId;
      try {
        s.el.setPointerCapture(s.pointerId);
      } catch (_err) {
        /* ignore */
      }
      s.el.classList.add('is-dragging');
      s.lastX = e.clientX;
      s.lastY = e.clientY;
      s.lastT = performance.now();
      s.vx = 0;
      s.vy = 0;
      s.el.style.zIndex = '5';
      ensureLoop();
    });

    s.el.addEventListener('pointermove', e => {
      if (!s.isDragging) return;
      const now = performance.now();
      const dx = e.clientX - s.lastX;
      const dy = e.clientY - s.lastY;
      const dt = Math.max(1, now - s.lastT);
      s.tx += dx;
      s.ty += dy;
      // Velocity for after-release drift
      s.vx = (dx / dt) * VELOCITY_SCALE;
      s.vy = (dy / dt) * VELOCITY_SCALE;
      s.lastX = e.clientX;
      s.lastY = e.clientY;
      s.lastT = now;
      ensureLoop();
    });

    function endDrag() {
      if (!s.isDragging) return;
      s.isDragging = false;
      if (s.pointerId != null) {
        try {
          s.el.releasePointerCapture(s.pointerId);
        } catch (_err) {
          /* ignore */
        }
      }
      s.pointerId = null;
      s.el.classList.remove('is-dragging');
      if (reduceMotion()) {
        s.vx = 0;
        s.vy = 0;
      }
      ensureLoop();
    }

    s.el.addEventListener('pointerup', endDrag);
    s.el.addEventListener('pointercancel', endDrag);
    s.el.addEventListener('lostpointercapture', endDrag);
  });

  // On resize, re-capture base positions so wall clamping uses fresh layout
  // bounds. We preserve each card's current on-screen position by adjusting
  // tx/ty against the new baseLeft/baseTop.
  let resizeRaf = 0;
  window.addEventListener(
    'resize',
    () => {
      if (!physicsActivated) return;
      if (resizeRaf) return;
      resizeRaf = requestAnimationFrame(() => {
        resizeRaf = 0;
        const heroR = heroEl.getBoundingClientRect();
        for (const s of states) {
          const screenX = s.baseLeft + s.tx;
          const screenY = s.baseTop + s.ty;
          // Measure new base without the transform
          s.el.style.setProperty('--tx', '0px');
          s.el.style.setProperty('--ty', '0px');
          const r = s.el.getBoundingClientRect();
          s.baseLeft = r.left - heroR.left;
          s.baseTop = r.top - heroR.top;
          s.baseW = r.width;
          s.baseH = r.height;
          s.tx = screenX - s.baseLeft;
          s.ty = screenY - s.baseTop;
          clampToWalls(s, heroR);
          applyTransform(s);
        }
      });
    },
    { passive: true },
  );
}

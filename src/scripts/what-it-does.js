// "What it does" — dark celestial map. Two jobs:
//   1. A recolored twinkling starfield painted to a <canvas> (vanilla port of
//      the bundui StarsBackground — no `motion` dep, matches the vanilla-only
//      script rule). White stars over the section's dark gradient.
//   2. Scroll-driven stage activation for the Scout→Win constellation: as the
//      section scrolls, each journey star becomes active in order, the route
//      fills SOLID up to it, the active star pulses, and its card shows.
//      Hover / focus / tap a star to reveal that star's card on demand.
//
// State model (one card visible at a time, so the zig-zag never overlaps):
//   scrollActive  1..N  — furthest star the scroll has reached
//   focusStar     0|1..N — hovered / focused / tapped star (0 = none)
//   shown = focusStar || scrollActive   (which card is visible)
//   lit   = max(scrollActive, focusStar) (how far the route is drawn solid)
//
// Reduced motion: starfield painted once (no rAF), route fully lit, every card
// shown, no pulse — the section is fully readable without any animation.

export function initWhatItDoes(root = document) {
  const section = root.querySelector('[data-celestial]');
  if (!section) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- recolored twinkling starfield ---------------- */
  const canvas = section.querySelector('[data-starfield]');
  if (canvas && canvas.getContext) {
    const ctx = canvas.getContext('2d');
    let field = [];
    let w = 0;
    let h = 0;

    const build = () => {
      const r = section.getBoundingClientRect();
      w = r.width;
      h = r.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.floor((w * h) / 9000); // density tuned to the prototype
      field = Array.from({ length: n }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.1 + 0.3,
        o: Math.random(),
        sp: Math.random() * 0.014 + 0.003,
        d: Math.random() < 0.5 ? 1 : -1,
      }));
    };

    const paint = twinkle => {
      ctx.clearRect(0, 0, w, h);
      for (const s of field) {
        if (twinkle) {
          s.o += s.sp * s.d;
          if (s.o > 1) {
            s.o = 1;
            s.d = -1;
          }
          if (s.o < 0.15) {
            s.o = 0.15;
            s.d = 1;
          }
        }
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, 7);
        ctx.fillStyle = `rgba(244,244,245,${twinkle ? s.o : 0.55 * s.o + 0.18})`;
        ctx.fill();
      }
    };

    const tick = () => {
      paint(true);
      requestAnimationFrame(tick);
    };

    build();
    if (reduce) paint(false);
    else tick();

    let rt;
    window.addEventListener('resize', () => {
      clearTimeout(rt);
      rt = setTimeout(() => {
        build();
        if (reduce) paint(false);
      }, 150);
    });
  }

  /* ---------------- platform-trait stars (tap toggles tooltip) --------------- */
  const pstars = [...section.querySelectorAll('[data-pstar]')];
  pstars.forEach(p => {
    p.addEventListener('click', () => p.classList.toggle('is-open'));
  });

  /* ---------------- living journey: scroll → route draw + comet ---------------- */
  const map = section.querySelector('[data-map]');
  const stars = [...section.querySelectorAll('[data-star]')];
  if (!map || !stars.length) return;

  const routeSolid = section.querySelector('[data-route]');
  const comet = section.querySelector('[data-comet]');
  const dest = section.querySelector('.cmap-dest');
  const readout = section.querySelector('[data-progress] b');

  // path-length fraction of each journey star along the full route
  // (scout → judge → apply → win), measured from the route geometry. The
  // comet runs scout(0) → install-destination(1); stars sit before the end.
  const STAR_FRAC = [0, 0.245, 0.492, 0.722];

  // draw the solid route up to a 0..1 fraction; place the comet at that point
  let total = 0;
  if (routeSolid) {
    total = routeSolid.getTotalLength();
    routeSolid.style.strokeDasharray = `${total}`;
    routeSolid.style.strokeDashoffset = `${total}`;
  }

  let progress = 0; // 0..1 across scout → destination
  let scrollActive = 1;
  let focusStar = 0;
  let reachedMax = 0;

  const applyCards = () => {
    const shown = focusStar || scrollActive;
    stars.forEach((s, i) => {
      const n = i + 1;
      s.classList.toggle('is-shown', n === shown);
      s.classList.toggle('is-active', n === scrollActive);
      const btn = s.querySelector('button');
      if (btn) btn.setAttribute('aria-expanded', n === shown ? 'true' : 'false');
    });
  };

  const render = () => {
    // route draw (reduced motion → always fully drawn)
    if (routeSolid && total) {
      routeSolid.style.strokeDashoffset = reduce ? '0' : `${total * (1 - progress)}`;
    }
    // comet position along the path
    if (comet && routeSolid && total && !reduce) {
      const pt = routeSolid.getPointAtLength(progress * total);
      comet.setAttribute('transform', `translate(${pt.x} ${pt.y})`);
      comet.classList.toggle('on', progress > 0.005 && progress < 0.999);
    }
    // active stage = furthest journey star the comet has reached
    const reached = STAR_FRAC.filter(f => progress >= f - 0.001).length;
    const active = Math.max(1, reached);
    if (active !== scrollActive) {
      scrollActive = active;
      applyCards();
    }
    // one-shot "landing" ring when a new star is reached
    if (reached > reachedMax) {
      const star = stars[reached - 1];
      if (star) {
        star.classList.add('is-landing');
        setTimeout(() => star.classList.remove('is-landing'), 700);
      }
    }
    reachedMax = reached;
    if (readout) readout.textContent = String(active).padStart(2, '0');
  };

  const computeProgress = () => {
    const vh = window.innerHeight;
    const anchor = vh * 0.58;
    const first = stars[0].getBoundingClientRect();
    const firstC = first.top + first.height / 2;
    const endRect = (dest || stars[stars.length - 1]).getBoundingClientRect();
    const lastC = endRect.top + endRect.height / 2;
    const span = lastC - firstC;
    const p = span > 0 ? (anchor - firstC) / span : 0;
    progress = Math.max(0, Math.min(1, p));
    render();
  };

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      computeProgress();
    });
  };

  // hover / focus / tap reveal a star's card (without fast-forwarding the route)
  stars.forEach((s, i) => {
    const n = i + 1;
    const btn = s.querySelector('button') || s;
    s.addEventListener('mouseenter', () => {
      focusStar = n;
      applyCards();
    });
    s.addEventListener('mouseleave', () => {
      focusStar = 0;
      applyCards();
    });
    btn.addEventListener('focus', () => {
      focusStar = n;
      applyCards();
    });
    btn.addEventListener('blur', () => {
      focusStar = 0;
      applyCards();
    });
    btn.addEventListener('click', () => {
      focusStar = focusStar === n ? 0 : n;
      applyCards();
    });
  });

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  computeProgress();
  applyCards();
}

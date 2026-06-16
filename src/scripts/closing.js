// SECTION 06 · "Closing" (dark) — three jobs, all ambient/one-shot:
//   1. Recolored twinkling starfield (vanilla canvas, same as §3). Frozen under
//      reduced motion.
//   2. Trajectory draw-in: the solid ember route draws to the waypoint star ONCE
//      when the section scrolls into view (stroke-dashoffset, no RAF loop). Under
//      reduced motion it renders already-complete.
//   3. Subscribe form → subscribe Worker (POST /api/subscribe).
//
// The copy button is handled by the shared initScriptCopyButtons.

export function initClosing(root = document) {
  const section = root.querySelector('[data-closing]');
  if (!section) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- starfield ---------------- */
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
      const n = Math.floor((w * h) / 9000);
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

    build();
    if (reduce) {
      paint(false);
    } else {
      const tick = () => {
        paint(true);
        requestAnimationFrame(tick);
      };
      tick();
    }

    let rt;
    window.addEventListener('resize', () => {
      clearTimeout(rt);
      rt = setTimeout(() => {
        build();
        if (reduce) paint(false);
      }, 150);
    });
  }

  /* ---------------- trajectory draw-in (one-shot) ---------------- */
  const route = section.querySelector('[data-route]');
  const star = section.querySelector('[data-star]');
  if (route) {
    const total = route.getTotalLength();
    route.style.strokeDasharray = `${total}`;
    if (reduce) {
      route.style.strokeDashoffset = '0';
      star?.classList.add('is-lit');
    } else {
      route.style.strokeDashoffset = `${total}`;
      route.style.transition = 'stroke-dashoffset 850ms var(--ease-calm, cubic-bezier(0.2,0,0,1))';
      const complete = () => {
        route.style.strokeDashoffset = '0';
        star?.classList.add('is-lit');
      };
      if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver(
          entries => {
            for (const e of entries) {
              if (e.isIntersecting) {
                complete();
                io.disconnect();
                break;
              }
            }
          },
          { threshold: 0.35 },
        );
        io.observe(section);
      } else {
        complete();
      }
    }
  }

  /* ---------------- subscribe → subscribe Worker ---------------- */
  const form = section.querySelector('[data-subscribe]');
  if (form) {
    const input = form.querySelector('input[type="email"]');
    const status = form.querySelector('[data-sub-status]');
    const honeypot = form.querySelector('[data-hp]');
    const btn = form.querySelector('button[type="submit"]');
    const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    let busy = false;

    const setState = (kind, msg) => {
      form.dataset.state = kind;
      if (status) status.textContent = msg;
    };
    const unlock = () => {
      busy = false;
      if (btn) btn.disabled = false;
      if (input) input.disabled = false;
    };

    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (busy) return;
      if (honeypot && honeypot.value) return; // bot trap — silently ignore

      const email = (input?.value || '').trim();
      if (!EMAIL.test(email)) {
        setState('error', 'Enter a valid email address.');
        input?.focus();
        return;
      }

      busy = true;
      if (btn) btn.disabled = true;
      if (input) input.disabled = true;
      setState('busy', 'Subscribing…');

      try {
        const res = await fetch('/api/subscribe', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ email, source: 'closing' }),
        });
        if (res.ok) {
          setState('success', "You're subscribed.");
        } else {
          const data = await res.json().catch(() => ({}));
          unlock();
          setState(
            'error',
            data.error === 'Invalid email'
              ? 'Enter a valid email address.'
              : 'Something went wrong. Try again.',
          );
        }
      } catch {
        unlock();
        setState('error', 'Network error. Try again.');
      }
    });
  }
}

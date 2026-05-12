// ---- script block 1 ----

(function(){
  const nav = document.getElementById('nav');
  if (!nav) return;
  const progress = document.getElementById('scrollProgress');
  const toggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');
  const linkEls = navLinks ? Array.from(navLinks.querySelectorAll('a[href^="#"]')) : [];

  function onScroll() {
    nav.classList.toggle('scrolled', window.scrollY > 12);
    if (progress) {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const pct = docHeight > 0 ? (window.scrollY / docHeight) * 100 : 0;
      progress.style.width = pct + '%';
    }
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // Mobile menu toggle
  if (toggle && navLinks) {
    toggle.addEventListener('click', () => {
      const isOpen = navLinks.classList.toggle('open');
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
    navLinks.addEventListener('click', e => {
      if (e.target.tagName === 'A' && navLinks.classList.contains('open')) {
        navLinks.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Active section indicator
  if (linkEls.length && 'IntersectionObserver' in window) {
    const sections = linkEls
      .map(a => document.querySelector(a.getAttribute('href')))
      .filter(Boolean);
    const linkBySection = new Map(sections.map((s, i) => [s, linkEls[i]]));
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (en.isIntersecting) {
          linkEls.forEach(a => a.classList.remove('active'));
          const link = linkBySection.get(en.target);
          if (link) link.classList.add('active');
        }
      });
    }, { rootMargin: '-40% 0px -55% 0px', threshold: 0 });
    sections.forEach(s => io.observe(s));
  }
})();


// ---- script block 2 ----
(function(){var y=document.getElementById('footer-year');if(y)y.textContent=new Date().getFullYear();})();

// ---- script block 3 ----

(function(){
  const btn = document.getElementById('toTop');
  if (!btn) return;
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const onScroll = () => {
    btn.classList.toggle('show', window.scrollY > window.innerHeight);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: motionQuery.matches ? 'auto' : 'smooth' });
  });
  onScroll();
})();


// ---- script block 4 ----

/* Reveal on scroll */
(function(){
  const els = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) {
    els.forEach(el => el.classList.add('in'));
    return;
  }
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (en.isIntersecting) {
        en.target.classList.add('in');
        io.unobserve(en.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
  els.forEach(el => io.observe(el));
})();

/* Email form — minimal client-side feedback */
(function(){
  const form = document.getElementById('emailForm');
  if (!form) return;
  const input = form.querySelector('input[name=email]');
  const submitBtn = form.querySelector('button[type=submit]');
  const thanks = document.getElementById('emailThanks');
  let errEl = document.getElementById('emailError');
  if (!errEl) {
    errEl = document.createElement('p');
    errEl.id = 'emailError';
    errEl.className = 'email-error';
    errEl.setAttribute('aria-live', 'polite');
    form.insertAdjacentElement('afterend', errEl);
  }
  const showError = (msg) => {
    errEl.textContent = msg;
    errEl.classList.add('show');
    input.setAttribute('aria-invalid', 'true');
  };
  const clearError = () => {
    errEl.classList.remove('show');
    input.removeAttribute('aria-invalid');
  };
  const setBusy = (busy) => {
    if (!submitBtn) return;
    if (busy) {
      submitBtn.disabled = true;
      submitBtn.setAttribute('aria-busy', 'true');
      submitBtn.textContent = submitBtn.dataset.busy || 'Joining…';
    } else {
      submitBtn.disabled = false;
      submitBtn.removeAttribute('aria-busy');
      submitBtn.textContent = submitBtn.dataset.label || 'Join the waitlist';
    }
  };
  input.addEventListener('input', clearError);
  form.addEventListener('submit', function(e){
    e.preventDefault();
    const email = input.value.trim();
    if (!email) {
      showError('Please enter your email.');
      input.focus();
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showError("That doesn't look like an email — try again.");
      input.focus();
      return;
    }
    clearError();
    setBusy(true);
    // No backend wired yet — simulate latency so the busy state is visible,
    // then show the thanks message and keep the form available for the
    // (extremely rare) case the user wants to amend it.
    window.setTimeout(() => {
      setBusy(false);
      form.style.display = 'none';
      thanks.classList.add('show');
      thanks.focus && thanks.focus();
    }, 600);
  });
})();


// ---- script block 5 ----

/* Polish & interactivity */
(function(){
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const reduceMotion = () => motionQuery.matches;
  const scrollBehavior = () => (reduceMotion() ? 'auto' : 'smooth');

  // Hero spotlight follows cursor — skip entirely for reduced-motion users
  const hero = document.querySelector('.hero');
  if (hero && !reduceMotion()) {
    // inject orbs
    const orbs = document.createElement('div');
    orbs.className = 'hero-orbs';
    for (let i = 0; i < 3; i++) orbs.appendChild(document.createElement('span'));
    hero.prepend(orbs);
    hero.addEventListener('pointermove', e => {
      const r = hero.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * 100;
      const y = ((e.clientY - r.top) / r.height) * 100;
      hero.style.setProperty('--mx', x + '%');
      hero.style.setProperty('--my', y + '%');
      hero.style.setProperty('--ha', '1');
    });
    hero.addEventListener('pointerleave', () => {
      hero.style.setProperty('--ha', '0');
    });
  }

  // Wrap accent words in hero H1 with animated gradient class
  const h1 = document.querySelector('.hero h1');
  if (h1 && !h1.querySelector('.accent-text')) {
    h1.innerHTML = h1.innerHTML.replace(/(worth your time)/, '<span class="accent-text">$1</span>');
  }

  // Stagger reveal delay for grouped cards
  document.querySelectorAll('.feature-list .feature').forEach((el, i) => {
    el.style.setProperty('--rd', (i * 80) + 'ms');
  });
  document.querySelectorAll('.voc-stat').forEach((el, i) => el.style.setProperty('--rd', (i * 70) + 'ms'));
  document.querySelectorAll('.review-card').forEach((el, i) => el.style.setProperty('--rd', (i * 60) + 'ms'));
  document.querySelectorAll('.review-grid .review').forEach((el, i) => {
    const isHope = el.classList.contains('hope');
    const delay = isHope ? (i * 80 + 240) : (i * 80);
    el.style.setProperty('--rd', delay + 'ms');
  });
  document.querySelectorAll('.steps .step').forEach((el, i) => el.style.setProperty('--rd', (i * 140) + 'ms'));

  // Count-up for VOC stat numerals
  function countUp(el, target, suffix, dur){
    const start = performance.now();
    const isFloat = target % 1 !== 0;
    function tick(now){
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      const v = target * eased;
      el.textContent = (isFloat ? v.toFixed(1) : Math.round(v)) + (suffix || '');
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
  const vocObserver = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (en.isIntersecting) {
        const el = en.target;
        const raw = el.dataset.target || el.textContent.trim();
        const m = raw.match(/(\d+\.?\d*)(\D*)$/);
        if (m) {
          el.dataset.target = m[1];
          el.dataset.suffix = m[2];
          countUp(el, parseFloat(m[1]), m[2], 1400);
        }
        vocObserver.unobserve(el);
      }
    });
  }, { threshold: 0.4 });
  document.querySelectorAll('.voc-stat .num').forEach(el => vocObserver.observe(el));

  // Speed-tiered count-up for hero funnel stats
  const FUNNEL_SPEEDS = { fast: 800, mid: 1600, slow: 2800 };
  function funnelCountUp(el, target, dur) {
    const start = performance.now();
    function tick(now) {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(target * eased);
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
  const funnelObserver = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (en.isIntersecting) {
        en.target.querySelectorAll('.fs-num').forEach(el => {
          const target = parseInt(el.dataset.target, 10);
          const dur = FUNNEL_SPEEDS[el.dataset.speed] || 1400;
          funnelCountUp(el, target, dur);
        });
        funnelObserver.unobserve(en.target);
      }
    });
  }, { threshold: 0.3 });
  const funnelRow = document.querySelector('.funnel-stats');
  if (funnelRow) funnelObserver.observe(funnelRow);

  // Feature shots: count-up for report score + pipeline funnel counts
  function countUpTextNode(textNode, target, dur, decimals) {
    const start = performance.now();
    function tick(now) {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      const v = target * eased;
      textNode.nodeValue = decimals ? v.toFixed(decimals) : String(Math.round(v));
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
  const shotObserver = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      const shot = en.target;
      // F1: report score — first text node holds the number (e.g. "4.4"), denom span follows
      const reportScore = shot.querySelector('.shot-report .score-num');
      if (reportScore && !reportScore.dataset.animated) {
        const node = reportScore.firstChild;
        if (node && node.nodeType === Node.TEXT_NODE) {
          const target = parseFloat(node.nodeValue);
          if (!isNaN(target)) {
            reportScore.dataset.animated = '1';
            countUpTextNode(node, target, 1400, 1);
          }
        }
      }
      // F3: funnel counts (whole numbers)
      shot.querySelectorAll('.shot-pipeline .fstep .v').forEach((el, i) => {
        if (el.dataset.animated) return;
        const target = parseInt(el.textContent.trim(), 10);
        const node = el.firstChild;
        if (!isNaN(target) && node && node.nodeType === Node.TEXT_NODE) {
          el.dataset.animated = '1';
          const dur = 900 + i * 180;
          setTimeout(() => countUpTextNode(node, target, dur, 0), 320 + i * 120);
        }
      });
      shotObserver.unobserve(shot);
    });
  }, { threshold: 0.25 });
  document.querySelectorAll('.feature-shot').forEach(shot => shotObserver.observe(shot));

  // Magnetic primary CTA — gentle pull toward cursor (skip for reduced motion)
  if (!reduceMotion()) {
    document.querySelectorAll('.cta-primary, .btn-primary, .waitlist-form button').forEach(btn => {
      btn.addEventListener('pointermove', e => {
        const r = btn.getBoundingClientRect();
        const dx = (e.clientX - r.left - r.width/2) / r.width;
        const dy = (e.clientY - r.top - r.height/2) / r.height;
        btn.style.transform = `translate(${dx*6}px, ${dy*6}px) translateY(-2px)`;
      });
      btn.addEventListener('pointerleave', () => { btn.style.transform = ''; });
    });
  }

  // Smooth scroll for in-page anchors — respects prefers-reduced-motion
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const id = a.getAttribute('href');
      if (id && id.length > 1 && document.querySelector(id)) {
        e.preventDefault();
        document.querySelector(id).scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
      }
    });
  });

  // Parallax on demo frame — skip for reduced motion
  const demo = document.querySelector('.demo-frame');
  if (demo && !reduceMotion()) {
    window.addEventListener('scroll', () => {
      const r = demo.getBoundingClientRect();
      const vh = window.innerHeight;
      const t = Math.max(-1, Math.min(1, (r.top + r.height/2 - vh/2) / vh));
      demo.style.transform = `translateY(${t * -8}px)`;
    }, { passive: true });
  }

  // Demo pause toggle
  const demoFrame = document.getElementById('demoFrame');
  const demoPauseBtn = document.getElementById('demoPause');
  if (demoFrame && demoPauseBtn) {
    demoPauseBtn.addEventListener('click', () => {
      const willPause = !demoFrame.classList.contains('paused');
      demoFrame.classList.toggle('paused', willPause);
      demoPauseBtn.setAttribute('aria-pressed', willPause ? 'true' : 'false');
      demoPauseBtn.setAttribute('aria-label', willPause ? 'Play demo animation' : 'Pause demo animation');
    });
  }

  // Hero floating cards — drag to send them drifting around like soap bubbles.
  (function setupCardPhysics() {
    const heroEl = document.querySelector('.hero');
    if (!heroEl) return;
    const cards = heroEl.querySelectorAll('.hero-cards .float-card');
    if (!cards.length) return;

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
  })();
})();

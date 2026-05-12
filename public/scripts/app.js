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

  // Stagger reveal delay for grouped cards
  document.querySelectorAll('.feature-list .feature').forEach((el, i) => {
    el.style.setProperty('--rd', (i * 80) + 'ms');
  });
  document.querySelectorAll('.steps .step').forEach((el, i) => el.style.setProperty('--rd', (i * 140) + 'ms'));

})();

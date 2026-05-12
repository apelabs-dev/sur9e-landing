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

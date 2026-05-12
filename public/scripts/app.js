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

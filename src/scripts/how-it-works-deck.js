// Flip-deck for the "How it works" demo: two stacked cards ([Agent] terminal,
// [Report] viewer) with one focused at a time. Tab buttons flip the chosen
// card to the front; the other restacks behind. The agent terminal auto-plays
// its run once when the deck scrolls into view (CSS animation gated on
// `.is-seen`). Reduced-motion is handled in CSS (instant swap, final state).

export function initHowItWorksDeck(root = document) {
  const deck = root.querySelector('[data-deck]');
  if (!deck) return;

  const tabs = [...deck.querySelectorAll('[data-deck-tab]')];
  const cards = [...deck.querySelectorAll('[data-deck-card]')];
  if (!tabs.length || !cards.length) return;

  function show(name) {
    for (const t of tabs) {
      const on = t.dataset.deckTab === name;
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-selected', on ? 'true' : 'false');
    }
    for (const c of cards) {
      const front = c.dataset.deckCard === name;
      c.classList.toggle('is-front', front);
      c.classList.toggle('is-back', !front);
    }
  }

  for (const t of tabs) {
    t.addEventListener('click', () => show(t.dataset.deckTab));
  }

  // Clicking the peeking corner of the back card brings it to the front
  // (like picking up the card behind). Only acts when the card is the back
  // one — clicks on the focused card fall through (e.g. scrolling the report).
  for (const c of cards) {
    c.addEventListener('click', () => {
      if (c.classList.contains('is-back')) show(c.dataset.deckCard);
    });
  }

  // Auto-play the agent terminal once, when the deck first enters the viewport.
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            deck.classList.add('is-seen');
            io.disconnect();
            break;
          }
        }
      },
      { threshold: 0.25 },
    );
    io.observe(deck);
  } else {
    deck.classList.add('is-seen');
  }
}

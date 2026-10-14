/* Scroll reveal. Content is fully visible without JS; this only adds the entrance once a block
   scrolls into view. data-reveal         — the block fades up
                      data-reveal="stagger" — its children fade up one after another
                      data-reveal="route"   — a route/timeline draws its line station by station */
import { $$ } from '../core/dom.js';

export function initReveal() {
  const blocks = $$('[data-reveal]');
  if (!blocks.length) return;

  $$('[data-reveal="stagger"]').forEach(group =>
    [...group.children].forEach((child, i) => child.style.setProperty('--i', String(i))));
  $$('[data-reveal="route"]').forEach(route =>
    $$('.step', route).forEach((step, i) => step.style.setProperty('--i', String(i))));

  if (!('IntersectionObserver' in window)) {
    blocks.forEach(b => b.classList.add('is-in'));
    return;
  }

  document.documentElement.classList.add('reveal-ready');
  const io = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-in');
      io.unobserve(entry.target);
    }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  blocks.forEach(b => io.observe(b));
}

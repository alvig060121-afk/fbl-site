/* Video block (home Fulfillment section, Fulfillment page). Muted, looping, no visitor controls: it plays
   by itself while on screen and pauses off screen to save the battery, regardless of the visitor's
   "reduce motion" system setting (owner's decision). With no data-src it shows the "ролик появится здесь" state, so a video
   can be added later by setting data-src (and optionally data-src-small) — no code change. */
import { $$ } from '../core/dom.js';

export function initVideoPlayers() {
  $$('[data-video]').forEach(setup);
}

function setup(root) {
  const video = root.querySelector('video');
  const small = matchMedia('(max-width: 767px)').matches;
  const src = (small && root.dataset.srcSmall) || root.dataset.src;

  if (!video || !src) { root.classList.add('is-empty'); return; }
  let onScreen = false;
  let loaded = false;

  const play = () => {
    if (!loaded) { video.src = src; loaded = true; }
    const p = video.play();
    if (p && p.catch) p.catch(() => {});
  };

  video.addEventListener('playing', () => root.classList.add('is-playing'));
  video.addEventListener('pause', () => root.classList.remove('is-playing'));
  video.addEventListener('error', () => root.classList.add('is-empty'));

  // Browsers refuse or pause playback in hidden tabs; try again when the page is seen or touched.
  document.addEventListener('visibilitychange', () => { if (!document.hidden && onScreen && video.paused) play(); });
  ['pointerdown', 'keydown', 'scroll'].forEach(ev =>
    window.addEventListener(ev, () => { if (onScreen && video.paused) play(); }, { once: true, passive: true }));

  if (!('IntersectionObserver' in window)) { onScreen = true; play(); return; }
  new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting;
    if (onScreen) play();
    else if (!video.paused) video.pause();
  }, { threshold: 0.35 }).observe(root);
}

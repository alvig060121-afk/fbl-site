/* Home hero: background video on every screen width with the chapter rail synced to the footage.
   Only visitors who ask their system for reduced motion keep the poster. */
import { $, $$, prefersReducedMotion } from '../core/dom.js';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export function initHeroVideo() {
  const hero = $('.hero');
  const video = hero && $('.hero__video', hero);
  if (!video) return;
  const chapters = $$('[data-chapters] li', hero);

  if (prefersReducedMotion()) {
    hero.classList.add('no-video');
    return;
  }

  let onScreen = true;
  video.src = video.dataset.src;
  video.load();
  // Browsers refuse or pause playback in hidden tabs; try again when the page is seen or touched.
  const tryPlay = () => { if (!onScreen) return; const p = video.play(); if (p && p.catch) p.catch(() => {}); };
  tryPlay();
  document.addEventListener('visibilitychange', () => { if (!document.hidden && video.paused) tryPlay(); });
  ['pointerdown', 'keydown', 'scroll'].forEach(ev =>
    window.addEventListener(ev, () => { if (video.paused) tryPlay(); }, { once: true, passive: true }));
  video.addEventListener('playing', () => hero.classList.add('is-playing'));
  video.addEventListener('error', () => { hero.classList.remove('is-playing'); hero.classList.add('no-video'); });

  // Stop decoding when the hero is scrolled away; resume when it comes back.
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => {
      onScreen = e.isIntersecting;
      if (onScreen && video.paused) tryPlay(); else if (!onScreen && !video.paused) video.pause();
    }).observe(hero);
  }

  const loopLen = 13.5;
  let raf = 0;
  const tick = () => {
    raf = 0;
    if (video.paused) return;
    const t = video.currentTime % loopLen;
    chapters.forEach(li => {
      const from = +li.dataset.from, to = +li.dataset.to;
      li.querySelector('i').style.width = clamp((t - from) / (to - from), 0, 1) * 100 + '%';
      li.classList.toggle('is-on', t >= from && t < to);
    });
    raf = requestAnimationFrame(tick);
  };
  video.addEventListener('playing', () => { if (!raf) raf = requestAnimationFrame(tick); });
}

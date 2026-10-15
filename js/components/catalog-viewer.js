/* Catalog viewer: opens a catalog right on the page instead of the browser's PDF reader.
   Pages are pre-rendered images (catalogs/files/<name>/<width>/NN.jpg); the strip slides one page at a time
   with native scroll-snap, so a swipe on a phone keeps its own soft momentum.
   Trigger markup: <a href="<pdf>" data-catalog-open data-pages="49" data-dir="files/sofas" data-title="…">
   (the href keeps working as a plain PDF link if this script never runs). */
import { $, $$, h } from '../core/dom.js';
import { pick } from '../core/i18n.js';

const T = pick({
  ru: { close: 'Закрыть', download: 'Скачать PDF', prev: 'Предыдущая страница', next: 'Следующая страница',
    page: (n, total) => `Страница ${n} из ${total}`, rotate: 'Поверните телефон — страницы станут крупнее' },
  en: { close: 'Close', download: 'Download PDF', prev: 'Previous page', next: 'Next page',
    page: (n, total) => `Page ${n} of ${total}`, rotate: 'Turn your phone sideways for larger pages' },
});

const WIDTHS = [900, 1600];   // rendered page sizes on disk
const PRELOAD = 2;            // pages on each side of the current one that get their image
const WHEEL_PAUSE = 450;      // ms: one wheel gesture turns one page

const pad = n => String(n).padStart(2, '0');

function pageImage(dir, n) {
  const src = w => `${dir}/${w}/${pad(n)}.jpg`;
  return h('img', {
    alt: '', width: 1600, height: 900, decoding: 'async',
    'data-src': src(WIDTHS[1]),
    'data-srcset': WIDTHS.map(w => `${src(w)} ${w}w`).join(', '),
    sizes: '(max-width: 900px) 100vw, min(92vw, 1500px)',
  });
}

function buildViewer({ title, pdf, dir, pages }) {
  const counter = h('p', { class: 'cview__count', 'aria-live': 'polite' });
  const progress = h('span');
  const track = h('div', { class: 'cview__track', tabindex: '0' },
    Array.from({ length: pages }, (_, i) => h('figure', { class: 'cview__page', 'aria-label': T.page(i + 1, pages) }, pageImage(dir, i + 1))));
  const root = h('div', { class: 'cview', role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
    h('div', { class: 'cview__bar' },
      h('p', { class: 'cview__title', text: title }),
      counter,
      h('div', { class: 'cview__tools' },
        h('a', { class: 'cview__btn', href: pdf, download: '', text: T.download }),
        h('button', { class: 'cview__close', type: 'button', 'aria-label': T.close, 'data-close': '' }, h('span'), h('span')))),
    track,
    h('button', { class: 'cview__nav cview__nav--prev', type: 'button', 'aria-label': T.prev, 'data-step': '-1' }),
    h('button', { class: 'cview__nav cview__nav--next', type: 'button', 'aria-label': T.next, 'data-step': '1' }),
    h('p', { class: 'cview__hint', text: T.rotate }),
    h('div', { class: 'cview__progress', 'aria-hidden': 'true' }, progress));
  return { root, track, counter, progress };
}

export function initCatalogViewer() {
  const triggers = $$('[data-catalog-open]');
  if (!triggers.length) return;

  let view = null;   // the open viewer, or null

  const open = trigger => {
    if (view) return;
    const pages = Number(trigger.dataset.pages);
    const dir = trigger.dataset.dir;
    const { root, track, counter, progress } = buildViewer({ title: trigger.dataset.title, pdf: trigger.href, dir, pages });
    const imgs = $$('img', track);
    let current = 0;

    const load = i => {
      const img = imgs[i];
      if (!img || img.src) return;
      img.srcset = img.dataset.srcset;
      img.src = img.dataset.src;
      img.addEventListener('load', () => img.classList.add('is-loaded'), { once: true });
    };
    const show = i => {
      current = i;
      counter.textContent = `${i + 1} / ${pages}`;
      progress.style.transform = `scaleX(${(i + 1) / pages})`;
      for (let k = i - PRELOAD; k <= i + PRELOAD; k++) load(k);
      $('.cview__nav--prev', root).disabled = i === 0;
      $('.cview__nav--next', root).disabled = i === pages - 1;
    };
    // While a smooth slide is running, the next press counts from where it is heading, not from where it is,
    // so pressing → three times quickly turns three pages.
    let target = null;
    let settle = 0;
    const goTo = i => {
      target = Math.max(0, Math.min(pages - 1, i));
      track.scrollTo({ left: target * track.clientWidth, behavior: 'smooth' });
      clearTimeout(settle);
      settle = setTimeout(() => { target = null; }, 900);
    };
    const step = by => goTo((target ?? current) + by);

    let raf = 0;
    track.addEventListener('scroll', () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const i = Math.round(track.scrollLeft / track.clientWidth);
        if (i !== current) show(i);
        if (target !== null && Math.abs(track.scrollLeft - target * track.clientWidth) < 2) target = null;
      });
    }, { passive: true });

    // Mouse wheel / trackpad: one gesture = one page, horizontal swipes on a trackpad stay native.
    let wheelLock = 0;
    track.addEventListener('wheel', e => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      e.preventDefault();
      const now = Date.now();
      if (now < wheelLock || Math.abs(e.deltaY) < 4) return;
      wheelLock = now + WHEEL_PAUSE;
      step(Math.sign(e.deltaY));
    }, { passive: false });

    root.addEventListener('click', e => {
      const arrow = e.target.closest('[data-step]');
      if (arrow) step(Number(arrow.dataset.step));
      if (e.target.closest('[data-close]')) close();
    });

    const onKey = e => {
      if (e.key === 'Escape') { close(); return; }
      if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); step(1); }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); step(-1); }
      if (e.key === 'Home') { e.preventDefault(); goTo(0); }
      if (e.key === 'End') { e.preventDefault(); goTo(pages - 1); }
      if (e.key === 'Tab') {   // keep focus inside the viewer
        const ring = $$('a, button:not(:disabled), [tabindex="0"]', root);
        const i = ring.indexOf(document.activeElement);
        e.preventDefault();
        ring[(i + (e.shiftKey ? -1 : 1) + ring.length) % ring.length]?.focus();
      }
    };
    const onResize = () => { track.scrollLeft = current * track.clientWidth; };

    // Phone «Back» closes the catalog instead of leaving the page.
    const onPop = () => close({ fromHistory: true });

    view = { root, trigger, onKey, onResize, onPop };
    document.body.append(root);
    document.documentElement.classList.add('is-cview-open');
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    history.pushState({ cview: true }, '');
    window.addEventListener('popstate', onPop);
    show(0);
    requestAnimationFrame(() => root.classList.add('is-open'));
    $('[data-close]', root).focus({ preventScroll: true });
  };

  const close = ({ fromHistory = false } = {}) => {
    if (!view) return;
    const { root, trigger, onKey, onResize, onPop } = view;
    view = null;
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('resize', onResize);
    window.removeEventListener('popstate', onPop);
    if (!fromHistory && history.state?.cview) history.back();
    document.documentElement.classList.remove('is-cview-open');
    root.classList.remove('is-open');
    root.addEventListener('transitionend', () => root.remove(), { once: true });
    setTimeout(() => root.remove(), 600);   // in case no transition runs
    trigger.focus({ preventScroll: true });
  };

  triggers.forEach(t => t.addEventListener('click', e => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;   // «open in new tab» still works
    e.preventDefault();
    open(t);
  }));
}

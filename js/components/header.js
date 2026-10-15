/* Header: hides while scrolling down and returns on scroll up; turns solid after a short scroll (only matters over the dark home hero) and runs the mobile menu.
   While the menu is open, Tab stays inside it (burger + menu links) and Esc closes it. */
import { $, $$ } from '../core/dom.js';
import { pick } from '../core/i18n.js';

const MENU = pick({ ru: { open: 'Открыть меню', close: 'Закрыть меню' }, en: { open: 'Open menu', close: 'Close menu' } });

export function initHeader() {
  const hdr = $('[data-hdr]');
  if (!hdr) return;
  const nav = $('[data-nav]', hdr);
  const burger = $('[data-burger]', hdr);
  const links = $$('a', nav);
  const isOpen = () => nav.classList.contains('is-open');

  // Menu links that point at a section of this same page (e.g. «Как работаем» → #how) get highlighted
  // while that section is on screen; above the first one the page's own link («Главная») is highlighted.
  const homeLink = links.find(a => a.getAttribute('aria-current') === 'page');
  const sectionLinks = links
    .filter(a => a.hash && a.pathname === location.pathname)
    .map(a => ({ link: a, target: document.getElementById(a.hash.slice(1)) }))
    .filter(s => s.target);

  const syncActive = () => {
    if (!sectionLinks.length) return;
    const line = hdr.offsetHeight + 24;
    const inView = sectionLinks.find(({ target }) => {
      const r = target.getBoundingClientRect();
      return r.top <= line && r.bottom > line;
    });
    const beforeFirst = sectionLinks[0].target.getBoundingClientRect().top > line;
    const current = inView ? inView.link : (beforeFirst ? homeLink : null);
    [homeLink, ...sectionLinks.map(s => s.link)].forEach(a => {
      if (!a) return;
      if (a === current) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
  };

  // The browser's own bar (Safari, Chrome on Android) takes this colour, so it always matches the header below it.
  const themeColor = document.querySelector('meta[name="theme-color"]');
  const darkHero = document.body.classList.contains('has-dark-hero');

  const sync = () => {
    const solid = isOpen() || window.scrollY > 40;
    hdr.classList.toggle('is-solid', solid);
    hdr.classList.toggle('is-menu', isOpen());
    themeColor?.setAttribute('content', isOpen() || (darkHero && !solid) ? '#0B1224' : '#FFFFFF');
    syncActive();
  };
  const setOpen = (open, { focus = false } = {}) => {
    nav.classList.toggle('is-open', open);
    document.documentElement.classList.toggle('is-menu-open', open);   // page stays still, the menu scrolls
    if (open) nav.scrollTop = 0;
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? MENU.close : MENU.open);
    sync();
    if (open && focus) links[0]?.focus();
  };

  // detail === 0: opened from the keyboard, so focus moves into the menu; a tap leaves no focus ring behind.
  burger.addEventListener('click', e => setOpen(!isOpen(), { focus: e.detail === 0 }));
  links.forEach(a => a.addEventListener('click', () => setOpen(false)));
  // A tap on the dimmed page behind the menu closes it.
  document.addEventListener('click', e => { if (isOpen() && !hdr.contains(e.target)) setOpen(false); });
  document.addEventListener('keydown', e => {
    if (!isOpen()) return;
    if (e.key === 'Escape') { setOpen(false); burger.focus(); return; }
    if (e.key !== 'Tab') return;
    const ring = [burger, ...links];
    const i = ring.indexOf(document.activeElement);
    const next = i === -1 ? 0 : (i + (e.shiftKey ? -1 : 1) + ring.length) % ring.length;
    e.preventDefault();
    ring[next].focus();
  });
  matchMedia('(min-width: 1141px)').addEventListener('change', e => { if (e.matches) setOpen(false); });

  // Header gets out of the way while reading: scrolling down slides it off, any scroll up brings it back.
  const SHOW_ABOVE = 120;   // px from the top where the header always stays
  const JITTER = 6;         // ignore tiny finger wobble
  let lastY = window.scrollY;
  const syncVisibility = () => {
    const y = Math.max(0, window.scrollY);
    const dy = y - lastY;
    if (isOpen() || y < SHOW_ABOVE || hdr.contains(document.activeElement)) hdr.classList.remove('is-hidden');
    else if (dy > JITTER) hdr.classList.add('is-hidden');
    else if (dy < -JITTER) hdr.classList.remove('is-hidden');
    if (Math.abs(dy) > JITTER) lastY = y;
  };
  hdr.addEventListener('focusin', () => hdr.classList.remove('is-hidden'));

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { sync(); syncVisibility(); ticking = false; });
  }, { passive: true });
  sync();
}

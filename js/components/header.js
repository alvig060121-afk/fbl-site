/* Header: turns solid after a short scroll (only matters over the dark home hero) and runs the mobile menu.
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

  const sync = () => {
    hdr.classList.toggle('is-solid', isOpen() || window.scrollY > 40);
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

  burger.addEventListener('click', () => setOpen(!isOpen(), { focus: true }));
  links.forEach(a => a.addEventListener('click', () => setOpen(false)));
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
  matchMedia('(min-width: 901px)').addEventListener('change', e => { if (e.matches) setOpen(false); });

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { sync(); ticking = false; });
  }, { passive: true });
  sync();
}

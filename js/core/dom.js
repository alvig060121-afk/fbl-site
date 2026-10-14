/* Small DOM helpers shared by every component. */
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export const prefersReducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Build an element without innerHTML, so text that will later come from the CRM is never parsed as markup.
   h('p', { class: 'x', text: 'Hi' }), h('ul', null, h('li', { text: 'a' })) */
export function h(tag, attrs, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs || {})) {
    if (value == null || value === false) continue;
    if (key === 'class') el.className = value;
    else if (key === 'text') el.textContent = value;
    else if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2), value);
    else el.setAttribute(key, value === true ? '' : String(value));
  }
  for (const child of children.flat()) {
    if (child == null || child === false) continue;
    el.append(child instanceof Node ? child : String(child));
  }
  return el;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

/* <svg><use href="#id"/></svg> from the page's icon sprite. */
export function icon(id, className = '') {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('aria-hidden', 'true');
  if (className) svg.setAttribute('class', className);
  const use = document.createElementNS(SVG_NS, 'use');
  use.setAttribute('href', `#${id}`);
  svg.append(use);
  return svg;
}

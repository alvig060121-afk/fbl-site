/* WeChat QR: if the image is missing or fails, hide it and show the WeChat number instead of a broken icon. */
import { $$ } from '../core/dom.js';

export function initQr() {
  $$('[data-qr]').forEach(fig => {
    const img = fig.querySelector('img');
    if (!img) return;
    const fail = () => fig.classList.add('is-missing');
    img.addEventListener('error', fail, { once: true });
    // A lazy image that has not been requested yet also reports naturalWidth 0, so only
    // eager images are checked for an error that happened before this module ran.
    if (img.loading !== 'lazy' && img.complete && img.naturalWidth === 0) fail();
  });
}

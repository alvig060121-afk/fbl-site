/* FBL Group — entry point for every page. Each component looks for its own markup and does nothing
   when it is absent, so pages opt in by markup alone. Components load independently: a missing file
   or a failing component never stops the others.

   Layers:  components/  (UI)  →  services/  (tracking, leads)  →  api/  (http | mock transport)  →  FBL API → CRM
*/
const components = [
  ['header', 'initHeader'],
  ['hero-video', 'initHeroVideo'],
  ['reveal', 'initReveal'],
  ['tracking', 'initTracking'],
  ['request-form', 'initRequestForm'],
  ['video-player', 'initVideoPlayers'],
  ['qr', 'initQr'],
  ['signals', 'initSignals'],
];

for (const [file, init] of components) {
  import(`./components/${file}.js`)
    .then(mod => mod[init]())
    .catch(err => console.error(`[fbl] component ${file} failed`, err));
}

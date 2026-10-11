/* Folion service worker: works offline after the first visit, and receives files shared to the installed app. */
const V = 'folion-bf019a2';
const CORE = ['./', 'index.html', 'app.css', 'folion.js', 'vendor/pdf.min.js', 'vendor/pdf.worker.min.js', 'vendor/pdf-lib.min.js', 'vendor/fabric.min.js', '../img/folion.svg', 'manifest.webmanifest'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(V).then((c) => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('folion-v') && k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method === 'POST' && u.pathname.endsWith('/share')) {
    e.respondWith((async () => {
      const fd = await e.request.formData(); const f = fd.get('file');
      if (f) { const c = await caches.open('folion-share'); await c.put('shared-file', new Response(f, { headers: { 'content-type': f.type, 'x-name': f.name } })); }
      return Response.redirect('./?shared=1', 303);
    })());
    return;
  }
  if (e.request.method !== 'GET') return;
  // app files: network first (always fresh), fall back to cache offline. Fonts and CDN: cache first.
  const same = u.origin === location.origin;
  if (same) e.respondWith(fetch(e.request).then((r) => { if (r.ok) { const cl = r.clone(); caches.open(V).then((c) => c.put(e.request, cl)); } return r; }).catch(() => caches.match(e.request, { ignoreSearch: true })));
  else if (/fonts\.(googleapis|gstatic)\.com|cdn\.jsdelivr\.net/.test(u.host)) e.respondWith(caches.match(e.request).then((m) => m || fetch(e.request).then((r) => { if (r.ok) { const cl = r.clone(); caches.open(V + '-ext').then((c) => c.put(e.request, cl)); } return r; })));
});

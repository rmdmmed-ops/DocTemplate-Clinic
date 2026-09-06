/*
  Service worker do DocTemplate Ortopedia.

  Objetivo: o app abrir e funcionar por completo sem internet — plantão com
  wi-fi ruim ou sem rede nenhuma. O conteúdo clínico nunca depende da rede.

  IMPORTANTE ao publicar uma versão nova:
  1. atualize os parâmetros ?v=N em index.html;
  2. atualize ASSETS abaixo com os mesmos ?v=N;
  3. mude CACHE (ex.: 3.2.0 -> 3.2.1).
  Sem isso, quem já instalou continua vendo a versão antiga.
*/

const CACHE = "doctemplate-4.1.0";

const ASSETS = [
  "./",
  "./index.html",
  "./styles.css?v=7",
  "./data.js?v=7",
  "./app.js?v=7",
  // A 3.2 preservada também fica offline: é a rota de volta durante um plantão,
  // e uma rota de volta que só funciona com internet não serve de nada.
  "./3.2/",
  "./3.2/index.html",
  "./3.2/styles.css?v=5",
  "./3.2/data.js?v=5",
  "./3.2/app.js?v=5",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon-180.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((name) => name !== CACHE).map((name) => caches.delete(name)));
      await self.clients.claim();
    })()
  );
});

// A página pede a troca imediata quando o usuário aceita atualizar.
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  if (new URL(request.url).origin !== self.location.origin) return;

  // Navegação: tenta a rede (para receber atualizações), cai no cache se falhar.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          const cache = await caches.open(CACHE);
          await cache.put(new URL(request.url).pathname.includes("/3.2/") ? "./3.2/index.html" : "./index.html", response.clone());
          return response;
        } catch (_) {
          // devolve a página pedida, não a da raiz: /3.2/ offline tem que abrir a 3.2
          return (await caches.match(request, { ignoreSearch: true })) ||
                 (await caches.match("./index.html")) ||
                 (await caches.match("./")) || Response.error();
        }
      })()
    );
    return;
  }

  // Demais arquivos: cache primeiro (são versionados por ?v=N), rede como reserva.
  event.respondWith(
    (async () => {
      const cached = await caches.match(request, { ignoreVary: true });
      if (cached) return cached;
      try {
        const response = await fetch(request);
        if (response && response.ok && response.type === "basic") {
          const cache = await caches.open(CACHE);
          await cache.put(request, response.clone());
        }
        return response;
      } catch (_) {
        return Response.error();
      }
    })()
  );
});

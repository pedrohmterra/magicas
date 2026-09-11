/* Caderno de mágicas — service worker
   Troque a versão abaixo sempre que publicar uma alteração no index.html. */
const VERSAO = "caderno-v1";
const SHELL = VERSAO + "-shell";
const RUNTIME = VERSAO + "-runtime";

const ARQUIVOS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(SHELL).then((c) => c.addAll(ARQUIVOS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((chaves) => Promise.all(
        chaves.filter((k) => k !== SHELL && k !== RUNTIME).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  const mesmaOrigem = url.origin === self.location.origin;

  // Navegação: rede primeiro, para pegar atualizações; cache se estiver offline.
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copia = res.clone();
          caches.open(SHELL).then((c) => c.put("./index.html", copia));
          return res;
        })
        .catch(() => caches.match("./index.html").then((r) => r || caches.match("./")))
    );
    return;
  }

  // Arquivos do app: cache primeiro.
  if (mesmaOrigem) {
    e.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        const copia = res.clone();
        caches.open(SHELL).then((c) => c.put(req, copia));
        return res;
      }))
    );
    return;
  }

  // Fontes e miniaturas do YouTube: serve o cache e atualiza por trás.
  e.respondWith(
    caches.match(req).then((hit) => {
      const rede = fetch(req).then((res) => {
        const copia = res.clone();
        caches.open(RUNTIME).then((c) => c.put(req, copia));
        return res;
      }).catch(() => hit);
      return hit || rede;
    })
  );
});

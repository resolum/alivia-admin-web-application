// Forwards /api/* to the backend so the browser stays on one origin, as the dev server proxy does locally.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const headers = new Headers(request.headers);
    // Same-origin for the browser, cross-origin for the backend: without this, Spring rejects it as CORS.
    headers.delete('Origin');
    return fetch(new Request(`${env.API_ORIGIN}${url.pathname}${url.search}`, new Request(request, { headers })));
  },
};

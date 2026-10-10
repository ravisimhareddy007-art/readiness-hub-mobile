// Server-rendered error page: it ships before any stylesheet, so it carries the light-theme values inline.
const E = { canvas: "#F6F7FA", paper: "#FFFFFF", ink: "#1B1626", muted: "#5D5869", border: "#D8D9E3", brand: "#5E3A99", onBrand: "#FFFFFF", h1: "1.25rem", radius: "8px" }; /* token-source */
export function renderErrorPage(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>This page didn't load</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { font: 15px/1.5 system-ui, -apple-system, sans-serif; background: ${E.canvas}; color: ${E.ink}; display: grid; place-items: center; min-height: 100vh; margin: 0; padding: 4px; }
      .card { max-width: 28rem; width: 100%; text-align: center; padding: 2rem; }
      h1 { font-size: ${E.h1}; margin: 0 0 0.5rem; }
      p { color: ${E.muted}; margin: 0 0 1.5rem; }
      .actions { display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap; }
      a, button { padding: 0.5rem 1rem; border-radius: ${E.radius}; font: inherit; cursor: pointer; text-decoration: none; border: 1px solid transparent; }
      .primary { background: ${E.brand}; color: ${E.onBrand}; }
      .secondary { background: ${E.paper}; color: ${E.ink}; border-color: ${E.border}; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>This page didn't load</h1>
      <p>Something went wrong on our end. You can try refreshing or head back home.</p>
      <div class="actions">
        <button class="primary" onclick="location.reload()">Try again</button>
        <a class="secondary" href="/">Go home</a>
      </div>
    </div>
  </body>
</html>`;
}

// Esconde do público arquivos internos do projeto (código, configuração).
const BLOQ = [/^\/lib\//, /^\/functions\//, /^\/wrangler\.toml$/i, /^\/\.git/, /^\/README/i, /^\/package(-lock)?\.json$/i];
export async function onRequest(ctx) {
  const p = new URL(ctx.request.url).pathname;
  if (BLOQ.some((r) => r.test(p))) return new Response("Not found", { status: 404 });
  return ctx.next();
}

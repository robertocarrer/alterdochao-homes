import { json } from "../../lib/auth.js";
// Público: nome e CRECI do corretor dono de um link de indicação.
export async function onRequestGet({ request, env }) {
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!id) return json({}, 404);
  const u = await env.DB.prepare("SELECT nome,creci,uf FROM usuarios WHERE id=? AND tipo='corretor' AND ativo=1").bind(id).first();
  return u ? json(u) : json({}, 404);
}

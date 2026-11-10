import { json, usuarioDe } from "../../../lib/auth.js";
// Admin: aprova ou suspende um corretor.
export async function onRequestPost({ request, env }) {
  const u = await usuarioDe(request, env);
  if (!u || u.tipo !== "admin") return json({ erro: "Acesso restrito." }, 403);
  const d = await request.json().catch(() => ({}));
  await env.DB.prepare("UPDATE usuarios SET ativo=? WHERE id=? AND tipo='corretor'").bind(d.ativo ? 1 : 0, Number(d.id)).run();
  return json({ ok: true });
}

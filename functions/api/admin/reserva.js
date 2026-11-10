import { json, usuarioDe } from "../../../lib/auth.js";
const STATUS = ["reservado", "sinal_pago", "concluido"];
// Admin: muda o status de uma reserva ou libera o lote.
export async function onRequestPost({ request, env }) {
  const u = await usuarioDe(request, env);
  if (!u || u.tipo !== "admin") return json({ erro: "Acesso restrito." }, 403);
  const d = await request.json().catch(() => ({}));
  const lote = Number(d.lote);
  if (d.acao === "liberar") { await env.DB.prepare("DELETE FROM reservas WHERE lote=?").bind(lote).run(); return json({ ok: true }); }
  if (!STATUS.includes(d.status)) return json({ erro: "Status inválido." }, 400);
  await env.DB.prepare("UPDATE reservas SET status=? WHERE lote=?").bind(d.status, lote).run();
  return json({ ok: true });
}

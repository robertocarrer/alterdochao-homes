import { json, limpa, usuarioDe } from "../../lib/auth.js";
import { enviaPara } from "../../lib/zap.js";
// O usuário logado salva a apikey do CallMeBot e recebe uma mensagem de teste.
export async function onRequestPost({ request, env }) {
  const u = await usuarioDe(request, env);
  if (!u) return json({ erro: "Entre para continuar." }, 401);
  const d = await request.json().catch(() => ({}));
  const key = limpa(d.key, 40).replace(/\s/g, "");
  if (!/^[A-Za-z0-9]{4,40}$/.test(key)) return json({ erro: "Cole a apikey que o CallMeBot enviou (só números e letras)." }, 400);
  await env.DB.prepare("UPDATE usuarios SET callmebot_key=? WHERE id=?").bind(key, u.id).run();
  if (u.tipo === "admin") {
    const row = await env.DB.prepare("SELECT valor FROM config WHERE chave='callmebot_admins'").first();
    const tel = String(u.zap || "").replace(/\D/g, "");
    const lista = (row ? row.valor.split(",") : []).filter((p) => p && !p.startsWith((tel.length <= 11 ? "55" : "") + tel + ":"));
    lista.push((tel.length <= 11 ? "55" : "") + tel + ":" + key);
    await env.DB.prepare("INSERT OR REPLACE INTO config (chave,valor) VALUES ('callmebot_admins',?)").bind(lista.join(",")).run();
  }
  await enviaPara(env, [{ tel: u.zap, key }], "Alertas do Porto Novo ativados. Você vai receber aqui as novas reservas.");
  return json({ ok: true });
}

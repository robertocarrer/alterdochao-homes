import { json, limpa, hashSenha, criaSessao } from "../../lib/auth.js";
export async function onRequestPost({ request, env }) {
  let d; try { d = await request.json(); } catch { return json({ erro: "Dados inválidos." }, 400); }
  const email = limpa(d.email, 120).toLowerCase(), senha = String(d.senha || "");
  const u = await env.DB.prepare("SELECT id, senha_hash, salt FROM usuarios WHERE email=?").bind(email).first();
  const h = await hashSenha(senha, u ? u.salt : "00");
  if (!u || h !== u.senha_hash) return json({ erro: "E-mail ou senha incorretos." }, 401);
  return json({ ok: true }, 200, { "set-cookie": await criaSessao(env, u.id) });
}

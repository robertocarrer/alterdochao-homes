// Utilidades compartilhadas: senha, sessão e respostas.
const enc = new TextEncoder();
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");

export const json = (obj, status = 200, headers = {}) =>
  new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json", "cache-control": "no-store", ...headers } });

export const limpa = (v, max) => String(v == null ? "" : v).trim().slice(0, max);

export function novoSalt() { return hex(crypto.getRandomValues(new Uint8Array(16))); }

export async function hashSenha(senha, salt) {
  const chave = await crypto.subtle.importKey("raw", enc.encode(senha), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: enc.encode(salt), iterations: 100000 }, chave, 256);
  return hex(bits);
}

export async function criaSessao(env, usuarioId) {
  const token = hex(crypto.getRandomValues(new Uint8Array(32)));
  await env.DB.prepare("INSERT INTO sessoes (token, usuario_id, expira) VALUES (?, ?, datetime('now','+30 days'))").bind(token, usuarioId).run();
  return `pn_s=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`;
}

export function tokenDe(request) {
  const m = (request.headers.get("cookie") || "").match(/(?:^|;\s*)pn_s=([a-f0-9]{64})/);
  return m ? m[1] : null;
}

export async function usuarioDe(request, env) {
  const token = tokenDe(request);
  if (!token) return null;
  return await env.DB.prepare(
    "SELECT u.id,u.tipo,u.nome,u.creci,u.uf,u.cidade,u.email,u.zap,u.ativo FROM sessoes s JOIN usuarios u ON u.id=s.usuario_id WHERE s.token=? AND s.expira > datetime('now')"
  ).bind(token).first();
}

export function preco(n) {
  if (n <= 3 || (n >= 53 && n <= 55)) return 40000;
  if ((n >= 4 && n <= 32) || (n >= 56 && n <= 84)) return 30000;
  return 20000;
}

export function cpfValido(c) {
  c = String(c).replace(/\D/g, "");
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
  for (let t = 9; t < 11; t++) {
    let s = 0;
    for (let i = 0; i < t; i++) s += Number(c[i]) * (t + 1 - i);
    if (((s * 10) % 11) % 10 !== Number(c[t])) return false;
  }
  return true;
}

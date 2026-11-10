import { json, tokenDe } from "../../lib/auth.js";
export async function onRequestPost({ request, env }) {
  const t = tokenDe(request);
  if (t) await env.DB.prepare("DELETE FROM sessoes WHERE token=?").bind(t).run();
  return json({ ok: true }, 200, { "set-cookie": "pn_s=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0" });
}

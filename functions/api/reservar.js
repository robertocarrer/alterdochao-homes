// Registra a reserva de um lote. Um lote só pode ter uma reserva.
const VALIDOS = new Set([...Array(103).keys()].map(i => i + 1).filter(n => n !== 87));
const limpa = (v, max) => String(v == null ? "" : v).trim().slice(0, max);

export async function onRequestPost({ request, env }) {
  let d;
  try { d = await request.json(); } catch { return Response.json({ erro: "Dados inválidos." }, { status: 400 }); }
  const lote = Number(d.lote);
  const nome = limpa(d.nome, 120), zap = limpa(d.zap, 30);
  if (!VALIDOS.has(lote)) return Response.json({ erro: "Lote inválido." }, { status: 400 });
  if (nome.split(/\s+/).length < 2) return Response.json({ erro: "Digite seu nome e sobrenome." }, { status: 400 });
  if (zap.replace(/\D/g, "").length < 10) return Response.json({ erro: "Digite o WhatsApp com DDD." }, { status: 400 });

  const ip = request.headers.get("cf-connecting-ip") || "";
  const usados = await env.DB.prepare("SELECT COUNT(*) AS n FROM reservas WHERE ip = ? AND criado > datetime('now','-1 day')").bind(ip).first();
  if (ip && usados && usados.n >= 3) return Response.json({ erro: "Limite de 3 reservas por dia atingido. Fale com a equipe pelo WhatsApp." }, { status: 429 });

  const codigo = "PN-" + String(lote).padStart(3, "0") + "-" + crypto.randomUUID().slice(0, 4).toUpperCase();
  try {
    await env.DB.prepare("INSERT INTO reservas (lote,codigo,nome,zap,email,cidade,corretor,creci,czap,ip) VALUES (?,?,?,?,?,?,?,?,?,?)")
      .bind(lote, codigo, nome, zap, limpa(d.email, 120), limpa(d.cidade, 80), limpa(d.corretor, 120), limpa(d.creci, 30), limpa(d.czap, 30), ip).run();
  } catch (e) {
    return Response.json({ erro: "Este lote acabou de ser reservado por outra pessoa. Escolha outro." }, { status: 409 });
  }
  return Response.json({ ok: true, lote, codigo });
}

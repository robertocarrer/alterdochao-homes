// Registra a reserva de um lote. Um lote só pode ter uma reserva.
import { json, limpa, usuarioDe } from "../../lib/auth.js";
const VALIDOS = new Set([...Array(103).keys()].map((i) => i + 1).filter((n) => n !== 87));

export async function onRequestPost({ request, env }) {
  let d; try { d = await request.json(); } catch { return json({ erro: "Dados inválidos." }, 400); }
  const lote = Number(d.lote), nome = limpa(d.nome, 120), zap = limpa(d.zap, 30);
  if (!VALIDOS.has(lote)) return json({ erro: "Lote inválido." }, 400);
  if (nome.split(/\s+/).length < 2) return json({ erro: "Digite seu nome e sobrenome." }, 400);
  if (zap.replace(/\D/g, "").length < 10) return json({ erro: "Digite o WhatsApp com DDD." }, 400);

  // Corretor da venda: quem está logado, o dono do link de indicação, ou o CRECI informado.
  let cor = null;
  const eu = await usuarioDe(request, env);
  if (eu && eu.tipo === "corretor") cor = eu;
  if (!cor && Number(d.ref)) cor = await env.DB.prepare("SELECT id,nome,creci,zap FROM usuarios WHERE id=? AND tipo='corretor' AND ativo=1").bind(Number(d.ref)).first();
  const creciInf = limpa(d.creci, 30).toUpperCase();
  if (!cor && creciInf) cor = await env.DB.prepare("SELECT id,nome,creci,zap FROM usuarios WHERE creci=? AND tipo='corretor' AND ativo=1").bind(creciInf).first();

  const ip = request.headers.get("cf-connecting-ip") || "";
  if (!cor) {
    const usados = await env.DB.prepare("SELECT COUNT(*) AS n FROM reservas WHERE ip = ? AND criado > datetime('now','-1 day')").bind(ip).first();
    if (ip && usados && usados.n >= 3) return json({ erro: "Limite de 3 reservas por dia atingido. Fale com a equipe pelo WhatsApp." }, 429);
  }
  const codigo = "PN-" + String(lote).padStart(3, "0") + "-" + crypto.randomUUID().slice(0, 4).toUpperCase();
  try {
    await env.DB.prepare("INSERT INTO reservas (lote,codigo,nome,zap,email,cidade,corretor,creci,czap,ip,corretor_id) VALUES (?,?,?,?,?,?,?,?,?,?,?)")
      .bind(lote, codigo, nome, zap, limpa(d.email, 120), limpa(d.cidade, 80),
        cor ? cor.nome : limpa(d.corretor, 120), cor ? cor.creci : creciInf, cor ? cor.zap : limpa(d.czap, 30), ip, cor ? cor.id : null).run();
  } catch (e) {
    return json({ erro: "Este lote acabou de ser reservado por outra pessoa. Escolha outro." }, 409);
  }
  return json({ ok: true, lote, codigo, corretor: cor ? { nome: cor.nome, creci: cor.creci } : null });
}

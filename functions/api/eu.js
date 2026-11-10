import { json, usuarioDe, preco } from "../../lib/auth.js";
// Dados do painel: corretor vê as próprias reservas; admin vê tudo.
export async function onRequestGet({ request, env }) {
  const u = await usuarioDe(request, env);
  if (!u) return json({ erro: "Entre para continuar." }, 401);
  const comValor = (rows) => rows.map((r) => ({ ...r, valor: preco(r.lote) }));
  if (u.tipo === "admin") {
    const res = await env.DB.prepare("SELECT r.lote,r.codigo,r.nome,r.zap,r.email,r.cidade,r.corretor,r.creci,r.status,r.criado,r.corretor_id,u.nome AS corretor_nome FROM reservas r LEFT JOIN usuarios u ON u.id=r.corretor_id ORDER BY r.criado DESC").all();
    const cor = await env.DB.prepare("SELECT id,nome,creci,uf,cidade,email,zap,ativo,criado FROM usuarios WHERE tipo='corretor' ORDER BY criado DESC").all();
    return json({ usuario: u, reservas: comValor(res.results), corretores: cor.results });
  }
  const res = await env.DB.prepare("SELECT lote,codigo,nome,zap,status,criado FROM reservas WHERE corretor_id=? ORDER BY criado DESC").bind(u.id).all();
  return json({ usuario: u, reservas: comValor(res.results) });
}

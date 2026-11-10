import { json, limpa, novoSalt, hashSenha, criaSessao, cpfValido } from "../../lib/auth.js";
const UFS = "AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(" ");

// Cadastro público de corretor. Entra como "aguardando aprovação".
export async function onRequestPost({ request, env }) {
  let d; try { d = await request.json(); } catch { return json({ erro: "Dados inválidos." }, 400); }
  const nome = limpa(d.nome, 120), cpf = limpa(d.cpf, 20).replace(/\D/g, ""), creci = limpa(d.creci, 30).toUpperCase(),
    uf = limpa(d.uf, 2).toUpperCase(), cidade = limpa(d.cidade, 80), email = limpa(d.email, 120).toLowerCase(),
    zap = limpa(d.zap, 30), senha = String(d.senha || "");
  if (nome.split(/\s+/).length < 2) return json({ erro: "Digite nome e sobrenome." }, 400);
  if (!cpfValido(cpf)) return json({ erro: "CPF inválido." }, 400);
  if (creci.length < 3) return json({ erro: "Informe o número do CRECI." }, 400);
  if (!UFS.includes(uf)) return json({ erro: "Escolha o estado." }, 400);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ erro: "E-mail inválido." }, 400);
  if (zap.replace(/\D/g, "").length < 10) return json({ erro: "Digite o WhatsApp com DDD." }, 400);
  if (senha.length < 8) return json({ erro: "A senha precisa ter pelo menos 8 caracteres." }, 400);
  const salt = novoSalt(), h = await hashSenha(senha, salt);
  let r;
  try {
    r = await env.DB.prepare("INSERT INTO usuarios (tipo,nome,cpf,creci,uf,cidade,email,zap,senha_hash,salt,ativo) VALUES ('corretor',?,?,?,?,?,?,?,?,?,0)")
      .bind(nome, cpf, creci, uf, cidade, email, zap, h, salt).run();
  } catch (e) { return json({ erro: "Já existe um cadastro com este e-mail. Use Entrar." }, 409); }
  const cookie = await criaSessao(env, r.meta.last_row_id);
  return json({ ok: true }, 200, { "set-cookie": cookie });
}

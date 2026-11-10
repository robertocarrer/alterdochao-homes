// Alertas de nova reserva pelo WhatsApp (Z-API).
// Credenciais e números ficam na tabela config: zapi_instancia, zapi_token, zapi_client_token, alerta_admins (números separados por vírgula).
const num = (z) => { let n = String(z || "").replace(/\D/g, ""); if (n.length === 10 || n.length === 11) n = "55" + n; return n; };

async function cfg(env) {
  const { results } = await env.DB.prepare("SELECT chave, valor FROM config").all();
  return Object.fromEntries(results.map((r) => [r.chave, r.valor]));
}

async function envia(c, telefone, mensagem) {
  const url = `https://api.z-api.io/instances/${c.zapi_instancia}/token/${c.zapi_token}/send-text`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...(c.zapi_client_token ? { "Client-Token": c.zapi_client_token } : {}) },
    body: JSON.stringify({ phone: telefone, message: mensagem }),
  });
  return r.status;
}

export async function alertaReserva(env, r) {
  const c = await cfg(env);
  if (!c.zapi_instancia || !c.zapi_token) return;
  const destinos = new Set((c.alerta_admins || "").split(",").map(num).filter(Boolean));
  if (r.corretorZap) destinos.add(num(r.corretorZap));
  const site = "https://portonovo.alterdochao.group/painel/";
  const msg =
    `*Nova reserva no Porto Novo*\n\n` +
    `Lote: *${r.lote}* (${r.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })})\n` +
    `Cliente: ${r.nome}\n` +
    `WhatsApp: ${r.zap}\n` +
    (r.email ? `E-mail: ${r.email}\n` : "") +
    (r.cidade ? `Cidade: ${r.cidade}\n` : "") +
    `Corretor: ${r.corretorNome ? r.corretorNome + " (CRECI " + r.corretorCreci + ")" : "sem corretor"}\n` +
    `Código: ${r.codigo}\n\n` +
    `Falar com o cliente: https://wa.me/${num(r.zap)}\n` +
    `Painel: ${site}`;
  await Promise.all([...destinos].map((d) => envia(c, d, msg).catch(() => 0)));
}

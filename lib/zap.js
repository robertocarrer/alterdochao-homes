// Alertas de nova reserva pelo WhatsApp.
// 1) Gratuito: CallMeBot. Cada destinatário ativa o próprio número e recebe uma apikey.
//    Admins: config.callmebot_admins = "5593991272550:APIKEY,55...:APIKEY". Corretores: usuarios.callmebot_key.
// 2) Pago (opcional): Z-API, se config.zapi_instancia/zapi_token existirem e a instância estiver ativa.
const num = (z) => { let n = String(z || "").replace(/\D/g, ""); if (n.length === 10 || n.length === 11) n = "55" + n; return n; };

async function cfg(env) {
  const { results } = await env.DB.prepare("SELECT chave, valor FROM config").all();
  return Object.fromEntries(results.map((r) => [r.chave, r.valor]));
}

async function callmebot(telefone, apikey, msg) {
  const u = `https://api.callmebot.com/whatsapp.php?phone=%2B${telefone}&apikey=${encodeURIComponent(apikey)}&text=${encodeURIComponent(msg)}`;
  const r = await fetch(u);
  return r.ok;
}

async function zapi(c, telefone, msg) {
  const r = await fetch(`https://api.z-api.io/instances/${c.zapi_instancia}/token/${c.zapi_token}/send-text`, {
    method: "POST",
    headers: { "content-type": "application/json", ...(c.zapi_client_token ? { "Client-Token": c.zapi_client_token } : {}) },
    body: JSON.stringify({ phone: telefone, message: msg }),
  });
  return r.ok;
}

export function mensagem(r) {
  const valor = Number(r.valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  return `*Nova reserva no Porto Novo*\n\nChácara: *${r.lote}* (${valor})\nCliente: ${r.nome}\nWhatsApp: ${r.zap}\n` +
    (r.email ? `E-mail: ${r.email}\n` : "") + (r.cidade ? `Cidade: ${r.cidade}\n` : "") +
    `Corretor: ${r.corretorNome ? r.corretorNome + " (CRECI " + r.corretorCreci + ")" : "sem corretor"}\nCódigo: ${r.codigo}\n\n` +
    `Falar com o cliente: https://wa.me/${num(r.zap)}\nPainel: https://alterdochao.estate/painel/`;
}

// destinos: [{ tel, key }] ; key = apikey do CallMeBot (pode ser vazia)
export async function enviaPara(env, destinos, msg) {
  const c = await cfg(env);
  const usaZapi = c.zapi_instancia && c.zapi_token && c.zapi_ativa === "1";
  const vistos = new Set();
  await Promise.all(destinos.map(async (d) => {
    const tel = num(d.tel); if (!tel || vistos.has(tel)) return; vistos.add(tel);
    if (d.key) { try { if (await callmebot(tel, d.key, msg)) return; } catch (e) {} }
    if (usaZapi) { try { await zapi(c, tel, msg); } catch (e) {} }
  }));
}

export async function alertaReserva(env, r) {
  const c = await cfg(env);
  const destinos = (c.callmebot_admins || "").split(",").map((p) => p.trim()).filter(Boolean)
    .map((p) => { const [tel, key] = p.split(":"); return { tel, key }; });
  if (!destinos.length) (c.alerta_admins || "").split(",").filter(Boolean).forEach((tel) => destinos.push({ tel, key: "" }));
  if (r.corretorZap) destinos.push({ tel: r.corretorZap, key: r.corretorKey || "" });
  await enviaPara(env, destinos, mensagem(r));
}

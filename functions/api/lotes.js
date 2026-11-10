// Lista só os números dos lotes reservados (sem dados pessoais).
export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare("SELECT lote FROM reservas ORDER BY lote").all();
  return Response.json({ reservados: results.map(r => r.lote) }, { headers: { "cache-control": "no-store" } });
}

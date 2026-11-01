function json(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff"
    }
  });
}

export const onRequestGet = async () =>
  json({ ok: true, service: "orvynn-agent", mode: "payment-preparation-only", chainId: 5042 });

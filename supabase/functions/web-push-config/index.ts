// The VAPID public key is public by design; private signing material stays server-side.
const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
Deno.serve(req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers });
  if (req.method !== 'GET') return new Response('{}', { status: 405, headers });
  const publicKey = Deno.env.get('WEB_PUSH_VAPID_PUBLIC_KEY');
  const ready = !!publicKey && !!Deno.env.get('WEB_PUSH_VAPID_PRIVATE_KEY') && !!Deno.env.get('WEB_PUSH_VAPID_SUBJECT');
  return new Response(JSON.stringify({ publicKey: ready ? publicKey : null }), { headers, status: ready ? 200 : 503 });
});

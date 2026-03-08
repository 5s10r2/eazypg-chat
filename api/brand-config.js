/** GET /api/brand-config?brand={uuid} → /brand-config?token={uuid} (public, no auth) */
export const config = { runtime: 'edge' };

const BACKEND = process.env.BACKEND_URL || 'https://claude-booking-bot.onrender.com';

export default async function handler(req) {
  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }

  const url = new URL(req.url);
  const token = url.searchParams.get('brand') || '';

  if (!token) {
    return new Response('{"error":"missing brand token"}', {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const upstream = await fetch(
    `${BACKEND}/brand-config?token=${encodeURIComponent(token)}`
  );

  const body = await upstream.text();
  return new Response(body, {
    status: upstream.status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Vercel serverless function — generates a temporary Deepgram token
// The DEEPGRAM_API_KEY env var is set in Vercel dashboard, never exposed to browser

export default async function handler(req, res) {
  const key = process.env.DEEPGRAM_API_KEY;
  if (!key) {
    return res.status(500).json({ error: 'Deepgram not configured' });
  }

  try {
    const response = await fetch('https://api.deepgram.com/v1/auth/grant', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      console.error('[deepgram-token] Deepgram API error:', response.status, errText);
      return res.status(502).json({ error: 'Could not generate token' });
    }

    const data = await response.json();
    return res.status(200).json({ token: data.access_token });

  } catch (err) {
    console.error('[deepgram-token] Error:', err.message);
    return res.status(500).json({ error: 'Internal error' });
  }
}

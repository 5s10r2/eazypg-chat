export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const upstream = await fetch(
      "https://claude-booking-bot.onrender.com/feedback",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req.body),
      }
    );

    if (!upstream.ok) {
      const text = await upstream.text();
      return res
        .status(upstream.status)
        .json({ error: text || "Backend error" });
    }

    const data = await upstream.json();
    return res.status(200).json(data);
  } catch (err) {
    console.error("Proxy error:", err);
    return res.status(502).json({ error: "Could not reach backend" });
  }
}

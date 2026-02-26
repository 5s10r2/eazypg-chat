export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const range = req.query.time_range || "7d";
    const upstream = await fetch(
      `https://claude-booking-bot.onrender.com/admin/analytics?time_range=${encodeURIComponent(range)}`,
      { method: "GET", headers: { "Accept": "application/json" } }
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
    console.error("Analytics proxy error:", err);
    return res.status(502).json({ error: "Could not reach backend" });
  }
}

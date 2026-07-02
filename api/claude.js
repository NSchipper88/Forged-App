// FORGE — server-side Anthropic proxy.
// The API key lives here as a Vercel environment variable (ANTHROPIC_API_KEY),
// never in the browser. All AI calls from the app route through this function.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { messages, system, max_tokens } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "messages required" });
  }

  // Basic abuse guards: cap sizes so a bad actor can't run up the bill
  const totalChars = JSON.stringify(messages).length + (system || "").length;
  if (totalChars > 60000 || messages.length > 60) {
    return res.status(413).json({ error: "Request too large" });
  }

  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: Math.min(max_tokens || 1000, 1500),
        system,
        messages,
      }),
    });

    const data = await upstream.json();
    if (!upstream.ok) {
      console.error("Anthropic error:", upstream.status, JSON.stringify(data).slice(0, 300));
      return res.status(upstream.status).json(data);
    }
    return res.status(200).json(data);
  } catch (e) {
    console.error("Proxy failure:", e.message);
    return res.status(502).json({ error: "Upstream failure" });
  }
}

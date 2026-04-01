const TMDB_BASE = "https://api.themoviedb.org/3";

export default async function handler(req, res) {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "Missing TMDB_API_KEY" });
    return;
  }

  const id = typeof req.query.id === "string" ? req.query.id : "";
  if (!id) {
    res.status(400).json({ error: "Missing id" });
    return;
  }

  const language = typeof req.query.language === "string" ? req.query.language : "ko-KR";
  const url = new URL(`${TMDB_BASE}/movie/${encodeURIComponent(id)}`);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("language", language);

  try {
    const r = await fetch(url.toString(), { headers: { accept: "application/json" } });
    const text = await r.text();

    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    res.status(r.status).send(text);
  } catch (e) {
    res.status(500).json({ error: e?.message || "Upstream fetch failed" });
  }
}

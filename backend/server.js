import express from "express";
import cors from "cors";
import "dotenv/config";

const app = express();
const PORT = process.env.PORT || 3000;
const RIOT_API_KEY = process.env.RIOT_API_KEY;

app.use(cors({ origin: process.env.FRONTEND_ORIGIN || true }));
app.use(express.json({ limit: "20kb" }));

const regions = {
  EUW: { account: "europe", valorant: "eu" },
  EUNE: { account: "europe", valorant: "eu" },
  NA: { account: "americas", valorant: "na" },
  BR: { account: "americas", valorant: "br" },
  LATAM: { account: "americas", valorant: "latam" },
  AP: { account: "asia", valorant: "ap" },
  KR: { account: "asia", valorant: "kr" }
};

function splitRiotId(value) {
  const [gameName, tagLine] = String(value || "").split("#");
  if (!gameName || !tagLine || gameName.length > 30 || tagLine.length > 10) return null;
  return { gameName: gameName.trim(), tagLine: tagLine.trim() };
}

async function riotGet(url) {
  if (!RIOT_API_KEY) throw new Error("RIOT_API_KEY is not configured");
  const response = await fetch(url, {
    headers: {
      "X-Riot-Token": RIOT_API_KEY,
      "Accept": "application/json"
    }
  });
  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { message: text }; }
  if (!response.ok) {
    const error = new Error(data?.status?.message || data?.message || `Riot API ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return data;
}

app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "VALOHUB API" });
});

app.get("/api/player", async (req, res) => {
  const parsed = splitRiotId(req.query.riotId);
  const region = String(req.query.region || "EUW").toUpperCase();
  const route = regions[region];

  if (!parsed) return res.status(400).json({ error: "Riot ID invalide. Utilise Pseudo#TAG." });
  if (!route) return res.status(400).json({ error: "Région non supportée." });

  try {
    const account = await riotGet(
      `https://${route.account}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(parsed.gameName)}/${encodeURIComponent(parsed.tagLine)}`
    );

    const puuid = account.puuid;
    let matches = [];
    try {
      const matchData = await riotGet(
        `https://${route.valorant}.api.riotgames.com/val/match/v1/matchlists/by-puuid/${encodeURIComponent(puuid)}`
      );
      matches = matchData.history || [];
    } catch (error) {
      if (![403, 404].includes(error.status)) throw error;
    }

    res.json({
      success: true,
      player: {
        gameName: account.gameName,
        tagLine: account.tagLine,
        puuid,
        region,
        matches
      }
    });
  } catch (error) {
    console.error("Riot API error:", error.message);
    const status = error.status === 404 ? 404 : error.status === 429 ? 429 : 502;
    res.status(status).json({
      error: status === 404 ? "Joueur introuvable." : status === 429 ? "Trop de recherches. Réessaie dans un moment." : "Impossible de contacter Riot API.",
      detail: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
});

app.listen(PORT, () => console.log(`VALOHUB API running on port ${PORT}`));

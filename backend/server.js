import express from "express";
import cors from "cors";
import "dotenv/config";

const app = express();
const PORT = Number(process.env.PORT || 3000);
const RIOT_API_KEY = process.env.RIOT_API_KEY;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:5500";
const regions = { EUW:{account:"europe",valorant:"eu"}, EUNE:{account:"europe",valorant:"eu"}, NA:{account:"americas",valorant:"na"}, BR:{account:"americas",valorant:"br"}, LATAM:{account:"americas",valorant:"latam"}, AP:{account:"asia",valorant:"ap"}, KR:{account:"asia",valorant:"kr"} };
const allowedOrigins = FRONTEND_ORIGIN.split(",").map(v=>v.trim()).filter(Boolean);
app.use(cors({origin(origin,cb){if(!origin||allowedOrigins.includes("*")||allowedOrigins.includes(origin))return cb(null,true);return cb(new Error("Origin not allowed by VALOHUB API"));},methods:["GET"],allowedHeaders:["Content-Type"]}));
app.use(express.json({limit:"20kb"}));
const requestLog=new Map(), WINDOW_MS=60000, MAX_REQUESTS=30;
function rateLimit(req,res,next){const key=req.ip||"unknown",now=Date.now(),entry=requestLog.get(key)||{start:now,count:0};if(now-entry.start>WINDOW_MS){entry.start=now;entry.count=0;}entry.count++;requestLog.set(key,entry);if(entry.count>MAX_REQUESTS)return res.status(429).json({error:"Trop de requêtes. Réessaie dans une minute."});next();}
app.use("/api",rateLimit);
function splitRiotId(value){const raw=String(value||"").trim(),i=raw.lastIndexOf("#");if(i<=0)return null;const gameName=raw.slice(0,i).trim(),tagLine=raw.slice(i+1).trim();if(!gameName||!tagLine||gameName.length>30||tagLine.length>10)return null;return{gameName,tagLine};}
async function riotGet(url){if(!RIOT_API_KEY){const e=new Error("RIOT_API_KEY is not configured");e.status=500;throw e;}const response=await fetch(url,{headers:{"X-Riot-Token":RIOT_API_KEY,Accept:"application/json"}}),text=await response.text();let data;try{data=JSON.parse(text);}catch{data={message:text};}if(!response.ok){const e=new Error(data?.status?.message||data?.message||`Riot API ${response.status}`);e.status=response.status;throw e;}return data;}
app.get("/api/health",(req,res)=>res.json({ok:true,service:"VALOHUB API",version:"1.1.0"}));
app.get("/api/player",async(req,res)=>{const parsed=splitRiotId(req.query.riotId),region=String(req.query.region||"EUW").toUpperCase(),route=regions[region];if(!parsed)return res.status(400).json({error:"Riot ID invalide. Utilise Pseudo#TAG."});if(!route)return res.status(400).json({error:"Région non supportée."});try{const account=await riotGet(`https://${route.account}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(parsed.gameName)}/${encodeURIComponent(parsed.tagLine)}`);let matches=[];try{const matchData=await riotGet(`https://${route.valorant}.api.riotgames.com/val/match/v1/matchlists/by-puuid/${encodeURIComponent(account.puuid)}`);matches=Array.isArray(matchData.history)?matchData.history:[];}catch(e){if(![403,404].includes(e.status))throw e;}res.json({success:true,player:{gameName:account.gameName,tagLine:account.tagLine,puuid:account.puuid,region,matches,note:"Les données de classement/statistiques détaillées nécessitent les endpoints Riot autorisés par ton application."}});}catch(error){console.error("Riot API error:",error.message);const status=error.status===404?404:error.status===429?429:error.status===403?403:502;const messages={403:"L'accès à cet endpoint Riot n'est pas autorisé pour cette clé/application.",404:"Joueur introuvable.",429:"Trop de recherches. Réessaie dans un moment.",502:"Impossible de contacter Riot API."};res.status(status).json({error:messages[status],detail:process.env.NODE_ENV==="development"?error.message:undefined});}});
app.use((err,req,res,next)=>{if(err?.message?.includes("Origin not allowed"))return res.status(403).json({error:"Origine non autorisée."});console.error(err);res.status(500).json({error:"Erreur interne VALOHUB."});});
app.listen(PORT,()=>console.log(`VALOHUB API running on port ${PORT}`));

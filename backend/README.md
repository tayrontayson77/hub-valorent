# VALOHUB API

Backend sécurisé pour VALOHUB. La clé Riot reste côté serveur dans `RIOT_API_KEY` et n'est jamais envoyée au navigateur.

## Variables

- `RIOT_API_KEY` : clé Riot, uniquement dans les variables d'environnement du serveur.
- `FRONTEND_ORIGIN` : URL GitHub Pages de VALOHUB, par exemple `https://tayrontayson77.github.io` ou l'URL exacte de ton site.
- `PORT` : fourni automatiquement par l'hébergeur.

## Local

```bash
npm install
npm start
```

Tester : `GET /api/health`

Recherche : `GET /api/player?riotId=Pseudo%23TAG&region=EUW`

## Render

Le fichier `render.yaml` prépare le service. Dans Render, connecte le dépôt, sélectionne le service `valohub-api`, puis renseigne les deux secrets :

- `RIOT_API_KEY`
- `FRONTEND_ORIGIN`

Ne commit jamais un fichier `.env`.

## Important

Le backend ne prétend pas fabriquer un rang ou des statistiques quand Riot ne fournit pas l'endpoint autorisé. Il renvoie uniquement les données réellement obtenues et signale les endpoints non autorisés.

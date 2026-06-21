# Costco Chaos — Dev Cheatsheet

## Run locally

```bash
npm install      # first time / after dep changes
npm run dev      # http://localhost:5173/  (hard refresh Cmd+Shift+R if stale)
```

### Port 5173 already in use

Vite is pinned to port 5173 (`strictPort: true` in `vite.config.ts`). If a previous dev server is still running, free the port and restart:

```bash
kill $(lsof -ti :5173)
npm run dev
```

## Deploy (Cloudflare Pages)

Hosted on **Cloudflare Pages** at https://costco-chaos.pages.dev — one command:

```bash
npm run deploy
```

That runs `VITE_BASE=/ npm run build` then `wrangler pages deploy dist`. The
`OLLAMA_API_KEY` secret lives in the Cloudflare project and persists across
deploys — you never re-enter it.

Then back up to GitHub:

```bash
git add -A && git commit -m "..." && git push
```

### First-time wrangler auth (new machine)

```bash
npx wrangler login    # opens browser, approve
```

### If the Cloudflare project is ever deleted / lost

Recreate and re-add the secret (project name must be `costco-chaos` to keep the URL):

```bash
npx wrangler pages project create costco-chaos --production-branch main
npm run deploy
npx wrangler pages secret put OLLAMA_API_KEY --project-name costco-chaos   # paste key at prompt
npm run deploy        # redeploy so the worker picks up the key
```

> The Ollama key is **never** in the repo or in chat. It lives only in the
> Cloudflare encrypted secret. If lost, rotate at https://ollama.com/settings/keys.

## Base path note

- Local dev + Apache builds default to base `/costco-chaos/`.
- Cloudflare serves at root — `npm run deploy` sets `VITE_BASE=/` automatically.
- Don't run a bare `npm run build` for a Cloudflare deploy; use `npm run deploy`.

## In-game shortcuts

| Key | Action |
|---|---|
| W/A/S/D · arrows | Drive / steer |
| I | Skip parking → warehouse |
| O | Test checkout (shopping phase) |
| G | God mode — remove all NPCs (toggle) |
| P | Trigger spouse SMS interlude |
| 1–6 | Switch checkout lane |

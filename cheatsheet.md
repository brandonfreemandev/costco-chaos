# Costco Chaos — Dev Cheatsheet

## Port 5173 already in use

Vite is pinned to port 5173 (`strictPort: true` in `vite.config.ts`). If a previous dev server is still running, free the port and restart:

```bash
kill $(lsof -ti :5173)
npm run dev
```

Then open http://localhost:5173/

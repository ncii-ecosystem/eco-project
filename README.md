# ncii-ecosystem 🧩

## Frontend

```bash
npm run site
```

Open [http://localhost:8000](http://localhost:8000)

The local server serves `shell.html` for site pages. Its shared navbar stays mounted while `src/shared/router.js` changes the content iframe and browser history. Each content document retains its own scripts; `?content=1` loads a page directly without the shell. No page-transition API or framework is used.

Needs a `.env` in the project root with `SANITY_PROJECT_ID`, `SANITY_DATASET`, and `SANITY_WRITE_TOKEN` (for public submit).

## Backend (Sanity Studio)

```bash
npm install --prefix studio
npm run studio
```

Open [http://localhost:3333](http://localhost:3333)

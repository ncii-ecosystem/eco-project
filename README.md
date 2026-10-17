<h1><img src="assets/logo.svg" alt="" width="25" height="25" /> ncii-ecosystem <img src="assets/logo.svg" alt="" width="25" height="25" /></h1>

## Frontend

```bash
npm run site
```

Open [http://localhost:8000](http://localhost:8000)

## Backend (Sanity Studio)

```bash
npm install --prefix studio
npm run studio
```

Open [http://localhost:3333](http://localhost:3333)

## Project structure

- `src/`: editable pages, shared frontend code, and the local server.
- `assets/`: original images used by the site.
- `studio/`: Sanity Studio; `workers/`: the submission backend.
- `docs/`: generated GitHub Pages site. After editing `src/` or `assets/`, run `npm run build:pages` to refresh `docs/` and clear out old files.

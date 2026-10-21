<h1 align="center">
  <img src="assets/logo.svg" alt="" width="25" height="25" />
  ncii-ecosystem
  <img src="assets/logo.svg" alt="" width="25" height="25" />
</h1>

<p align="center">An interactive story, living evidence database, and support resources for understanding deepfake abuse.</p>

<p align="center">
  <a href="https://ncii-ecosystem.org">Visit the site ↗</a>
  &nbsp; · &nbsp;
  <a href="https://arxiv.org/abs/2602.04759">Read the paper ↗</a>
</p>

---

## Run locally

**Website** · [localhost:8000](http://localhost:8000)

```bash
npm run site
```

**Sanity Studio** · [localhost:3333](http://localhost:3333)

```bash
npm install --prefix studio
npm run studio
```

## Publish changes

After editing `src/` or `assets/`, run this to refresh `docs/` and clear out old files:

```bash
npm run build:pages
```

Commit the updated `docs/` files alongside your source changes.

<details>
<summary><strong>Submission backend · Cloudflare Worker</strong></summary>

After changing the submission Worker, deploy it from the project root:

```bash
npx wrangler deploy
```

Pushing to GitHub updates the website but doesn't deploy the Worker.

</details>

## Around the project

| Folder | What's inside |
| --- | --- |
| `src/` | Pages, shared frontend code, and the local server |
| `assets/` | Images used by the site |
| `studio/` | Sanity Studio |
| `workers/` | Submission backend |
| `docs/` | Generated GitHub Pages site |

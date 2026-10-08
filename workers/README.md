# Submission worker

This Worker receives public database submissions and creates **draft** `caseStudy` documents in Sanity. The public site never receives the write token.

## Deploy

1. Install and authenticate Wrangler: `npx wrangler login`
2. Create the Worker: `npx wrangler deploy`
3. Add the secret when prompted: `npx wrangler secret put SANITY_WRITE_TOKEN`
4. Copy the Worker URL, for example `https://ncii-ecosystem-submissions.<account>.workers.dev`.
5. Rebuild the Pages site with that value and commit its generated `docs/` folder:

   ```sh
   SUBMISSION_API_URL='https://ncii-ecosystem-submissions.<account>.workers.dev' npm run build:pages
   git add docs
   git commit -m "feat: connect database submissions"
   git push https://github.com/ncii-ecosystem/eco-project.git master:master
   ```

The CORS origin is `https://ncii-ecosystem.org`. Update `ALLOWED_ORIGIN` in `wrangler.toml` if the public domain changes.

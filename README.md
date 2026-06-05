# Ewens Tree Lab

Interactive laboratory for recursive random tree models:

- Ewens recursive tree
- Uniform recursive tree
- Plancherel recursive tree

The app includes tree generation, theory comparison, simulation, parameter scans, exports, experiment history, and a Small-n Explorer.

## Run Locally

```powershell
python -m venv .venv
.\.venv\Scripts\pip install -r requirements.txt
npm install
.\.venv\Scripts\python.exe -m uvicorn ewens_app.main:app --host 127.0.0.1 --port 8765
```

Open:

```text
http://127.0.0.1:8765/
```

## Test

```powershell
npm test
node tests\frontend_smoke.js
```

## Public Page

GitHub Pages hosts a public project page from `docs/`. The full interactive lab needs the FastAPI backend, so run locally or deploy the Python app on a platform that supports ASGI.

## Deploy on Render

The repository includes `render.yaml` for Render Blueprint deployment.

[Deploy to Render](https://render.com/deploy?repo=https://github.com/ShengjunZHANG800/tree_generate)

Render settings if creating a Web Service manually:

- Build Command: `pip install -r requirements.txt`
- Start Command: `uvicorn ewens_app.main:app --host 0.0.0.0 --port $PORT`
- Health Check Path: `/api/health`

## Automatic Render Deploys

`render.yaml` enables Render auto deploys for Blueprint-created services. If the existing Render service does not auto-deploy after pushes to `main`, add a deploy hook fallback:

1. In the Render service, open **Settings** and copy the **Deploy Hook** URL.
2. In GitHub, open **Settings > Secrets and variables > Actions**.
3. Add a repository secret named `RENDER_DEPLOY_HOOK_URL`.
4. Paste the Render deploy hook URL as the secret value.

After that, `.github/workflows/render-deploy.yml` runs on every push to `main`, verifies the API and frontend JavaScript syntax, then triggers the Render deploy hook.

# Hoang Phuong — Portfolio

## AI portfolio assistant

A floating chatbot (bottom-right) answers visitor questions about the portfolio in English or Vietnamese, using Google Gemini through a Vercel Serverless Function.

```
React widget (src/my_info/components/AIChatbot)  ──POST /api/chat──▶  api/chat.js (Vercel Function)  ──▶  Gemini API
```

- **Knowledge base:** `api/_lib/knowledge.js` builds the prompt from the same JSON files the site renders — `src/my_info/mockData/dataProfile.json` (name, summary, experience, education, contact, socials, CV), `dataServices.json` (skills) and `dataPortfolio.json` (projects). Edit those files and redeploy; the site and the chatbot update together.
- **Secrets:** the Gemini key lives only in server env vars. Never prefix it with `REACT_APP_`.
- **UI:** the launcher is tiny and always loaded; the chat panel is a lazy-loaded chunk. Chat history is kept in `sessionStorage` (last 30 messages; only the last 12 are sent to the model).

### Environment variables

| Name | Required | Purpose |
| --- | --- | --- |
| `GEMINI_API_KEY` | yes | Gemini API key (server-only) |
| `GEMINI_MODEL` | no | Defaults to `gemini-3.5-flash-lite` |
| `GEMINI_THINKING_LEVEL` | no | `MINIMAL`/`LOW`/`MEDIUM`/`HIGH`; empty = model default |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | recommended | Shared rate-limit counters (also accepts `KV_REST_API_URL` / `KV_REST_API_TOKEN`) |
| `RATE_LIMIT_PER_MINUTE` / `RATE_LIMIT_PER_DAY` / `RATE_LIMIT_GLOBAL_PER_DAY` | no | Defaults 8 / 60 per visitor, 500 site-wide per day |
| `ALLOWED_ORIGINS` | no | Extra browser origins allowed to call the API (the deployment's own domain is always allowed) |
| `CHAT_PROVIDER` | no | `mock` for local testing without a key (refused on production) |

See `.env.example`.

### Get a Gemini API key

1. Open [Google AI Studio → API keys](https://aistudio.google.com/apikey) and sign in.
2. Create a key (it is tied to a Google Cloud project; free-tier limits apply per project). Check current free-tier limits for your model at [aistudio.google.com/rate-limit](https://aistudio.google.com/rate-limit).

### Local development

```bash
cp .env.example .env.local      # then fill in GEMINI_API_KEY
npm install
npm run dev:api                 # terminal 1: serves api/chat.js on :3010
npm start                       # terminal 2: CRA on :3000, proxies /api to :3010
```

No key yet? Set `CHAT_PROVIDER=mock` in `.env.local` for canned answers. Alternatively, `npx vercel dev` runs the site and the function together exactly like production (requires `vercel login` + `vercel link`; pull env vars with `vercel env pull .env.local`).

Tests: `npm run test:api` (endpoint, validation, rate limiting, prompt) and `npm test` (UI renderer).

### Deploy on Vercel

1. Vercel → Project → **Settings → Environment Variables**: add `GEMINI_API_KEY` (and optionally `GEMINI_MODEL`) for Production and Preview.
2. Recommended: Vercel → **Storage / Marketplace → Upstash (Redis)** → connect to this project (free plan). It injects `KV_REST_API_URL` / `KV_REST_API_TOKEN`, which the rate limiter picks up automatically.
3. Redeploy (env var changes only apply to new deployments). The frontend calls the relative path `/api/chat`, so it works on every deployment domain.

### Abuse protection — what it does and doesn't do

- Per-visitor (hashed IP) limits per minute and per day, plus a site-wide daily cap that protects your free Gemini quota.
- With Upstash configured, counters are shared across all serverless instances. **Without it**, limits are per-instance in memory only — a weak, best-effort fallback, because Vercel can run many instances.
- The Origin check only stops other websites' browsers from embedding the endpoint; scripts can forge headers, so it is not a security boundary. Input size, history length and a 20s provider timeout bound the cost of each request.
- Optional extra layer: a Vercel Firewall rate-limit rule on `/api/chat` (plan-dependent).

---

# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can’t go back!**

If you aren’t satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you’re on your own.

You don’t have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn’t feel obligated to use this feature. However we understand that this tool wouldn’t be useful if you couldn’t customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

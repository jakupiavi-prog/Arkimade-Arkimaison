# Arkimaison & Arkimade

A split welcome page leading to Arkimaison's interior design portfolio and Arkimade's architecture portfolio, with photographic transitions and separate studio branding.

## Run locally

Install Node.js, then run:

```sh
npm run dev
```

Run `npm install`, then open http://localhost:3000/ and keep the server running. On Windows, you can also double-click `Start-Preview.cmd`.

## Project files

- `index.html`: studio selection, including a compact phone layout.
- `arkimaison.html` and `arkimade.html`: studio portfolios.
- `welcome.css`, `style.css`, and `brands.css`: page layouts and studio styling.
- `app.js`: navigation, project dialogs, and downloadable project briefs.
- `assets/`: logo PNGs, reference imagery, and transition scripts and styling.
- `server.cjs`: local static server.

The site can also be opened through `index.html` without the local server.

## Deploy to Vercel

Import this repository with its root directory set to `./`. The included
`vercel.json` selects the Other framework preset, runs `npm run build`, and
publishes `dist/` alongside the CMS and page-rendering serverless functions.
Do not set the production build command to `npm start` or `npm run dev`.

To prepare the same static files locally, run `npm run build`. Upload the
contents of `dist/` to a static web host for a baseline preview only; live CMS publishing requires the Vercel functions and storage configuration. The local preview server,
documentation, and tests are not included in that output.

## Checks

```sh
node --check app.js
node --check server.cjs
node --check assets/transitions.js
node qa-site.cjs
```

Project descriptions and details are illustrative. Some photography loads from Unsplash and requires internet access. The consultation form downloads a local brief; it does not send an enquiry or book an appointment.

Browser check files and downloadable ZIP packages are local outputs and are excluded from Git.

## Studio Manager

The owner CMS is at `/admin`. See [CMS-SETUP.md](CMS-SETUP.md) for editing instructions and the one-time Vercel publishing setup. Run `npm test` before deployment.

Open `Studio Manager.url` on any Windows PC to launch the online editor. No project installation or local server is needed to manage the live site.

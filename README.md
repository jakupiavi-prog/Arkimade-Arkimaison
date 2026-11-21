# Arkimaison & Arkimade

A split welcome page leading to Arkimaison's interior design portfolio and Arkimade's architecture portfolio, with photographic transitions and separate studio branding.

## Run locally

Install Node.js, then run:

```sh
npm run dev
```

Open http://localhost:3000/ and keep the server running. On Windows, you can also double-click `Start-Preview.cmd`. No npm dependencies or build step are required.

## Project files

- `index.html`: studio selection, including a compact phone layout.
- `arkimaison.html` and `arkimade.html`: studio portfolios.
- `welcome.css`, `style.css`, and `brands.css`: page layouts and studio styling.
- `app.js`: navigation, project dialogs, and downloadable project briefs.
- `assets/`: logo PNGs, reference imagery, and transition scripts and styling.
- `server.cjs`: local static server.

The site can also be opened through `index.html` without the local server. To host it, upload the HTML, CSS, JavaScript, and `assets/` files together.

## Checks

```sh
node --check app.js
node --check server.cjs
node --check assets/transitions.js
node qa-site.cjs
```

Project descriptions and details are illustrative. Some photography loads from Unsplash and requires internet access. The consultation form downloads a local brief; it does not send an enquiry or book an appointment.

Browser check files and downloadable ZIP packages are local outputs and are excluded from Git.

ARKIMAISON & ARKIMADE

Open locally
On Windows, double-click Start-Preview.cmd and keep its window open.
Then open http://localhost:3000/ in your browser.
With Node.js installed, you can also run npm run dev.
Open http://localhost:3000 in your browser. Stop with Ctrl+C.
The preview server uses Node.js built-in modules; no packages are required.

Or open without a server:
1. Extract this ZIP.
2. Double-click index.html to open the site in your browser.
No installation, dependencies, or build step needed.

Edit
index.html: split studio selection page
arkimaison.html: interior design portfolio (charcoal and white)
arkimade.html: architecture portfolio (neutral palette pending logo)
style.css: layout and styling
welcome.css: split selection page styling
brands.css: studio palettes and shared portfolio refinements
app.js: studio-specific project details and downloadable project briefs
assets/reference.png: supplied reference imagery

Hosting
Upload all three HTML files, style.css, brands.css, welcome.css, app.js,
and assets/ together to a static web host.

Notes
This is a concept studio portfolio. Project titles and details are illustrative.
Architecture images use the supplied reference screenshot. Interior inspiration
photographs load from images.unsplash.com and require an internet connection.
The Arkimaison palette follows the supplied charcoal and white reference.
Arkimade uses a temporary neutral palette until its logo is available as an image.
The consultation form generates a downloadable brief; it does not send email
or book appointments.

After changing server.cjs, stop an existing preview with Ctrl+C and reopen
Start-Preview.cmd so the new studio routes become available.

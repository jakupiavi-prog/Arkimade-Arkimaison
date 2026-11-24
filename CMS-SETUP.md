# Studio Manager — live CMS

The owner edits both studios at **https://arkimadearkimaison.vercel.app/admin** after deployment. It works from any computer with an internet connection.

## Editing the website

1. Open `/admin` on the live website and sign in with the owner password.
2. Choose **Welcome page**, **Arkimade**, or **Arkimaison**.
3. Use **Projects**, **Page text**, **Photos**, **Contact**, and **Staff** to make changes.
4. Inside a project, choose **Keep changes** to return to the dashboard. Use **Up** and **Down** to arrange projects. Only Arkimade has category filters.
5. Choose **Preview** for a desktop or phone view of your draft.
6. Choose **Publish changes**. After the save confirmation, refresh the public website. No code editing, GitHub login, or new deployment is needed for content changes.

Use PNG, JPG, or WebP photos up to 2 MB. Convert HEIC photos to JPG before uploading. Add a short photo description for accessibility. Welcome page photos have their own editor; project photos are inside each project.

Unpublished changes remain in the open editor. Use **Download a backup** before closing or reloading if you want to keep an unpublished draft. The backup contains page text and image references, not copies of the photos. Simultaneous saves are checked so one editor cannot silently overwrite another editor’s newer changes.

The existing contact form creates a downloadable brief; it does not send email. Studio email and telephone details can be edited in **Contact** and appear as direct contact links on the public page.

## Hosting and credentials

The live CMS uses Vercel Blob for persistent page content and photographs. The API runs on Vercel, so the owner does not need this project folder or a running localhost server.

Production settings in Vercel → Project → Settings → Environment Variables:

| Variable | Purpose |
| --- | --- |
| `CMS_PASSWORD` | Owner-selected password. The application accepts at least 4 characters; use a long, unique password for a public editor. |
| `CMS_SESSION_SECRET` | Random signing secret with at least 32 characters. Keep it private. |
| `CMS_STORAGE` | `blob` for the live CMS. |
| `BLOB_READ_WRITE_TOKEN` | Server credential provisioned by the project’s Vercel Blob connection. |

Keep credentials in Production only. Never commit them, add public prefixes, or send the signing secret/storage token in chat. The owner only needs the CMS password. Updating password settings requires a new deployment and invalidates old sessions. Sessions expire after eight hours; signing in again retains edits in the open editor.

The Vercel project uses framework **Other**, Node **24.x**, build command **npm run build**, output directory **dist**. `vercel.json` routes public pages through `api/page.js`, which reads the latest saved content and renders the existing templates. Admin files and assets are served statically. A temporary content outage falls back to the template’s baseline content.

## Content and recovery

- The current publication is stored as `content/site.json` inside Vercel Blob. The repository’s file of the same name is the initial baseline and local preview content; deploying code does not overwrite existing online edits.
- Each publication also keeps an immutable JSON copy under `content/versions/` in Blob for recovery. The site administrator can restore a version through a controlled content publication. Download regular backups from the dashboard.
- Photos are stored under `assets/uploads/` in Blob and have unique URLs. Replacing or removing a project does not delete old images or erase saved versions.
- Blob content and photos are public website assets. Never upload confidential documents, credentials, or photographs not intended for publication.
- Publishing checks the current revision and uses an atomic conditional write. If a conflict is reported, download your draft before reloading. Storage failures do not discard the open editor.
- Incorrect logins are limited per server instance. A persistent hosting firewall rate limit is recommended for additional production abuse protection.
- Monitor Vercel’s storage usage and account plan limits as the portfolio grows.

## Developer checks and deployment

Run **npm test** and **npm run build** before code deployments. `Push-Updates.cmd` commits website/CMS source and pushes to the existing repository without staging credentials. A Vercel API deployment can publish reviewed local source directly; keep GitHub source synchronized before future Git-based deployments.

For local UI review, run **npm start** and open `/admin`, then choose **Explore the editor preview**. That preview cannot publish. Local credential settings do not configure the deployed CMS.

An optional legacy GitHub-backed publication mode remains available when `CMS_STORAGE` is not `blob`; it requires `CMS_GITHUB_TOKEN`, the repository, and branch settings. It saves a GitHub commit and depends on the connected Vercel build. The live project uses Blob mode.

## Staff pages

Choose a studio, then **Staff**. Add names, roles, and biographies. Staff pages use a text-only layout. Use **Move up** and **Move down** to set the order, **Preview** to review the staff page, and **Publish changes** to save. Each studio has its own staff page linked in its navigation. Existing online content is upgraded automatically; no previous page or project edits are reset.

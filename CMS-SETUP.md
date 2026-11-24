# Studio Manager — live CMS

The owner edits both studios at **https://arkimadearkimaison.vercel.app/admin** after deployment. It works from any computer with an internet connection.

## Editing the website

1. Open **/admin** and sign in with the owner password.
2. Choose **Arkimade** or **Arkimaison**.
3. Choose **Projects**, **Staff**, or **Contact**.
4. Add or edit your information. In a project, choose **Keep changes** to close its editor.
5. Choose **Publish changes** to save online.

Staff profiles contain a name, role, and biography. Project photos accept JPG, PNG, or WebP up to 2 MB. Email, phone, and address appear in the public footers. Blank contact fields are hidden.

The CMS has no welcome-page editor, backup download, or demo mode. Sign-in is required to edit. Unpublished edits remain in the open editor; publish before closing it. The existing project enquiry form downloads a brief and does not send email.

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
- Each publication also keeps an immutable JSON copy under `content/versions/` in Blob for recovery. The site administrator can restore a version through a controlled content publication. Previous publications are retained in storage.
- Photos are stored under `assets/uploads/` in Blob and have unique URLs. Replacing or removing a project does not delete old images or erase saved versions.
- Blob content and photos are public website assets. Never upload confidential documents, credentials, or photographs not intended for publication.
- Publishing checks the current revision and uses an atomic conditional write. If a conflict is reported, keep the editor open and copy any unsaved changes before reloading. Storage failures do not discard the open editor.
- Incorrect logins are limited per server instance. A persistent hosting firewall rate limit is recommended for additional production abuse protection.
- Monitor Vercel’s storage usage and account plan limits as the portfolio grows.

## Developer checks and deployment

Run **npm test** and **npm run build** before code deployments. `Push-Updates.cmd` commits website/CMS source and pushes to the existing repository without staging credentials. A Vercel API deployment can publish reviewed local source directly; keep GitHub source synchronized before future Git-based deployments.

For local editing, configure the CMS credentials and storage connection, then run **npm start**.

An optional legacy GitHub-backed publication mode remains available when `CMS_STORAGE` is not `blob`; it requires `CMS_GITHUB_TOKEN`, the repository, and branch settings. It saves a GitHub commit and depends on the connected Vercel build. The live project uses Blob mode.

## Staff pages

Choose a studio, then **Staff**. Add names, roles, and biographies. Use **Move up** and **Move down** to set the order and **Publish changes** to save.

Contact details appear inside the footer of each studio’s main page and Staff page, and in the welcome page footer. Update them once under **Contact**. 

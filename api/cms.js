// Owner-only publishing endpoint. Credentials are Vercel environment variables.
const crypto = require('node:crypto');
const {promisify} = require('node:util');
const {validateContent} = require('../lib/content.cjs');
const scrypt = promisify(crypto.scrypt);
const attempts = new Map();
const COOKIE = 'arki_owner';
const TTL = 8 * 60 * 60;
function config() {
  const password = process.env.CMS_PASSWORD || '';
  const secret = process.env.CMS_SESSION_SECRET || '';
  const token = process.env.CMS_GITHUB_TOKEN || '';
  const repo = process.env.CMS_GITHUB_REPOSITORY || 'jakupiavi-prog/Arkimade-Arkimaison';
  const branch = process.env.CMS_GITHUB_BRANCH || 'main';
  const storage = process.env.CMS_STORAGE === 'blob' ? 'blob' : 'github';
  const connected = storage === 'blob' ? Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID) : token.length > 0 && /^[\w.-]+\/[\w.-]+$/.test(repo) && branch.length <= 150;
  const ready = password.length >= 4 && password.length <= 1024 && secret.length >= 32 && connected;
  return {password, secret, token, repo, branch, storage, ready};
}
function error(status, message) { const value = new Error(message); value.status = status; return value; }
function equal(left, right) { return left.length === right.length && crypto.timingSafeEqual(left, right); }
function signingKey(settings) { return crypto.createHash('sha256').update(settings.secret + '\0' + settings.password).digest(); }
function signature(payload, settings) { return crypto.createHmac('sha256', signingKey(settings)).update(payload).digest('base64url'); }
function session(settings) {
  const payload = Buffer.from(JSON.stringify({expires:Math.floor(Date.now() / 1000) + TTL, nonce:crypto.randomBytes(16).toString('hex')})).toString('base64url');
  return payload + '.' + signature(payload, settings);
}
function authenticated(req, settings) {
  if (!settings.ready) return false;
  const cookie = (req.headers.cookie || '').split(';').map(value => value.trim()).find(value => value.startsWith(COOKIE + '='));
  if (!cookie || cookie.length > 1000) return false;
  try {
    const [payload, mac, extra] = cookie.slice(COOKIE.length + 1).split('.');
    if (extra || !mac || !equal(Buffer.from(mac), Buffer.from(signature(payload, settings)))) return false;
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return Number.isInteger(data.expires) && data.expires > Date.now() / 1000 && data.expires <= Date.now() / 1000 + TTL;
  } catch { return false; }
}
function localRequest(req) {
  return !process.env.VERCEL && /^(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(req.headers.host || '');
}
function setCookie(req, res, value, age) {
  res.setHeader('Set-Cookie', `${COOKIE}=${value}; Path=/api/cms; HttpOnly; SameSite=Strict; Max-Age=${age}${localRequest(req) ? '' : '; Secure'}`);
}
function checkOrigin(req) {
  try {
    const origin = new URL(req.headers.origin);
    if (origin.host !== req.headers.host || origin.username || origin.password || (origin.protocol !== 'https:' && !(origin.protocol === 'http:' && localRequest(req)))) throw 0;
  } catch { throw error(403, 'Please open the editor on this website and try again.'); }
  if (!(req.headers['content-type'] || '').toLowerCase().startsWith('application/json')) throw error(415, 'Please send JSON content.');
}
async function body(req, limit) {
  if (req.body !== undefined) {
    if (Buffer.byteLength(typeof req.body === 'string' ? req.body : JSON.stringify(req.body)) > limit) throw error(413, 'This upload is too large.');
    try { return typeof req.body === 'string' ? JSON.parse(req.body) : req.body; } catch { throw error(400, 'Invalid request.'); }
  }
  const chunks = []; let length = 0;
  for await (const chunk of req) {
    length += chunk.length;
    if (length > limit) throw error(413, 'This upload is too large.');
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw error(400, 'Invalid request.'); }
}
async function github(settings, file, method = 'GET', data) {
  const url = `https://api.github.com/repos/${settings.repo}/contents/${file}` + (method === 'GET' ? '?ref=' + encodeURIComponent(settings.branch) : '');
  let response;
  try {
    response = await fetch(url, {method, redirect:'error', signal:AbortSignal.timeout(12000), headers:{
      Authorization:'Bearer ' + settings.token, Accept:'application/vnd.github+json',
      'X-GitHub-Api-Version':'2022-11-28', 'User-Agent':'Arki-Studio-CMS', 'Content-Type':'application/json'
    }, ...(data ? {body:JSON.stringify({...data, branch:settings.branch})} : {})});
  } catch { throw error(502, 'Publishing could not reach GitHub. Your edits are still here; please try again.'); }
  if (response.status === 409 || response.status === 422) throw error(409, 'The website changed since you opened it. Your edits are still open. Reload only after you have copied any changes you want to keep.');
  if (!response.ok) throw error(502, response.status === 403 || response.status === 401 ? 'The publishing connection needs attention. Ask the site administrator to check its GitHub token and repository permissions.' : 'Could not read or save website content. Check the repository and branch settings, then try again.');
  return response.json();
}
function mediaType(bytes) {
  if (bytes.length >= 24 && bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) && bytes.subarray(12,16).toString() === 'IHDR') return 'png';
  if (bytes.length >= 12 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'jpg';
  if (bytes.length >= 16 && bytes.subarray(0,4).toString() === 'RIFF' && bytes.subarray(8,12).toString() === 'WEBP') return 'webp';
  throw error(400, 'Choose a PNG, JPEG, or WebP photo. SVG and other file types cannot be uploaded.');
}
module.exports = async function cms(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Frame-Options', 'DENY');
  const send = (status, value) => { res.statusCode = status; res.end(JSON.stringify(value)); };
  try {
    const action = new URL(req.url, 'http://localhost').searchParams.get('action') || 'status';
    const settings = config();
    if (req.method === 'GET' && action === 'status') return send(200, {configured:settings.ready, authenticated:authenticated(req, settings)});
    if (!['GET', 'POST', 'PUT'].includes(req.method)) {res.setHeader('Allow', 'GET, POST, PUT');throw error(405, 'Method not allowed.');}
    if (req.method !== 'GET') checkOrigin(req);
    if (req.method === 'POST' && action === 'logout') {setCookie(req, res, '', 0);return send(200, {ok:true});}
    if (!settings.ready) throw error(503, 'Publishing needs one-time setup. The site administrator must add the CMS environment variables in Vercel.');
    if (req.method === 'POST' && action === 'login') {
      const now = Date.now();
      for (const [key, value] of attempts) if (value.until <= now) attempts.delete(key);
      const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'local').split(',')[0].trim();
      const entry = attempts.get(ip) || {count:0, until:now + 15 * 60 * 1000};
      if (entry.count >= 6 || attempts.size >= 1000) throw error(429, 'Too many sign-in attempts. Please try again in 15 minutes.');
      entry.count++;attempts.set(ip, entry);
      const input = await body(req, 4096);
      if (typeof input?.password !== 'string' || input.password.length > 1024) throw error(401, 'The password is incorrect.');
      const [supplied, expected] = await Promise.all([scrypt(input.password, settings.secret, 64), scrypt(settings.password, settings.secret, 64)]);
      if (!equal(supplied, expected)) throw error(401, 'The password is incorrect.');
      attempts.delete(ip);setCookie(req, res, session(settings), TTL);
      return send(200, {ok:true});
    }
    if (!authenticated(req, settings)) throw error(401, 'Please sign in to edit this website.');
    if (action === 'content' && req.method === 'GET') {
      if (settings.storage === 'blob') {
        const saved = await require('../lib/blob-store.cjs').createBlobStore().read();
        return send(200, {content:saved.content,sha:saved.sha});
      }
      const file = await github(settings, 'content/site.json');
      let content;
      try {content = validateContent(JSON.parse(Buffer.from(file.content, 'base64').toString('utf8')));} catch {throw error(502, 'The saved website content could not be opened. Ask the site administrator to check content/site.json.');}
      return send(200, {content, sha:file.sha});
    }
    if (action === 'content' && req.method === 'PUT') {
      const input = await body(req, 350000);
      if (!/^[a-f0-9]{40}$/.test(input?.sha || '')) throw error(400, 'Reload the editor before publishing.');
      const content = validateContent(input.content);
      if (settings.storage === 'blob') {
        const saved = await require('../lib/blob-store.cjs').createBlobStore().write(content,input.sha);
        return send(200, {...saved,message:'Changes published. Refresh the live website to see your updates.'});
      }
      const saved = await github(settings, 'content/site.json', 'PUT', {message:'Update studio website content', content:Buffer.from(JSON.stringify(content, null, 2) + '\n').toString('base64'), sha:input.sha});
      return send(200, {sha:saved.content.sha, commit:saved.commit.sha, message:'Changes saved. The live website will update when Vercel finishes deploying.'});
    }
    if (action === 'media' && req.method === 'POST') {
      const input = await body(req, 2900000);
      if (typeof input?.data !== 'string' || !/^[A-Za-z0-9+/]*={0,2}$/.test(input.data) || input.data.length % 4 !== 0) throw error(400, 'The photo could not be read. Please select it again.');
      const bytes = Buffer.from(input.data, 'base64');
      if (bytes.length > 2 * 1024 * 1024) throw error(413, 'Choose a photo smaller than 2 MB.');
      const extension = mediaType(bytes);
      const file = 'assets/uploads/' + crypto.randomUUID() + '.' + extension;
      if (settings.storage === 'blob') {
        const src = await require('../lib/blob-store.cjs').createBlobStore().upload(file,bytes);
        return send(201, {src});
      }
      await github(settings, file, 'PUT', {message:'Upload studio photograph', content:bytes.toString('base64')});
      return send(201, {src:file});
    }
    throw error(404, 'This editor action does not exist.');
  } catch (failure) {
    return send(failure.status || 500, {error:failure.status ? failure.message : 'The editor encountered a problem. Your edits have not been discarded; please try again.'});
  }
};

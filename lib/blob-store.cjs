const crypto = require('node:crypto');
const {validateContent} = require('./content.cjs');
const seed = require('../content/site.json');
const digest = value => crypto.createHash('sha1').update(value).digest('hex');
// Compressed CDN responses can weaken the metadata ETag. Compare its revision
// value for reads, retaining the original strong ETag for conditional writes.
const normalizeEtag = value => String(value || '').replace(/^W\//, '').replace(/^"|"$/g, '');
const failure = (status, message) => Object.assign(new Error(message), {status});
function createBlobStore(sdk = require('@vercel/blob')) {
  const filename = 'content/site.json';
  const initial = validateContent(seed);
  const initialSha = digest(JSON.stringify(initial));
  const isError = (error, name) => (typeof sdk[name] === 'function' && error instanceof sdk[name]) || error?.name === name;
  const missing = error => isError(error, 'BlobNotFoundError');
  async function metadata() {
    try {return await sdk.head(filename, {abortSignal:AbortSignal.timeout(12000)});}
    catch (error) {if (missing(error)) return null;throw error;}
  }
  return {
    async read() {
      try {
        const info = await metadata();
        if (!info) return {content:structuredClone(initial), sha:initialSha, source:'seed'};
        // Public Blob overwrites may remain cached briefly. Read an immutable
        // copy keyed by the committed revision so completed saves are immediate.
        let bodyInfo = info;
        try {bodyInfo = await sdk.head('content/revisions/' + digest(info.etag) + '.json', {abortSignal:AbortSignal.timeout(12000)});}
        catch (error) {if (!missing(error)) throw error;}
        const url = new URL(bodyInfo.url);url.searchParams.set('v', bodyInfo.etag);
        const response = await sdk.get(url.href, {access:'public', abortSignal:AbortSignal.timeout(12000)});
        if (!response || !bodyInfo.etag || normalizeEtag(response.blob.etag) !== normalizeEtag(bodyInfo.etag) || !response.stream) {
          console.warn('CMS revision mismatch', JSON.stringify({metadata:bodyInfo.etag,body:response?.blob?.etag,status:response?.statusCode}));
          throw failure(503, 'Website content is refreshing. Please try again.');
        }
        const bytes = await new Response(response.stream).arrayBuffer();
        if (bytes.byteLength > 350000) throw failure(503, 'The saved website content could not be opened.');
        const content = validateContent(JSON.parse(Buffer.from(bytes).toString('utf8')));
        return {content, sha:digest(info.etag), source:'stored'};
      } catch (error) {
        if (error.status) throw error;
        throw failure(503, 'The content service is temporarily unavailable. Your edits are still here; please try again.');
      }
    },
    async write(content, expectedSha) {
      try {
        const info = await metadata();
        if ((info ? digest(info.etag) : initialSha) !== expectedSha) throw failure(409, 'Someone saved a newer version. Your edits are still open. Reload only after you have copied any changes you want to keep.');
        const bytes = JSON.stringify(validateContent(content), null, 2) + '\n';
        // Retain immutable versions for recovery, separately from the live file.
        await sdk.put('content/versions/' + digest(bytes) + '-' + crypto.randomUUID() + '.json', bytes, {access:'public', contentType:'application/json', addRandomSuffix:false, allowOverwrite:false});
        const result = await sdk.put(filename, bytes, {
          access:'public', contentType:'application/json', addRandomSuffix:false,
          allowOverwrite:Boolean(info), cacheControlMaxAge:60,
          ...(info ? {ifMatch:info.etag} : {}), abortSignal:AbortSignal.timeout(12000)
        });
        const revisionPath = 'content/revisions/' + digest(result.etag) + '.json';
        try {await sdk.put(revisionPath, bytes, {access:'public',contentType:'application/json',addRandomSuffix:false,allowOverwrite:false,abortSignal:AbortSignal.timeout(12000)});}
        catch (error) {if (!isError(error,'BlobAlreadyExistsError') && !/already exists/i.test(error.message || '')) throw error;}
        return {sha:digest(result.etag)};
      } catch (error) {
        if (isError(error, 'BlobPreconditionFailedError') || isError(error, 'BlobAlreadyExistsError') || /already exists/i.test(error.message || '')) throw failure(409, 'Someone saved a newer version. Your edits are still open. Reload only after you have copied any changes you want to keep.');
        if (error.status) throw error;
        throw failure(503, 'Publishing could not finish. Your edits are still here; please try again.');
      }
    },
    async upload(path, bytes) {
      if (!/^assets\/uploads\/[a-f0-9-]+\.(png|jpg|webp)$/.test(path)) throw failure(400, 'Invalid photo name.');
      const extension = path.split('.').pop();
      try {
        const result = await sdk.put(path, bytes, {access:'public', addRandomSuffix:false, allowOverwrite:false, contentType:{png:'image/png',jpg:'image/jpeg',webp:'image/webp'}[extension], abortSignal:AbortSignal.timeout(12000)});
        return result.url;
      } catch {throw failure(503, 'The photo could not be uploaded. Please try again.');}
    }
  };
}
module.exports = {createBlobStore};

// index.mjs
// Node.js 24.x ESM Lambda handler for a minimal CORS proxy.
// - Uses built-in global fetch()
// - Detects EventBridge scheduled "ping" events and returns early
// - Handles API Gateway HTTP events
// - Returns text with proper headers

const DEFAULT_TIMEOUT_MS = 5000;
const CORS_ALLOW_ORIGIN = '*';
const CORS_ALLOW_METHODS = 'GET, POST, OPTIONS';
const CORS_ALLOW_HEADERS = 'Content-Type, Authorization, X-Requested-With';
const MAX_BYTES = 5_000_000;

/*
function buildCorsHeaders(extra = {}) {
  return {
    'Access-Control-Allow-Origin': CORS_ALLOW_ORIGIN,
    'Access-Control-Allow-Methods': CORS_ALLOW_METHODS,
    'Access-Control-Allow-Headers': CORS_ALLOW_HEADERS,
    ...extra,
  };
  return extra;
}
  */

async function fetchWithTimeout(url, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
    const timeoutSignal = AbortSignal.timeout(timeoutMs);
    try {
        const resp = await fetch(url, { ...options, signal: timeoutSignal });
        return resp;
    } catch {
        return null;
    }
}

export const handler = async (event) => {
    if (!event) return;

    // 1) EventBridge scheduled ping -> no proxy action
    if (event.source === 'aws.events' || event['detail-type'] === 'Scheduled Event') {
        return 'pong';
    }

    // 2) Non-HTTP invocation (e.g., test via console) -> show info
    if (!event.httpMethod) {
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'Lambda invoked (non-HTTP event). No action taken.' }),
        };
    }

    // 3) Handle HTTP preflight
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 204,
            headers: { 'Content-Type': 'text/plain' },
            body: '',
        };
    }

    // 4) Extract target URL
    let targetUrl = event.destinationUrl;
    if (!targetUrl) {
        return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Missing "url" query parameter.' }),
        };
    }

    try {
        targetUrl = new URL(decodeURIComponent(targetUrl));
        if (!targetUrl.protocol.startsWith("http")) throw new Error();
    } catch {
        return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Invalid URL scheme. Only http:// and https:// are allowed.' }),
        };
    }

    if (event.encodeURI) {
        targetUrl.search = Array.from(targetUrl.searchParams.entries())
            .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
            .join('&');
    }

    targetUrl = targetUrl.toString();

    // 5) Make the outbound fetch
    // Minimal header forwarding: Accept header and user-supplied Accept/Accept-Language are forwarded.
    // Do NOT forward Host, Cookie by default.
    const incomingHeaders = (event.headers || {});
    const forwardHeaders = {};
    const allowedHeaders = ['Accept', 'Accept-Encoding', 'Accept-Language', 'Authorization', 'Content-Type', 'User-Agent'];
    for (let allowedHeader of allowedHeaders) {
        if (incomingHeaders[allowedHeader]) {
            forwardHeaders[allowedHeader] = incomingHeaders[allowedHeader];
        }
    }

    // Allow callers to specify method override and body (POST proxy)
    const outboundMethod = (event.httpMethod || 'GET').toUpperCase();
    let outboundBody = undefined;
    if (outboundMethod !== 'GET' && event.body) {
        outboundBody = event.isBase64Encoded ? Buffer.from(event.body, 'base64') : event.body;
    }

    try {
        const resp = await fetchWithTimeout(targetUrl, {
            method: outboundMethod,
            headers: forwardHeaders,
            body: outboundBody,
        });
        if (!resp) throw new Error('fetch_error');

        /*
        const contentType = resp.headers.get('content-type') || '';
        // Build response headers to return to client. Forward content-type; do not expose server internals.
        const respHeaders = {
          ...buildCorsHeaders({ 'Content-Type': contentType || 'application/octet-stream', ...Object.fromEntries(resp.headers.entries()) }),
          'X-Proxy-Status': String(resp.status),
        };
        */

        const contentLengthHeader = resp.headers.get('content-length');
        const contentLength = contentLengthHeader ? parseInt(contentLengthHeader, 10) : NaN;

        if (!isNaN(contentLength) && contentLength > MAX_BYTES) {
            return {
                statusCode: 413,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'upstream_too_large' }),
            };
        }

        const contentType = resp.headers.get('content-type') || '';

        if (contentType.startsWith('image/')) {
            const buf = Buffer.from(await resp.arrayBuffer());
            if (buf.length > MAX_BYTES) {
                return {
                    statusCode: 413,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ error: 'upstream_too_large' }),
                };
            }
            return {
                statusCode: resp.status,
                headers: event.includeRespHeaders ? Object.fromEntries(resp.headers) : null,
                body: buf.toString('base64'),
            };
        } else {
            const respText = await resp.text();

            return {
                statusCode: resp.status,
                headers: event.includeRespHeaders ? Object.fromEntries(resp.headers) : null,
                body: respText,
            };
        }
    } catch (err) {
        // Timeout or network error
        const errMsg = err.name === 'AbortError' ? 'upstream fetch timed out' : err.message || String(err);
        const safeBody = { error: 'proxy_error', details: errMsg };

        return {
            statusCode: 502,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(safeBody),
        };
    }
};
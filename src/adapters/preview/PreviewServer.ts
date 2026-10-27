import { randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { EditorSession } from '../../application/EditorSession.js';
import { SvgCodec } from '../svg/SvgCodec.js';
import { PreviewPage } from './PreviewPage.js';

export class PreviewServer {
  readonly #token = randomBytes(24).toString('hex');
  readonly #server = createServer((request, response) => this.respond(request, response));
  #origin = '';
  #cachedRevision = -1;
  #cachedState = '';

  constructor(
    private readonly session: EditorSession,
    private readonly codec = new SvgCodec(),
  ) {}

  async start(): Promise<string> {
    if (this.#origin) throw new Error('preview already started');
    await new Promise<void>((resolve, reject) => {
      this.#server.once('error', reject);
      this.#server.listen(0, '127.0.0.1', () => {
        this.#server.off('error', reject);
        resolve();
      });
    });
    const address = this.#server.address();
    if (!address || typeof address === 'string') throw new Error('preview has no TCP address');
    this.#origin = `http://127.0.0.1:${address.port}`;
    return `${this.#origin}/${this.#token}/`;
  }

  async close(): Promise<void> {
    if (!this.#server.listening) return;
    await new Promise<void>((resolve, reject) => {
      this.#server.close((error) => (error ? reject(error) : resolve()));
      this.#server.closeAllConnections();
    });
  }

  private respond(request: IncomingMessage, response: ServerResponse): void {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    response.setHeader('X-Frame-Options', 'DENY');
    if (
      request.headers.host !== this.#origin.slice('http://'.length) ||
      (request.headers.origin !== undefined && request.headers.origin !== this.#origin) ||
      (request.headers['sec-fetch-site'] !== undefined &&
        !['same-origin', 'none'].includes(String(request.headers['sec-fetch-site'])) &&
        !(request.url === `/${this.#token}/` && request.headers['sec-fetch-mode'] === 'navigate'))
    ) {
      response.writeHead(403).end('Forbidden');
      return;
    }
    if (request.method !== 'GET') {
      response.writeHead(405, { Allow: 'GET' }).end('Read-only preview');
      return;
    }
    const base = `/${this.#token}/`;
    try {
      if (request.url === base) {
        const nonce = randomBytes(16).toString('base64');
        response.setHeader(
          'Content-Security-Policy',
          `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; img-src data:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'`,
        );
        response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        response.end(PreviewPage.render(nonce));
      } else if (request.url === `${base}state`) {
        const revision = this.session.revision;
        const etag = `"${revision}"`;
        response.setHeader('ETag', etag);
        if (request.headers['if-none-match'] === etag) {
          response.writeHead(304).end();
          return;
        }
        if (revision !== this.#cachedRevision) {
          const document = revision === 0 ? undefined : this.session.document;
          this.#cachedState = JSON.stringify({
            revision,
            svg: document ? this.codec.encode(document) : null,
            width: document?.width ?? null,
            height: document?.height ?? null,
            count: document?.count ?? 0,
          });
          this.#cachedRevision = revision;
        }
        response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        response.end(this.#cachedState);
      } else {
        response.writeHead(404).end('Not found');
      }
    } catch {
      // Rendering failures must never turn a successful CLI edit into a failed command.
      response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Preview unavailable; retrying will not change the document');
    }
  }
}

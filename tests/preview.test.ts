import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { request } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import type { TestContext } from 'node:test';
import { CliController } from '../src/adapters/cli/CliController.js';
import { TreePresenter } from '../src/adapters/cli/TreePresenter.js';
import { FileDocumentRepository } from '../src/adapters/files/FileDocumentRepository.js';
import { PreviewServer } from '../src/adapters/preview/PreviewServer.js';
import { SvgCodec } from '../src/adapters/svg/SvgCodec.js';
import { EditorSession } from '../src/application/EditorSession.js';

type State = {
  revision: number;
  svg: string | null;
  width: number | null;
  height: number | null;
  count: number;
};
const setup = async (t: TestContext) => {
  const session = new EditorSession(new FileDocumentRepository(), new TreePresenter());
  const controller = new CliController(session);
  const server = new PreviewServer(session);
  const url = await server.start();
  t.after(() => server.close());
  const state = async (): Promise<State> => {
    const response = await fetch(url + 'state');
    assert.equal(response.status, 200);
    return (await response.json()) as State;
  };
  const execute = async (line: string) => {
    const result = await controller.execute(line);
    assert.equal(result.failed, false, result.lines.join('\n'));
  };
  return { session, controller, server, url, state, execute };
};

test('preview: unsaved edits, undo/redo, resize, read and init follow memory without writing', async (t) => {
  const { session, state, execute } = await setup(t);
  const directory = await mkdtemp(join(tmpdir(), 'lab1-preview-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  assert.deepEqual(await state(), { revision: 0, svg: null, width: null, height: null, count: 0 });
  await execute('init 400 300');
  assert.equal((await state()).revision, 1);
  await execute('create rect r 10 20 30 40 red');
  const created = await state();
  assert.equal(created.count, 1);
  assert.equal(session.path, undefined);
  assert.deepEqual(await readdir(directory), []);
  await execute('move r 20 0');
  assert.match((await state()).svg!, /x="30"/);
  await execute('undo');
  assert.equal((await state()).svg, created.svg);
  await execute('redo');
  assert.match((await state()).svg!, /x="30"/);
  await execute('canvas 600 500');
  assert.equal((await state()).width, 600);
  assert.equal((await state()).height, 500);
  const input = join(directory, 'input.svg');
  await writeFile(
    input,
    '<svg width="123" height="234"><circle id="c" cx="5" cy="6" r="7"/></svg>',
  );
  await execute(`read "${input}"`);
  assert.match((await state()).svg!, /id="c"/);
  assert.equal((await state()).width, 123);
  assert.equal(session.path, input);
  await execute('init');
  assert.equal((await state()).count, 0);
  assert.equal(session.path, undefined);
  assert.equal(session.revision, 8);
});

test('preview: polling, failed commands and queries preserve path, revision and redo; save keeps barrier', async (t) => {
  const { session, controller, state, execute, url } = await setup(t);
  const directory = await mkdtemp(join(tmpdir(), 'lab1-preview-history-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const target = join(directory, 'saved.svg');
  await execute('init');
  await execute(`save "${target}"`);
  await execute('create rect r 1 2 3 4 red');
  await execute('move r 10 0');
  await execute('undo');
  const before = await state();
  const stored = await readFile(target, 'utf8');
  for (const line of ['tree', 'show r', 'help', 'canvas', '# ignored']) await execute(line);
  for (const line of [
    'create rect r 0 0 1 1',
    'move missing 1 1',
    'canvas -1 2',
    'undo extra',
    `read "${directory}/missing.svg"`,
    `save "${directory}/missing/output.svg"`,
  ])
    assert.equal((await controller.execute(line)).failed, true, line);
  const responses = await Promise.all(Array.from({ length: 5 }, () => state()));
  for (const current of responses) assert.deepEqual(current, before);
  assert.equal(session.path, target);
  assert.equal(await readFile(target, 'utf8'), stored);
  const unchanged = await fetch(url + 'state', {
    headers: { 'If-None-Match': `"${before.revision}"` },
  });
  assert.equal(unchanged.status, 304);
  assert.equal(await unchanged.text(), '');
  await execute('redo');
  assert.match((await state()).svg!, /x="11"/);
  await execute('save');
  const saved = await state();
  assert.equal((await controller.execute('undo')).failed, true);
  assert.deepEqual(await state(), saved);
  assert.equal(await readFile(target, 'utf8'), saved.svg);
});

test('preview: local read-only HTTP boundary, escaped text and no arbitrary file routes', async (t) => {
  const { url, execute, state } = await setup(t);
  await execute('init');
  await execute('create text label 20 30 "<script>alert(1)</script> & 中文"');
  assert.match((await state()).svg!, /&lt;script&gt;/);
  const response = await fetch(url);
  const html = await response.text();
  assert.match(html, /SVG 实时预览/);
  assert.doesNotMatch(html, /alert\(1\)/);
  assert.match(response.headers.get('content-security-policy')!, /img-src data:/);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.headers.get('access-control-allow-origin'), null);
  const navigationStatus = await new Promise<number | undefined>((resolve, reject) => {
    const req = request(
      url,
      { headers: { 'Sec-Fetch-Site': 'cross-site', 'Sec-Fetch-Mode': 'navigate' } },
      (res) => {
        res.resume();
        res.on('end', () => resolve(res.statusCode));
      },
    );
    req.on('error', reject);
    req.end();
  });
  assert.equal(navigationStatus, 200);
  assert.equal((await fetch(url + 'state', { method: 'POST' })).status, 405);
  assert.equal((await fetch(new URL('/', url))).status, 404);
  assert.equal((await fetch(url + 'package.json')).status, 404);
  assert.equal(
    (await fetch(url + 'state', { headers: { Origin: 'https://example.com' } })).status,
    403,
  );
  assert.equal(
    (await fetch(url + 'state', { headers: { 'Sec-Fetch-Site': 'cross-site' } })).status,
    403,
  );
  const hostStatus = await new Promise<number | undefined>((resolve, reject) => {
    const req = request(url + 'state', { headers: { Host: 'evil.example' } }, (res) => {
      res.resume();
      res.on('end', () => resolve(res.statusCode));
    });
    req.on('error', reject);
    req.end();
  });
  assert.equal(hostStatus, 403);
});

test('preview: unchanged requests reuse encoding; render failure is isolated and retryable', async (t) => {
  let calls = 0;
  let fail = false;
  class CountingCodec extends SvgCodec {
    override encode(document: Parameters<SvgCodec['encode']>[0]): string {
      calls++;
      if (fail) throw new Error('injected render failure');
      return super.encode(document);
    }
  }
  const session = new EditorSession(new FileDocumentRepository(), new TreePresenter());
  const controller = new CliController(session);
  const server = new PreviewServer(session, new CountingCodec());
  const url = await server.start();
  t.after(() => server.close());
  session.initialize();
  for (let i = 0; i < 3; i++) assert.equal((await fetch(url + 'state')).status, 200);
  assert.equal(calls, 1);
  await controller.execute('create g scene');
  fail = true;
  assert.equal((await fetch(url + 'state')).status, 500);
  assert.equal(session.document.count, 1);
  fail = false;
  assert.equal((await fetch(url + 'state')).status, 200);
  assert.equal((await controller.execute('undo')).failed, false);
  assert.equal(session.document.count, 0);
  await server.close();
  await server.close();
  await assert.rejects(fetch(url + 'state'));
});

test(
  'preview: real CLI publishes unsaved state and closes HTTP service on EOF',
  { timeout: 15000 },
  async (t) => {
    const entrypoint = fileURLToPath(new URL('../src/bootstrap/Main.ts', import.meta.url));
    const child = spawn(process.execPath, [
      '--import',
      import.meta.resolve('tsx'),
      entrypoint,
      '--preview',
    ]);
    t.after(() => {
      child.kill();
    });
    let output = '';
    let errors = '';
    child.stderr.on('data', (chunk: Buffer) => {
      errors += chunk.toString();
    });
    const exited = once(child, 'exit');
    const url = await new Promise<string>((resolve, reject) => {
      child.on('error', reject);
      child.once('exit', () => reject(new Error('CLI exited before preview URL: ' + errors)));
      child.stdout.on('data', (chunk: Buffer) => {
        output += chunk.toString();
        const match = output.match(/http:\/\/127\.0\.0\.1:\d+\/[a-f0-9]+\//);
        if (match) resolve(match[0]);
      });
    });
    child.stdin.write('init 250 150\ncreate circle c 30 40 10 blue\n');
    let current: State | undefined;
    for (let attempt = 0; attempt < 50; attempt++) {
      current = (await (await fetch(url + 'state')).json()) as State;
      if (current.count === 1) break;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    assert.equal(current?.width, 250);
    assert.match(current?.svg ?? '', /fill="blue"/);
    child.stdin.end();
    assert.equal((await exited)[0], 0, errors);
    assert.equal(errors, '');
    await assert.rejects(fetch(url + 'state'));
    const invalid = spawnSync(
      process.execPath,
      ['--import', import.meta.resolve('tsx'), entrypoint, '--unknown'],
      { encoding: 'utf8', timeout: 5000 },
    );
    assert.equal(invalid.status, 1);
    assert.match(invalid.stderr, /usage:/);
  },
);

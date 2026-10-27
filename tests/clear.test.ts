import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PassThrough } from 'node:stream';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { CliController } from '../src/adapters/cli/CliController.js';
import { Repl } from '../src/adapters/cli/Repl.js';
import { TreePresenter } from '../src/adapters/cli/TreePresenter.js';
import { FileDocumentRepository } from '../src/adapters/files/FileDocumentRepository.js';
import { PreviewServer } from '../src/adapters/preview/PreviewServer.js';
import { SvgCodec } from '../src/adapters/svg/SvgCodec.js';
import { EditorSession } from '../src/application/EditorSession.js';

const clearSequence = '\u001b[2J\u001b[3J\u001b[H';

test('clear: no document required; preview, saved file, binding, revision and histories stay intact', async (t) => {
  const session = new EditorSession(new FileDocumentRepository(), new TreePresenter());
  const controller = new CliController(session);
  const directory = await mkdtemp(join(tmpdir(), 'lab1-clear-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const server = new PreviewServer(session);
  const url = await server.start();
  t.after(() => server.close());
  const execute = async (line: string) => {
    const result = await controller.execute(line);
    assert.equal(result.failed, false, result.lines.join('\n'));
    return result;
  };
  assert.deepEqual(await execute('clear'), { lines: [], failed: false, clearDisplay: true });
  assert.equal(session.revision, 0);
  assert.equal(session.path, undefined);
  assert.throws(() => session.document, /no document/);
  assert.ok((await execute('help')).lines.some((line) => line.startsWith('clear')));
  await execute('init');
  await execute('create rect r 1 2 3 4 red');
  const path = join(directory, 'saved.svg');
  await execute(`save "${path}"`);
  const saved = await readFile(path, 'utf8');
  await execute('clear');
  const blocked = await controller.execute('undo');
  assert.equal(blocked.failed, true);
  assert.match(blocked.lines.join('\n'), /undo not allowed after io command/);
  await execute('move r 10 20');
  await execute('undo');
  const before = new SvgCodec().encode(session.document);
  const revision = session.revision;
  const previewBefore = await (await fetch(url + 'state')).text();
  for (const line of ['clear', '  clear  ', 'clear']) {
    assert.equal((await execute(line)).clearDisplay, true);
  }
  const invalid = await controller.execute('clear extra');
  assert.equal(invalid.failed, true);
  assert.equal(invalid.clearDisplay, undefined);
  assert.equal(new SvgCodec().encode(session.document), before);
  assert.equal(session.path, path);
  assert.equal(session.revision, revision);
  assert.equal(await (await fetch(url + 'state')).text(), previewBefore);
  assert.equal(await readFile(path, 'utf8'), saved);
  await execute('redo');
  assert.equal(session.document.find('r').attributes.x, '11');
  await execute('clear');
  await execute('undo');
  assert.equal(new SvgCodec().encode(session.document), before);
});

test('clear: interactive REPL clears only on success, restores prompt and keeps processing', async () => {
  const input = new PassThrough();
  const output = new PassThrough();
  const errors = new PassThrough();
  let stdout = '';
  let stderr = '';
  output.on('data', (chunk: Buffer) => {
    stdout += chunk.toString();
  });
  errors.on('data', (chunk: Buffer) => {
    stderr += chunk.toString();
  });
  const session = new EditorSession(new FileDocumentRepository(), new TreePresenter());
  const repl = new Repl(new CliController(session), input, output, errors, true, 'test');
  const running = repl.run();
  input.end('clear extra\nclear\ninit 200 100\ncreate circle c 20 30 10\nclear\nshow c\n');
  assert.equal(await running, 0);
  assert.equal(stdout.split(clearSequence).length - 1, 2);
  const finalScreen = stdout.slice(stdout.lastIndexOf(clearSequence) + clearSequence.length);
  assert.match(finalScreen, /svg> /);
  assert.match(finalScreen, /circle#c/);
  assert.match(stderr, /invalid arguments/);
  assert.equal(session.document.count, 1);
});

test('clear: real script replay emits no terminal controls and preserves redo across clear/error', () => {
  const entrypoint = fileURLToPath(new URL('../src/bootstrap/Main.ts', import.meta.url));
  const result = spawnSync(process.execPath, ['--import', import.meta.resolve('tsx'), entrypoint], {
    input:
      'clear\ninit\ncreate rect r 1 2 3 4 red\nmove r 10 0\nundo\nclear\nclear extra\nredo\nshow r\n',
    encoding: 'utf8',
    timeout: 10000,
  });
  assert.equal(result.error, undefined);
  assert.equal(result.status, 1);
  assert.doesNotMatch(result.stdout, /\u001b|svg> /);
  assert.match(result.stdout, /x=11 y=2 width=3 height=4/);
  assert.deepEqual(result.stderr.trim().split('\n'), [
    'error: invalid arguments. use help for syntax',
  ]);
});

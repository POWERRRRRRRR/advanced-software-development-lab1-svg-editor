import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { CliController } from '../src/adapters/cli/CliController.js';
import { Tokenizer } from '../src/adapters/cli/Tokenizer.js';
import { TreePresenter } from '../src/adapters/cli/TreePresenter.js';
import { FileDocumentRepository } from '../src/adapters/files/FileDocumentRepository.js';
import { SvgCodec } from '../src/adapters/svg/SvgCodec.js';
import { EditorSession } from '../src/application/EditorSession.js';

const project = fileURLToPath(new URL('..', import.meta.url));
const entrypoint = join(project, 'src/bootstrap/Main.ts');
const loader = import.meta.resolve('tsx');
const run = (input: string, cwd: string) =>
  spawnSync(process.execPath, ['--import', loader, entrypoint], {
    input,
    encoding: 'utf8',
    cwd,
    timeout: 15000,
  });

test('CLI: tokenizer preserves quoted spaces, empty content, escapes, colors and literal in', () => {
  const parser = new Tokenizer();
  assert.deepEqual(parser.parse('  # whole line'), []);
  assert.deepEqual(parser.parse('  '), []);
  const tokens = parser.parse(String.raw`create text t 1 2 "a \"quote\" \\ 中文" in g`);
  assert.equal(tokens[5]!.value, 'a "quote" \\ 中文');
  assert.equal(tokens[5]!.quoted, true);
  assert.equal(parser.parse('set t text ""')[3]!.value, '');
  assert.equal(parser.parse('set r fill #ffffff')[3]!.value, '#ffffff');
  assert.equal(parser.parse('create text t 0 0 "in"')[5]!.quoted, true);
  for (const line of ['set t text "oops', 'a"b"', '"a"b']) assert.throws(() => parser.parse(line));
});

test('CLI: exact tree branches, inline properties, subtree and show parent', async () => {
  const controller = new CliController(
    new EditorSession(new FileDocumentRepository(), new TreePresenter()),
  );
  for (const line of [
    'init 400 300',
    'create g scene',
    'create rect r 1 2 3 4 red in scene',
    'create text t 5 6 "开始" in scene',
    'create circle c 1 2 3',
  ]) {
    assert.equal((await controller.execute(line)).failed, false);
  }
  assert.deepEqual((await controller.execute('tree')).lines, [
    'svg (400x300)',
    '├── g#scene',
    '│   ├── rect#r x=1 y=2 w=3 h=4 fill=red',
    '│   └── text#t (5,6) "开始"',
    '└── circle#c cx=1 cy=2 r=3',
  ]);
  assert.deepEqual((await controller.execute('tree scene')).lines, [
    'g#scene',
    '├── rect#r x=1 y=2 w=3 h=4 fill=red',
    '└── text#t (5,6) "开始"',
  ]);
  assert.deepEqual((await controller.execute('show r')).lines, [
    'rect#r  parent=g#scene',
    '  x=1 y=2 width=3 height=4',
    '  fill=red',
  ]);
  assert.equal((await controller.execute('show c')).lines[0], 'circle#c  parent=svg');
});

test('CLI: errors are single-line, comments/help need no document, failures preserve redo', async () => {
  const controller = new CliController(
    new EditorSession(new FileDocumentRepository(), new TreePresenter()),
  );
  assert.equal((await controller.execute('# comment')).failed, false);
  assert.equal((await controller.execute('help')).failed, false);
  assert.deepEqual((await controller.execute('tree')).lines, [
    "error: no document. use 'init' or 'read' first",
  ]);
  await controller.execute('init');
  await controller.execute('create g g');
  await controller.execute('undo');
  const failure = await controller.execute('delete "bad\nid"');
  assert.equal(failure.failed, true);
  assert.equal(failure.lines.length, 1);
  assert.doesNotMatch(failure.lines[0]!, /[\r\n]/);
  assert.equal((await controller.execute('redo')).failed, false);
  assert.equal((await controller.execute('show g')).failed, false);
});

test('CLI: replay assignment section 6 verbatim through a real process', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'svg-transcript-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const assignment = await readFile(join(project, 'phase_cli_1.md'), 'utf8');
  const section = assignment.split('## 6. 典型会话')[1]!.split('### 6.1')[0]!;
  const commands = [...section.matchAll(/^svg> (.+)$/gm)].map((match) => match[1]);
  assert.equal(commands.length, 19);
  await writeFile(
    join(directory, 'other.svg'),
    await readFile(join(project, 'examples/other.svg')),
  );
  const result = run(commands.join('\n') + '\n', directory);
  assert.equal(result.error, undefined);
  assert.equal(result.status, 1);
  assert.deepEqual(result.stderr.trim().split('\n'), [
    'error: cannot group a container into its own descendant: markers',
    'error: undo not allowed after io command',
  ]);
  assert.match(result.stdout, /saved to demo\.svg \(5 elements\)/);
  assert.match(result.stdout, /warning: assigned id rect1 to unnamed <rect>/);
  assert.match(result.stdout, /read other\.svg \(7 elements\)/);
  assert.match(result.stdout, /ellipse#e1 cx=1 cy=2 rx=3 ry=4/);
  const saved = new SvgCodec().decode(await readFile(join(directory, 'demo.svg'), 'utf8')).document;
  assert.equal(saved.count, 5);
  assert.equal(saved.find('c1').attributes.cx, '130');
  assert.equal(saved.find('title').text, 'My Diagram');
  assert.equal(saved.find('box').parent!.id, 'markers');
});

test('CLI: replay assignment flowchart A and verify generated geometry and labels', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'svg-flowchart-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const assignment = await readFile(join(project, 'phase_cli_1.md'), 'utf8');
  const section = assignment.split('### 6.1')[1]!.split('**版本 B')[0]!;
  const commands = [...section.matchAll(/^svg> (.+)$/gm)].map((match) => match[1]);
  assert.equal(commands.length, 14);
  const result = run(commands.join('\n') + '\n', directory);
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  assert.match(result.stdout, /saved to flowchart\.svg \(8 elements\)/);
  const saved = new SvgCodec().decode(
    await readFile(join(directory, 'flowchart.svg'), 'utf8'),
  ).document;
  assert.equal(saved.count, 8);
  assert.equal(saved.find('process').attributes.y, '100');
  assert.equal(saved.find('process-label').text, '处理数据 v2');
  assert.deepEqual(
    saved.find('flowchart').children.map((shape) => shape.id),
    ['node1', 'node2', 'arrow1'],
  );
});

test('CLI: script continues after errors, handles quoted paths and EOF', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'svg-cli-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const result = run(
    '# comment\nhelp\ninit\ncreate box b\ncreate text t 0 0 "in"\nset t text ""\nsave "with space.svg"\nundo\nshow t\n',
    directory,
  );
  assert.equal(result.status, 1);
  assert.deepEqual(result.stderr.trim().split('\n'), [
    'error: unknown shape type: box (is the plugin loaded?)',
    'error: undo not allowed after io command',
  ]);
  assert.doesNotMatch(result.stdout, /svg> /);
  assert.match(result.stdout, /text=""/);
  const saved = new SvgCodec().decode(
    await readFile(join(directory, 'with space.svg'), 'utf8'),
  ).document;
  assert.equal(saved.find('t').text, '');
  assert.equal(run('', directory).status, 0);
});

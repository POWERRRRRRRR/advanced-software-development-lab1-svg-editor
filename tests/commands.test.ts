import assert from 'node:assert/strict';
import test from 'node:test';
import { CommandFactory } from '../src/application/CommandFactory.js';
import type { DocumentPresenter } from '../src/application/DocumentPresenter.js';
import type { DocumentRepository, LoadedDocument } from '../src/application/DocumentRepository.js';
import { EditorSession } from '../src/application/EditorSession.js';
import type { SvgDocument } from '../src/domain/SvgDocument.js';
import type { Shape } from '../src/domain/Shape.js';

class MemoryRepository implements DocumentRepository {
  readonly files = new Map<string, SvgDocument>();
  async read(path: string): Promise<LoadedDocument> {
    const document = this.files.get(path);
    if (!document) throw new Error(`cannot read file: ${path}`);
    return { document: document.clone(), warnings: [] };
  }
  async write(path: string, document: SvgDocument): Promise<void> {
    if (path === 'unwritable') throw new Error(`cannot write file: ${path}`);
    this.files.set(path, document.clone());
  }
}
class NullPresenter implements DocumentPresenter {
  tree(document: SvgDocument, id?: string): readonly string[] {
    return [id ? document.find(id).summary() : `svg (${document.width}x${document.height})`];
  }
  show(document: SvgDocument, id: string): readonly string[] {
    return [document.find(id).summary()];
  }
}
class Harness {
  readonly repository = new MemoryRepository();
  readonly session = new EditorSession(this.repository, new NullPresenter());
  readonly commands = new CommandFactory();
  run(name: string, ...values: string[]): Promise<readonly string[]> {
    return this.commands
      .create(
        name,
        values.map((value) => ({ value, quoted: false })),
      )
      .execute(this.session);
  }
  state(): string {
    const document = this.session.document;
    const view = (shape: Shape): unknown => ({
      id: shape.id,
      attributes: shape.attributes,
      text: shape.text,
      children: shape.children.map(view),
    });
    return JSON.stringify({
      width: document.width,
      height: document.height,
      path: this.session.path,
      children: document.children.map(view),
    });
  }
  async setup(): Promise<void> {
    await this.run('init');
    await this.run('create', 'g', 'scene');
    await this.run('create', 'g', 'nested', 'in', 'scene');
    await this.run('create', 'rect', 'r', '1', '2', '3', '4', 'red', 'in', 'nested');
    await this.run('create', 'circle', 'c', '20', '30', '4', 'in', 'scene');
    await this.run('create', 'text', 't', '1', '2', 'start', 'in', 'scene');
  }
}

for (const [name, ...args] of [
  ['create', 'ellipse', 'e', '1', '2', '3', '4', 'in', 'nested'],
  ['delete', 'nested'],
  ['move', 'scene', '10', '20'],
  ['scale', 'scene', '2'],
  ['set', 'r', 'width', '12'],
  ['set', 't', 'text', '处理数据 v2'],
  ['group', 'bundle', 't', 'r'],
  ['ungroup', 'nested'],
  ['addto', 'nested', 'c'],
  ['front', 'nested'],
  ['back', 't'],
]) {
  test(`commands: ${name} ${args.join(' ')} undo and redo restore exact tree`, async () => {
    const h = new Harness();
    await h.setup();
    const before = h.state();
    await h.run(name!, ...args);
    const after = h.state();
    assert.notEqual(after, before);
    await h.run('undo');
    assert.equal(h.state(), before);
    await h.run('redo');
    assert.equal(h.state(), after);
  });
}

test('commands: IO barriers, failed IO, queries and new edits preserve correct history', async () => {
  const h = new Harness();
  assert.ok((await h.run('help')).includes('undo'));
  await assert.rejects(h.run('undo'), /no document/);
  await h.setup();
  await h.run('save', 'saved.svg');
  await assert.rejects(h.run('undo'), /undo not allowed after io command/);
  await h.run('move', 'r', '1', '1');
  await h.run('undo');
  const undone = h.state();
  await h.run('tree');
  await h.run('show', 'r');
  await h.run('canvas');
  await h.run('help');
  await assert.rejects(h.run('save', 'unwritable'), /cannot write file/);
  await assert.rejects(h.run('read', 'missing'), /cannot read file/);
  assert.equal(h.state(), undone);
  await h.run('redo');
  assert.equal(h.session.document.find('r').attributes.x, '2');
  await h.run('undo');
  await assert.rejects(h.run('set', 'r', 'unknown', 'x'), /unknown attribute/);
  await h.run('redo');
  await h.run('undo');
  await h.run('set', 't', 'text', 'new edit');
  await assert.rejects(h.run('redo'), /nothing to redo/);
  await h.run('canvas', '400', '300');
  await assert.rejects(h.run('redo'), /undo not allowed after io command/);
  await h.run('create', 'g', 'fresh');
  await h.run('undo');
  await assert.rejects(h.run('undo'), /nothing to undo/);
  await h.run('read', 'saved.svg');
  assert.equal(h.session.path, 'saved.svg');
  await assert.rejects(h.run('undo'), /undo not allowed after io command/);
  await h.run('init');
  assert.equal(h.session.path, undefined);
  await assert.rejects(h.run('save'), /no file path/);
});

test('commands: all specified failures leave document/path/history unchanged', async () => {
  const h = new Harness();
  await h.setup();
  await h.run('move', 'r', '1', '0');
  await h.run('undo');
  const before = h.state();
  for (const [name, ...args] of [
    ['create', 'g', 'scene'],
    ['create', 'g', 'x', 'in', 'missing'],
    ['create', 'g', 'x', 'in', 'r'],
    ['create', 'box', 'x'],
    ['delete', 'missing'],
    ['group', 'bad', 'scene', 'r'],
    ['ungroup', 'scene'],
    ['addto', 'nested', 'scene'],
    ['scale', 'scene', '0'],
    ['set', 'r', 'height', '-1'],
    ['canvas', '400'],
    ['init', '0', '2'],
    ['move', 'r', 'NaN', '0'],
  ]) {
    await assert.rejects(h.run(name!, ...args));
    assert.equal(h.state(), before, `${name} mutated state`);
  }
  await h.run('redo');
  assert.equal(h.session.document.find('r').attributes.x, '2');
});

test('commands: partially executed recursive overflow is rolled back with history intact', async () => {
  const h = new Harness();
  await h.run('init');
  await h.run('create', 'g', 'g');
  await h.run('create', 'rect', 'a', '1', '2', '3', '4', 'in', 'g');
  await h.run('create', 'circle', 'b', '1e308', '2', '3', 'in', 'g');
  const before = h.state();
  await assert.rejects(h.run('scale', 'g', '2'), /invalid cx/);
  assert.equal(h.state(), before);
  await h.run('undo');
  assert.equal(h.session.document.has('b'), false);
});

test('commands: snapshots exposed for inspection cannot mutate current or redo document', async () => {
  const h = new Harness();
  await h.setup();
  const snapshot = h.session.document;
  snapshot.find('r').move(100, 100);
  assert.equal(h.session.document.find('r').attributes.x, '1');
  await h.run('move', 'r', '1', '0');
  await h.run('undo');
  h.session.document.find('r').set('fill', 'pink');
  await h.run('redo');
  assert.equal(h.session.document.find('r').attributes.fill, 'red');
});

test('commands: a quoted in remains text, factory rejects unknown commands and extra arguments', async () => {
  const h = new Harness();
  await h.run('init');
  await h.commands
    .create('create', [
      { value: 'text', quoted: false },
      { value: 't', quoted: false },
      { value: '0', quoted: false },
      { value: '0', quoted: false },
      { value: 'in', quoted: true },
    ])
    .execute(h.session);
  assert.equal(h.session.document.find('t').text, 'in');
  assert.throws(() => h.commands.create('wat', []), /unknown command: wat/);
  await assert.rejects(h.run('undo', 'extra'), /invalid arguments/);
});

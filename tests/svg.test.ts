import assert from 'node:assert/strict';
import { chmod, mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { FileDocumentRepository } from '../src/adapters/files/FileDocumentRepository.js';
import { NodeFileAccess } from '../src/adapters/files/NodeFileAccess.js';
import { SvgCodec } from '../src/adapters/svg/SvgCodec.js';
import { UniformTransform } from '../src/adapters/svg/UniformTransform.js';
import { EditorSession } from '../src/application/EditorSession.js';
import { CommandFactory } from '../src/application/CommandFactory.js';
import { ShapeFactory } from '../src/domain/ShapeFactory.js';
import { SvgDocument } from '../src/domain/SvgDocument.js';

const codec = new SvgCodec();
const svg = (body: string, attributes = ''): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200" ${attributes}>${body}</svg>`;

test('SVG: all six types, order, whitespace, Chinese and entities survive round trip', () => {
  const source = svg(
    '<rect id="r" x="1" y="2" width="3" height="4"/><g id="g"><text id="t" x="1" y="2">  A &amp; B &lt;中文&gt; \n </text><circle id="c" r="3"/></g><ellipse id="e" rx="2" ry="3"/><line id="l" x2="20" stroke="black"/>',
  );
  const { document, warnings } = codec.decode(source);
  assert.deepEqual(warnings, []);
  assert.equal(document.count, 6);
  assert.equal(document.find('t').text, '  A & B <中文> \n ');
  const encoded = codec.encode(document);
  assert.match(encoded, /A &amp; B &lt;中文&gt;/);
  const second = codec.decode(encoded).document;
  assert.equal(codec.encode(second), encoded);
  assert.deepEqual(
    second.children.map((s) => s.id),
    ['r', 'g', 'e', 'l'],
  );
  assert.deepEqual(
    second.find('g').children.map((s) => s.id),
    ['t', 'c'],
  );
});

test('SVG: missing IDs reserve later explicit IDs and print exact warnings', () => {
  const { document, warnings } = codec.decode(
    svg('<rect/><rect id="rect1"/><rect/><g><circle/><circle id="circle1"/></g>'),
  );
  assert.deepEqual(
    document.elements().map((s) => s.id),
    ['rect2', 'rect1', 'rect3', 'g1', 'circle2', 'circle1'],
  );
  assert.deepEqual(warnings, [
    'warning: assigned id rect2 to unnamed <rect>',
    'warning: assigned id rect3 to unnamed <rect>',
    'warning: assigned id g1 to unnamed <g>',
    'warning: assigned id circle2 to unnamed <circle>',
  ]);
  assert.throws(() => codec.decode(svg('<g id="a"><rect id="a"/></g>')), /id already exists: a/);
  assert.throws(() => codec.decode(svg('<rect id=""/>')), /invalid id/);
});

test('SVG: nested transforms normalize geometry, stroke width and text size', () => {
  const { document } = codec.decode(
    svg(
      '<g id="outer" transform="translate(60,40)" fill="blue" font-size="20"><g id="inner" transform="translate(200,0) scale(0.8)"><rect id="r" x="0" y="0" width="120" height="60"/><text id="t" x="60" y="38" text-anchor="middle" fill="white">End</text><line id="l" x2="10" stroke="red" stroke-width="2"/></g></g>',
    ),
  );
  assert.equal(document.find('r').attributes.x, '260');
  assert.equal(document.find('r').attributes.y, '40');
  assert.equal(document.find('r').attributes.width, '96');
  assert.equal(document.find('t').attributes.x, '308');
  assert.equal(document.find('t').attributes['font-size'], '16');
  assert.equal(document.find('l').attributes['stroke-width'], '1.6');
  assert.equal(document.find('inner').parent!.id, 'outer');
  const saved = codec.encode(document);
  assert.doesNotMatch(saved, /transform=/);
  assert.equal(codec.encode(codec.decode(saved).document), saved);
  document.find('outer').move(10, 20);
  assert.equal(document.find('r').attributes.x, '270');
});

test('SVG: styles inherit, inline overrides attributes, root styles materialize', () => {
  const { document } = codec.decode(
    svg(
      '<g id="g" fill="red" font-family="sans-serif" style="fill:blue; font-weight: bold"><text id="t" x="1px" y="2px" style="fill: white; font-size: 18px" text-anchor="end">start</text><rect id="r" width="2px" height="3px"/></g>',
      'fill="green" stroke="black"',
    ),
  );
  assert.equal(document.find('g').attributes.fill, 'blue');
  assert.equal(document.find('g').attributes.stroke, 'black');
  assert.equal(document.find('t').attributes.fill, 'white');
  assert.equal(document.find('t').attributes['font-size'], '18');
  assert.equal(document.find('r').attributes.fill, undefined);
  document.find('g').set('fill', 'pink');
  assert.equal(document.find('g').attributes.fill, 'pink');
  assert.equal(document.find('r').attributes.fill, undefined);
  assert.equal(codec.encode(codec.decode(codec.encode(document)).document), codec.encode(document));
});

test('SVG: uniform transform order and default viewBox letterboxing', () => {
  const transform = UniformTransform.parse('translate(10,20) scale(2,2) translate(3 4)');
  assert.equal(transform.scale, 2);
  assert.equal(transform.dx, 16);
  assert.equal(transform.dy, 28);
  const { document } = codec.decode(
    svg('<circle id="c" cx="10" cy="20" r="2"/>', 'viewBox="10 20 100 100"'),
  );
  assert.equal(document.find('c').attributes.cx, '100');
  assert.equal(document.find('c').attributes.cy, '0');
  assert.equal(document.find('c').attributes.r, '4');
  const sized = codec.decode('<svg viewBox="0 0 100 50"><rect id="r"/></svg>').document;
  assert.equal(sized.width, 100);
  assert.equal(sized.height, 50);
});

test('SVG: box marker gracefully downgrades to ordinary g', () => {
  const { document } = codec.decode(svg('<g id="box" data-kind="box"><rect id="box-rect"/></g>'));
  assert.equal(document.find('box').tag, 'g');
  assert.equal(document.find('box').children.length, 1);
});

for (const [name, source] of [
  ['malformed XML', '<svg><rect></svg>'],
  ['wrong root', '<html/>'],
  ['duplicate roots', '<svg/><svg/>'],
  ['unknown shape', svg('<path id="p" d="M0 0"/>')],
  ['unsupported geometry attribute', svg('<rect id="r" rx="2"/>')],
  ['rotate', svg('<g id="g" transform="rotate(10)"/>')],
  ['non-uniform scale', svg('<g id="g" transform="scale(2,3)"/>')],
  ['negative scale', svg('<g id="g" transform="scale(-1)"/>')],
  ['unknown CSS', svg('<rect id="r" style="opacity:0.5"/>')],
  ['class stylesheet', svg('<rect id="r" class="red"/>')],
  ['text children', svg('<text id="t"><tspan>Hello</tspan></text>')],
  ['negative dimensions', svg('<circle id="c" r="-1"/>')],
  ['infinite coordinates', svg('<rect id="r" x="1e999"/>')],
  ['relative units', svg('<rect id="r" width="20%"/>')],
  ['viewBox arity', svg('', 'viewBox="0 0 10"')],
  ['viewBox dimensions', svg('', 'viewBox="0 0 0 1"')],
  ['nondefault aspect ratio', svg('', 'preserveAspectRatio="none"')],
  ['external declaration', '<!DOCTYPE svg SYSTEM "file:///etc/passwd"><svg/>'],
  ['currentColor', svg('<rect id="r" fill="currentColor"/>')],
]) {
  test(`SVG: rejects ${name} instead of dropping rendering semantics`, () => {
    assert.throws(() => codec.decode(source!));
  });
}

class RenameFailure extends NodeFileAccess {
  override async replace(): Promise<void> {
    throw new Error('injected rename failure');
  }
}
class PartialWriteFailure extends NodeFileAccess {
  override async writeExclusive(path: string, _content: string, mode: number): Promise<void> {
    await super.writeExclusive(path, 'partial', mode);
    throw new Error('injected write failure');
  }
}

test('files: atomic replacement, mode preservation, failed rename/write and cleanup', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'svg-files-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const destination = join(directory, 'existing.svg');
  await writeFile(destination, 'original');
  await chmod(destination, 0o640);
  const document = new SvgDocument();
  document.add(new ShapeFactory().fromArguments('rect', 'r', ['1', '2', '3', '4']));
  for (const files of [new RenameFailure(), new PartialWriteFailure()]) {
    const repository = new FileDocumentRepository(codec, files);
    await assert.rejects(repository.write(destination, document), /cannot write file/);
    assert.equal(await readFile(destination, 'utf8'), 'original');
    assert.deepEqual(await readdir(directory), ['existing.svg']);
  }
  const repository = new FileDocumentRepository();
  await repository.write(destination, document);
  assert.equal((await repository.read(destination)).document.count, 1);
  assert.equal((await stat(destination)).mode & 0o777, 0o640);
  await assert.rejects(
    repository.write(join(directory, 'missing', 'a.svg'), document),
    /cannot write file/,
  );
  await assert.rejects(repository.read(join(directory, 'missing.svg')), /cannot read file/);
  await chmod(destination, 0o444);
  await assert.rejects(repository.write(destination, document), /cannot write file/);
  await chmod(destination, 0o640);
});

test('files: malformed read and failed save preserve live document, path and redo', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'svg-session-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const bad = join(directory, 'bad.svg');
  await writeFile(bad, svg('<path id="p"/>'));
  const session = new EditorSession(new FileDocumentRepository(), {
    tree: () => [],
    show: () => [],
  });
  const factory = new CommandFactory();
  const run = async (name: string, ...values: string[]): Promise<readonly string[]> =>
    factory
      .create(
        name,
        values.map((value) => ({ value, quoted: false })),
      )
      .execute(session);
  await run('init');
  await run('create', 'rect', 'r', '1', '2', '3', '4');
  const saved = join(directory, 'good.svg');
  await run('save', saved);
  await run('move', 'r', '10', '0');
  await run('undo');
  await assert.rejects(run('read', bad), /unknown shape type/);
  await assert.rejects(run('save', join(directory, 'missing', 'x.svg')), /cannot write file/);
  assert.equal(session.path, saved);
  assert.equal(session.document.find('r').attributes.x, '1');
  await run('redo');
  assert.equal(session.document.find('r').attributes.x, '11');
});

test('SVG: explicit numeric inherit resolves without parsing inherit as a length', () => {
  const { document } = codec.decode(
    svg(
      '<g id="g" font-size="20" stroke-width="3"><text id="t" font-size="inherit" stroke-width="inherit" transform="scale(2)">Hello</text></g>',
    ),
  );
  assert.equal(document.find('t').attributes['font-size'], '40');
  assert.equal(document.find('t').attributes['stroke-width'], '6');
});

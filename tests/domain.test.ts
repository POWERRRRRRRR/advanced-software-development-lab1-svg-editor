import assert from 'node:assert/strict';
import test from 'node:test';
import { Group } from '../src/domain/Group.js';
import { Numbers } from '../src/domain/Numbers.js';
import { ShapeFactory } from '../src/domain/ShapeFactory.js';
import { SvgDocument } from '../src/domain/SvgDocument.js';

const factory = new ShapeFactory();

for (const [type, args, moved, scaled] of [
  [
    'rect',
    ['1', '2', '3', '4'],
    { x: '11', y: '22' },
    { x: '22', y: '44', width: '6', height: '8' },
  ],
  ['circle', ['1', '2', '3'], { cx: '11', cy: '22' }, { cx: '22', cy: '44', r: '6' }],
  [
    'ellipse',
    ['1', '2', '3', '4'],
    { cx: '11', cy: '22' },
    { cx: '22', cy: '44', rx: '6', ry: '8' },
  ],
  [
    'line',
    ['1', '2', '3', '4'],
    { x1: '11', y1: '22', x2: '13', y2: '24' },
    { x1: '22', y1: '44', x2: '26', y2: '48' },
  ],
  ['text', ['1', '2', '开始'], { x: '11', y: '22' }, { x: '22', y: '44' }],
] as const) {
  test(`domain: ${type} geometry, clone isolation and set whitelist`, () => {
    const shape = factory.fromArguments(type, 's', args);
    const clone = shape.clone();
    shape.move(10, 20);
    for (const [key, value] of Object.entries(moved)) assert.equal(shape.attributes[key], value);
    shape.scale(2);
    for (const [key, value] of Object.entries(scaled)) assert.equal(shape.attributes[key], value);
    assert.equal(clone.attributes[Object.keys(moved)[0]!], '1');
    shape.set('fill', 'red');
    assert.equal(shape.attributes.fill, 'red');
    shape.set('stroke-width', '2.5');
    assert.equal(shape.attributes['stroke-width'], '2.5');
    assert.throws(() => shape.set('id', 'renamed'), /unknown attribute: id/);
    assert.throws(() => shape.set('font-size', '20'), /unknown attribute/);
    assert.throws(() => shape.set('stroke-width', '-1'), /non-negative/);
    assert.throws(() => shape.scale(0), /scale factor must be positive/);
  });
}

test('domain: recursive composite behavior and text content', () => {
  const doc = new SvgDocument();
  doc.add(new Group('outer'));
  doc.add(new Group('inner'), 'outer');
  doc.add(factory.fromArguments('rect', 'r', ['1', '2', '3', '4']), 'inner');
  doc.add(factory.fromArguments('text', 't', ['1', '2', 'hello']), 'inner');
  doc.find('outer').move(10, 20);
  doc.find('outer').scale(2);
  assert.equal(doc.find('r').attributes.x, '22');
  assert.equal(doc.find('t').attributes.y, '44');
  doc.find('t').set('text', '');
  assert.equal(doc.find('t').text, '');
  doc.find('outer').set('fill', 'red');
  assert.equal(doc.find('outer').attributes.fill, 'red');
  assert.equal(doc.find('r').attributes.fill, undefined);
  const copy = doc.clone();
  copy.delete('inner');
  assert.equal(copy.count, 1);
  assert.equal(doc.count, 4);
  assert.equal(doc.find('inner').parent!.id, 'outer');
  doc.validate();
  copy.validate();
});

test('domain: uniqueness, case sensitivity, containers and cycle checks', () => {
  const doc = new SvgDocument();
  doc.add(new Group('g'));
  doc.add(new Group('child'), 'g');
  doc.add(factory.fromArguments('rect', 'r', ['0', '0', '1', '1']));
  doc.add(new Group('G'));
  assert.equal(doc.count, 4);
  assert.throws(() => doc.add(new Group('g')), /id already exists: g/);
  assert.throws(() => doc.container('missing'), /no such container/);
  assert.throws(() => doc.container('r'), /not a container: r/);
  assert.throws(() => doc.addTo('child', 'g'), /own descendant: g/);
  assert.throws(() => doc.group('bad', ['child', 'g']), /own descendant: g/);
  assert.throws(() => doc.group('bad', ['r', 'r']), /duplicate group target/);
  assert.throws(() => doc.ungroup('g'), /cannot ungroup top-level/);
  assert.equal(doc.find('g').parent!.children.length, 3);
  doc.validate();
});

test('domain: LCA grouping retains original order; nested ungroup expands in place', () => {
  const doc = new SvgDocument();
  doc.add(new Group('scene'));
  for (const id of ['a', 'b', 'c', 'd']) doc.add(new Group(id), 'scene');
  doc.group('selection', ['d', 'b']);
  assert.deepEqual(
    doc.find('scene').children.map((s) => s.id),
    ['a', 'selection', 'c'],
  );
  assert.deepEqual(
    doc.find('selection').children.map((s) => s.id),
    ['b', 'd'],
  );
  doc.ungroup('selection');
  assert.deepEqual(
    doc.find('scene').children.map((s) => s.id),
    ['a', 'b', 'd', 'c'],
  );
  doc.add(new Group('leaf'), 'a');
  doc.group('cross', ['leaf', 'c']);
  assert.equal(doc.find('cross').parent!.id, 'scene');
  assert.deepEqual(
    doc.find('cross').children.map((s) => s.id),
    ['leaf', 'c'],
  );
  doc.addTo('b', 'leaf');
  assert.equal(doc.find('leaf').parent!.id, 'b');
  doc.reorder('b', true);
  assert.equal(doc.find('scene').children.at(-1)!.id, 'b');
  doc.reorder('b', false);
  assert.equal(doc.find('scene').children[0]!.id, 'b');
  doc.validate();
});

test('domain: finite numbers, dimensions, factory arity and optional styles', () => {
  for (const input of ['NaN', 'Infinity', '1e999', '0x20', '', '1px'])
    assert.throws(() => Numbers.parse(input));
  assert.equal(Numbers.parse('-.5e2'), -50);
  assert.throws(() => new SvgDocument(0, 100), /must be positive/);
  assert.throws(() => factory.fromArguments('rect', 'r', ['0', '0', '-1', '1']), /non-negative/);
  assert.throws(() => factory.fromArguments('circle', 'c', ['0']), /invalid parameters/);
  assert.throws(() => factory.fromArguments('box', 'b', []), /unknown shape type: box/);
  const shape = factory.fromArguments('line', 'l', ['0', '0', '10', '10', 'black']);
  assert.equal(shape.attributes.stroke, 'black');
  assert.equal(factory.fromArguments('circle', 'c', ['0', '0', '1']).attributes.fill, undefined);
  assert.throws(
    () => shape.move(Number.MAX_VALUE, Number.MAX_VALUE + Number.MAX_VALUE),
    /invalid number/,
  );
  assert.equal(shape.attributes.x1, '0');
  const group = new Group('empty');
  assert.throws(() => group.scale(-1), /must be positive/);
});

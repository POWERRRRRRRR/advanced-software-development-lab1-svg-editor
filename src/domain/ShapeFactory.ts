import { Circle } from './Circle.js';
import { Ellipse } from './Ellipse.js';
import { Group } from './Group.js';
import { Line } from './Line.js';
import { Numbers } from './Numbers.js';
import { Rect } from './Rect.js';
import { Shape } from './Shape.js';
import { Text } from './Text.js';

type Definition = {
  geometry: readonly string[];
  optionalStyle?: string;
  content?: boolean;
  build: (
    id: string,
    values: readonly number[],
    styles: Record<string, string>,
    text: string,
  ) => Shape;
};

export class ShapeFactory {
  readonly #definitions = new Map<string, Definition>([
    [
      'rect',
      {
        geometry: ['x', 'y', 'width', 'height'],
        optionalStyle: 'fill',
        build: (id, v, s) => new Rect(id, v[0]!, v[1]!, v[2]!, v[3]!, s),
      },
    ],
    [
      'circle',
      {
        geometry: ['cx', 'cy', 'r'],
        optionalStyle: 'fill',
        build: (id, v, s) => new Circle(id, v[0]!, v[1]!, v[2]!, s),
      },
    ],
    [
      'ellipse',
      {
        geometry: ['cx', 'cy', 'rx', 'ry'],
        optionalStyle: 'fill',
        build: (id, v, s) => new Ellipse(id, v[0]!, v[1]!, v[2]!, v[3]!, s),
      },
    ],
    [
      'line',
      {
        geometry: ['x1', 'y1', 'x2', 'y2'],
        optionalStyle: 'stroke',
        build: (id, v, s) => new Line(id, v[0]!, v[1]!, v[2]!, v[3]!, s),
      },
    ],
    [
      'text',
      {
        geometry: ['x', 'y'],
        content: true,
        build: (id, v, s, text) => new Text(id, v[0]!, v[1]!, text, s),
      },
    ],
    ['g', { geometry: [], build: (id, _v, s) => new Group(id, s) }],
  ]);

  fromArguments(type: string, id: string, parameters: readonly string[]): Shape {
    const definition = this.definition(type);
    const required = definition.geometry.length + (definition.content ? 1 : 0);
    const maximum = required + (definition.optionalStyle ? 1 : 0);
    if (parameters.length < required || parameters.length > maximum)
      throw new Error(`invalid parameters for ${type}`);
    const values = definition.geometry.map((name, index) =>
      Numbers.parse(parameters[index]!, name),
    );
    const styles: Record<string, string> = {};
    if (definition.optionalStyle && parameters.length > required)
      styles[definition.optionalStyle] = parameters[required]!;
    return definition.build(
      id,
      values,
      styles,
      definition.content ? parameters[definition.geometry.length]! : '',
    );
  }

  fromAttributes(
    type: string,
    id: string,
    attributes: Readonly<Record<string, string>>,
    text = '',
  ): Shape {
    const definition = this.definition(type);
    const allowed = [
      ...definition.geometry,
      ...Shape.presentationAttributes,
      'id',
      'transform',
      'style',
      'data-kind',
    ];
    for (const key of Object.keys(attributes)) {
      if (!allowed.includes(key)) throw new Error(`unsupported SVG attribute: ${key}`);
    }
    const values = definition.geometry.map((name) => Numbers.parse(attributes[name] ?? '0', name));
    const styles = Object.fromEntries(
      Shape.presentationAttributes
        .filter((name) => attributes[name] !== undefined)
        .map((name) => [name, attributes[name]!]),
    );
    return definition.build(id, values, styles, text);
  }

  private definition(type: string): Definition {
    const result = this.#definitions.get(type);
    if (!result) throw new Error(`unknown shape type: ${type} (is the plugin loaded?)`);
    return result;
  }
}

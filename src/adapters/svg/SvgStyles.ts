import { Numbers } from '../../domain/Numbers.js';
import { Shape } from '../../domain/Shape.js';

export class SvgStyles {
  static length(value: string, name: string): number {
    return Numbers.parse(value.trim().replace(/px$/, ''), name);
  }
  static own(attributes: Readonly<Record<string, string>>): Record<string, string> {
    const values = Object.fromEntries(
      Shape.presentationAttributes
        .filter((name) => attributes[name] !== undefined)
        .map((name) => [name, attributes[name]!]),
    );
    for (const declaration of (attributes.style ?? '').split(';')) {
      if (!declaration.trim()) continue;
      const separator = declaration.indexOf(':');
      if (separator < 0) throw new Error(`invalid SVG style: ${declaration}`);
      const name = declaration.slice(0, separator).trim();
      const value = declaration.slice(separator + 1).trim();
      if (!Shape.presentationAttributes.includes(name))
        throw new Error(`unsupported SVG style: ${name}`);
      values[name] = value;
    }
    for (const [name, value] of Object.entries(values)) {
      if (value.trim() === 'inherit') {
        delete values[name];
        continue;
      }
      if (
        !value.trim() ||
        /url\s*\(|var\s*\(|!important|^(?:initial|unset|revert|currentColor)$/i.test(value)
      )
        throw new Error(`unsupported SVG style value: ${value}`);
      if (name === 'font-size' || name === 'stroke-width')
        values[name] = String(Numbers.nonNegative(this.length(value, name), name));
    }
    return values;
  }
}

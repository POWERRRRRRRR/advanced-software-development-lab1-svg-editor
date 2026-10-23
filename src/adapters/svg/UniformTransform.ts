import { Numbers } from '../../domain/Numbers.js';

/** Positive uniform scale and translation; composition follows SVG matrix order. */
export class UniformTransform {
  constructor(
    readonly scale = 1,
    readonly dx = 0,
    readonly dy = 0,
  ) {
    Numbers.positive(scale, 'transform scale');
    Numbers.finite(dx);
    Numbers.finite(dy);
  }
  compose(inner: UniformTransform): UniformTransform {
    return new UniformTransform(
      this.scale * inner.scale,
      this.scale * inner.dx + this.dx,
      this.scale * inner.dy + this.dy,
    );
  }
  static numbers(value: string): number[] {
    const number = '[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:[eE][+-]?\\d+)?';
    if (!new RegExp(`^\\s*${number}(?:(?:\\s*,\\s*|\\s+)${number})*\\s*$`).test(value)) {
      throw new Error(`invalid SVG numbers: ${value}`);
    }
    return value
      .trim()
      .split(/[\s,]+/)
      .map((part) => Numbers.parse(part));
  }
  static parse(source = ''): UniformTransform {
    let result = new UniformTransform();
    let position = 0;
    const token = /\s*(?:translate\s*\(([^)]*)\)|scale\s*\(([^)]*)\))\s*/gy;
    while (position < source.length) {
      if (!source.slice(position).trim()) break;
      token.lastIndex = position;
      const match = token.exec(source);
      if (!match) throw new Error(`unsupported SVG transform: ${source}`);
      const parameters = this.numbers(match[1] ?? match[2]!);
      if (parameters.length < 1 || parameters.length > 2)
        throw new Error(`invalid SVG transform: ${source}`);
      if (match[1] !== undefined) {
        result = result.compose(new UniformTransform(1, parameters[0]!, parameters[1] ?? 0));
      } else {
        if (parameters.length === 2 && parameters[0] !== parameters[1])
          throw new Error('unsupported SVG non-uniform scale');
        result = result.compose(new UniformTransform(parameters[0]!));
      }
      position = token.lastIndex;
    }
    return result;
  }
  static viewport(
    attributes: Readonly<Record<string, string>>,
    width: number,
    height: number,
  ): UniformTransform {
    if (attributes.preserveAspectRatio && attributes.preserveAspectRatio.trim() !== 'xMidYMid meet')
      throw new Error('unsupported SVG preserveAspectRatio');
    if (!attributes.viewBox) return new UniformTransform();
    const [x, y, w, h, ...extra] = this.numbers(attributes.viewBox);
    if (x === undefined || y === undefined || w === undefined || h === undefined || extra.length)
      throw new Error('viewBox requires four numbers');
    Numbers.positive(w, 'viewBox width');
    Numbers.positive(h, 'viewBox height');
    const scale = Math.min(width / w, height / h);
    return new UniformTransform(
      scale,
      (width - w * scale) / 2 - x * scale,
      (height - h * scale) / 2 - y * scale,
    );
  }
}

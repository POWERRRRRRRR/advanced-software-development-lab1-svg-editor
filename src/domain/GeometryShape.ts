import { Numbers } from './Numbers.js';
import { Shape } from './Shape.js';

export abstract class GeometryShape extends Shape {
  readonly #geometry: Map<string, number>;
  readonly #horizontal: readonly string[];
  readonly #vertical: readonly string[];
  readonly #dimensions: readonly string[];

  protected constructor(
    id: string,
    geometry: Record<string, number>,
    horizontal: readonly string[],
    vertical: readonly string[],
    dimensions: readonly string[],
    presentation: Record<string, string> = {},
  ) {
    super(id, presentation);
    this.#horizontal = horizontal;
    this.#vertical = vertical;
    this.#dimensions = dimensions;
    this.#geometry = new Map(Object.entries(geometry));
    this.update(geometry);
  }

  override get attributes(): Readonly<Record<string, string>> {
    return {
      ...Object.fromEntries([...this.#geometry].map(([key, value]) => [key, String(value)])),
      ...super.attributes,
    };
  }

  override move(dx: number, dy: number): void {
    Numbers.finite(dx);
    Numbers.finite(dy);
    const changes: Record<string, number> = {};
    for (const name of this.#horizontal) changes[name] = this.coordinate(name) + dx;
    for (const name of this.#vertical) changes[name] = this.coordinate(name) + dy;
    this.update(changes);
  }

  override scale(factor: number): void {
    Numbers.positive(factor, 'scale factor');
    this.update(
      Object.fromEntries([...this.#geometry].map(([key, value]) => [key, value * factor])),
    );
  }

  override set(attribute: string, value: string): void {
    if (this.#geometry.has(attribute))
      this.update({ [attribute]: Numbers.parse(value, attribute) });
    else super.set(attribute, value);
  }

  protected coordinate(name: string): number {
    return this.#geometry.get(name)!;
  }

  private update(changes: Record<string, number>): void {
    for (const [name, value] of Object.entries(changes)) {
      Numbers.finite(value, name);
      if (this.#dimensions.includes(name)) Numbers.nonNegative(value, name);
    }
    for (const [name, value] of Object.entries(changes))
      this.#geometry.set(name, Object.is(value, -0) ? 0 : value);
  }
}

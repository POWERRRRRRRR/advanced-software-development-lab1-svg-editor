import { GeometryShape } from './GeometryShape.js';

export class Text extends GeometryShape {
  #content: string;
  constructor(
    id: string,
    x: number,
    y: number,
    content: string,
    presentation: Record<string, string> = {},
  ) {
    super(id, { x, y }, ['x'], ['y'], [], presentation);
    this.#content = content;
  }
  override get tag(): string {
    return 'text';
  }
  override get text(): string {
    return this.#content;
  }
  override set(attribute: string, value: string): void {
    if (attribute === 'text') this.#content = value;
    else super.set(attribute, value);
  }
  override clone(): Text {
    return new Text(
      this.id,
      this.coordinate('x'),
      this.coordinate('y'),
      this.#content,
      this.presentation(),
    );
  }
  protected override geometrySummary(): string {
    return `(${this.coordinate('x')},${this.coordinate('y')}) ${JSON.stringify(this.#content)}`;
  }
}

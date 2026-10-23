import { GeometryShape } from './GeometryShape.js';

export class Circle extends GeometryShape {
  constructor(
    id: string,
    cx: number,
    cy: number,
    r: number,
    presentation: Record<string, string> = {},
  ) {
    super(id, { cx, cy, r }, ['cx'], ['cy'], ['r'], presentation);
  }
  override get tag(): string {
    return 'circle';
  }
  override clone(): Circle {
    return new Circle(
      this.id,
      this.coordinate('cx'),
      this.coordinate('cy'),
      this.coordinate('r'),
      this.presentation(),
    );
  }
  protected override geometrySummary(): string {
    return `cx=${this.coordinate('cx')} cy=${this.coordinate('cy')} r=${this.coordinate('r')}`;
  }
}

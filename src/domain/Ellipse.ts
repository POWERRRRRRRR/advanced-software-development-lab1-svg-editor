import { GeometryShape } from './GeometryShape.js';

export class Ellipse extends GeometryShape {
  constructor(
    id: string,
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    presentation: Record<string, string> = {},
  ) {
    super(id, { cx, cy, rx, ry }, ['cx'], ['cy'], ['rx', 'ry'], presentation);
  }
  override get tag(): string {
    return 'ellipse';
  }
  override clone(): Ellipse {
    return new Ellipse(
      this.id,
      this.coordinate('cx'),
      this.coordinate('cy'),
      this.coordinate('rx'),
      this.coordinate('ry'),
      this.presentation(),
    );
  }
  protected override geometrySummary(): string {
    return `cx=${this.coordinate('cx')} cy=${this.coordinate('cy')} rx=${this.coordinate('rx')} ry=${this.coordinate('ry')}`;
  }
}

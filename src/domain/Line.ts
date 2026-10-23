import { GeometryShape } from './GeometryShape.js';

export class Line extends GeometryShape {
  constructor(
    id: string,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    presentation: Record<string, string> = {},
  ) {
    super(id, { x1, y1, x2, y2 }, ['x1', 'x2'], ['y1', 'y2'], [], presentation);
  }
  override get tag(): string {
    return 'line';
  }
  override clone(): Line {
    return new Line(
      this.id,
      this.coordinate('x1'),
      this.coordinate('y1'),
      this.coordinate('x2'),
      this.coordinate('y2'),
      this.presentation(),
    );
  }
  protected override geometrySummary(): string {
    return `(${this.coordinate('x1')},${this.coordinate('y1')}) -> (${this.coordinate('x2')},${this.coordinate('y2')})`;
  }
}

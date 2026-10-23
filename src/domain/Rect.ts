import { GeometryShape } from './GeometryShape.js';

export class Rect extends GeometryShape {
  constructor(
    id: string,
    x: number,
    y: number,
    width: number,
    height: number,
    presentation: Record<string, string> = {},
  ) {
    super(id, { x, y, width, height }, ['x'], ['y'], ['width', 'height'], presentation);
  }
  override get tag(): string {
    return 'rect';
  }
  override clone(): Rect {
    return new Rect(
      this.id,
      this.coordinate('x'),
      this.coordinate('y'),
      this.coordinate('width'),
      this.coordinate('height'),
      this.presentation(),
    );
  }
  protected override geometrySummary(): string {
    return `x=${this.coordinate('x')} y=${this.coordinate('y')} w=${this.coordinate('width')} h=${this.coordinate('height')}`;
  }
}

import { Numbers } from './Numbers.js';
import { Shape } from './Shape.js';

export class Group extends Shape {
  readonly #children: Shape[] = [];
  constructor(id: string, presentation: Record<string, string> = {}) {
    super(id, presentation);
  }
  override get tag(): string {
    return 'g';
  }
  override get children(): readonly Shape[] {
    return [...this.#children];
  }
  override asContainer(): Group {
    return this;
  }

  insert(shape: Shape, index = this.#children.length): void {
    if (shape === this)
      throw new Error(`cannot move a container into its own descendant: ${shape.id}`);
    for (let ancestor: Shape | null = this.parent; ancestor; ancestor = ancestor.parent) {
      if (ancestor === shape)
        throw new Error(`cannot move a container into its own descendant: ${shape.id}`);
    }
    if (!Number.isInteger(index) || index < 0 || index > this.#children.length)
      throw new Error('invalid child index');
    shape.parent?.remove(shape);
    this.#children.splice(Math.min(index, this.#children.length), 0, shape);
    shape.attachTo(this);
  }

  remove(shape: Shape): void {
    const index = this.#children.indexOf(shape);
    if (index < 0) throw new Error(`no such child: ${shape.id}`);
    this.#children.splice(index, 1);
    shape.attachTo(null);
  }

  override move(dx: number, dy: number): void {
    Numbers.finite(dx);
    Numbers.finite(dy);
    for (const child of this.#children) child.move(dx, dy);
  }

  override scale(factor: number): void {
    Numbers.positive(factor, 'scale factor');
    for (const child of this.#children) child.scale(factor);
  }

  override clone(): Group {
    const result = new Group(this.id, this.presentation());
    for (const child of this.#children) result.insert(child.clone());
    return result;
  }
  protected override geometrySummary(): string {
    return '';
  }
}

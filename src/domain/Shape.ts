import type { Group } from './Group.js';
import { Numbers } from './Numbers.js';

export abstract class Shape {
  readonly #id: string;
  readonly #presentation = new Map<string, string>();
  #parent: Group | null = null;
  static readonly presentationAttributes: readonly string[] = [
    'fill',
    'stroke',
    'stroke-width',
    'font-size',
    'font-family',
    'font-weight',
    'text-anchor',
  ];

  protected constructor(id: string, presentation: Readonly<Record<string, string>> = {}) {
    if (!id || /[\s"'<>]/.test(id)) throw new Error(`invalid id: ${id}`);
    this.#id = id;
    for (const [key, value] of Object.entries(presentation)) {
      if (!Shape.presentationAttributes.includes(key)) throw new Error(`unknown attribute: ${key}`);
      this.assignPresentation(key, value);
    }
  }

  abstract get tag(): string;
  get id(): string {
    return this.#id;
  }
  get parent(): Group | null {
    return this.#parent;
  }
  get children(): readonly Shape[] {
    return [];
  }
  get attributes(): Readonly<Record<string, string>> {
    return Object.fromEntries(this.#presentation);
  }
  get text(): string | undefined {
    return undefined;
  }
  get label(): string {
    return `${this.tag}#${this.id}`;
  }

  /** Internal ownership operation; only container methods may establish parent links. */
  attachTo(parent: Group | null): void {
    this.#parent = parent;
  }
  asContainer(): Group {
    throw new Error(`not a container: ${this.id}`);
  }
  abstract move(dx: number, dy: number): void;
  abstract scale(factor: number): void;
  abstract clone(): Shape;
  protected abstract geometrySummary(): string;

  set(attribute: string, value: string): void {
    if (!['fill', 'stroke', 'stroke-width'].includes(attribute)) {
      throw new Error(`unknown attribute: ${attribute}`);
    }
    this.assignPresentation(attribute, value);
  }

  summary(): string {
    const details = this.geometrySummary();
    const styles = [...this.#presentation].map(([key, value]) => `${key}=${value}`).join(' ');
    return [this.label, details, styles].filter(Boolean).join(' ');
  }

  protected presentation(): Record<string, string> {
    return Object.fromEntries(this.#presentation);
  }

  private assignPresentation(attribute: string, value: string): void {
    if (attribute === 'stroke-width' || attribute === 'font-size') {
      value = String(Numbers.nonNegative(Numbers.parse(value, attribute), attribute));
    } else if (attribute === 'text-anchor' && !['start', 'middle', 'end'].includes(value)) {
      throw new Error(`invalid text-anchor: ${value}`);
    } else if (!value.trim()) {
      throw new Error(`invalid ${attribute}: ${value}`);
    }
    this.#presentation.set(attribute, value);
  }
}

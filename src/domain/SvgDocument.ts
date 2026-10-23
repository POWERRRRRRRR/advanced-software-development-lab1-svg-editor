import { Group } from './Group.js';
import { Numbers } from './Numbers.js';
import type { Shape } from './Shape.js';

export class SvgDocument {
  #width: number;
  #height: number;
  readonly #root: Group;
  #index = new Map<string, Shape>();

  constructor(width = 800, height = 600, root = new Group('$canvas')) {
    this.#width = Numbers.positive(width, 'canvas width');
    this.#height = Numbers.positive(height, 'canvas height');
    this.#root = root;
    this.validate();
  }
  get width(): number {
    return this.#width;
  }
  get height(): number {
    return this.#height;
  }
  get children(): readonly Shape[] {
    return this.#root.children;
  }
  get count(): number {
    return this.#index.size;
  }
  has(id: string): boolean {
    return this.#index.has(id);
  }
  find(id: string): Shape {
    const shape = this.#index.get(id);
    if (!shape) throw new Error(`no such shape: ${id}`);
    return shape;
  }
  container(id?: string): Group {
    if (id === undefined) return this.#root;
    if (!this.has(id)) throw new Error(`no such container: ${id}`);
    return this.find(id).asContainer();
  }
  parentLabel(shape: Shape): string {
    return shape.parent === this.#root ? 'svg' : shape.parent!.label;
  }
  resize(width: number, height: number): void {
    Numbers.positive(width, 'canvas width');
    Numbers.positive(height, 'canvas height');
    this.#width = width;
    this.#height = height;
  }
  elements(): Shape[] {
    const result: Shape[] = [];
    const visit = (shape: Shape): void => {
      result.push(shape);
      shape.children.forEach(visit);
    };
    this.#root.children.forEach(visit);
    return result;
  }
  add(shape: Shape, parentId?: string): void {
    const parent = this.container(parentId);
    const ids = new Set(this.#index.keys());
    const inspect = (node: Shape): void => {
      if (ids.has(node.id)) throw new Error(`id already exists: ${node.id}`);
      ids.add(node.id);
      node.children.forEach(inspect);
    };
    inspect(shape);
    if (shape.parent) throw new Error(`shape already attached: ${shape.id}`);
    parent.insert(shape);
    this.validate();
  }
  delete(id: string): Shape {
    const shape = this.find(id);
    shape.parent!.remove(shape);
    this.validate();
    return shape;
  }
  addTo(groupId: string, id: string): void {
    const target = this.container(groupId);
    const shape = this.find(id);
    target.insert(shape);
    this.validate();
  }
  reorder(id: string, front: boolean): void {
    const shape = this.find(id);
    const parent = shape.parent!;
    parent.remove(shape);
    parent.insert(shape, front ? parent.children.length : 0);
    this.validate();
  }
  group(id: string, ids: readonly string[]): Group {
    if (this.has(id)) throw new Error(`id already exists: ${id}`);
    const group = new Group(id);
    if (!ids.length) throw new Error('group requires at least one shape');
    const selected = new Set(ids);
    if (selected.size !== ids.length) throw new Error('duplicate group target');
    ids.forEach((item) => this.find(item));
    const nodes = this.elements().filter((node) => selected.has(node.id));
    for (const node of nodes) {
      for (
        let ancestor = node.parent;
        ancestor && ancestor !== this.#root;
        ancestor = ancestor.parent
      ) {
        if (selected.has(ancestor.id))
          throw new Error(`cannot group a container into its own descendant: ${ancestor.id}`);
      }
    }
    let parent = nodes[0]!.parent!;
    while (!nodes.every((node) => this.isInside(node, parent))) parent = parent.parent!;
    const positions = nodes.map((node) => {
      let branch = node;
      while (branch.parent !== parent) branch = branch.parent!;
      return parent.children.indexOf(branch);
    });
    const position = Math.min(...positions);
    for (const node of nodes) group.insert(node);
    parent.insert(group, position);
    this.validate();
    return group;
  }
  ungroup(id: string): number {
    const group = this.find(id).asContainer();
    const parent = group.parent!;
    if (parent === this.#root) throw new Error(`cannot ungroup top-level container: ${id}`);
    const position = parent.children.indexOf(group);
    const children = group.children;
    parent.remove(group);
    children.forEach((child, offset) => parent.insert(child, position + offset));
    this.validate();
    return children.length;
  }
  clone(): SvgDocument {
    return new SvgDocument(this.#width, this.#height, this.#root.clone());
  }
  validate(): void {
    const index = new Map<string, Shape>();
    const visited = new Set<Shape>();
    const visit = (shape: Shape, parent: Group): void => {
      if (visited.has(shape)) throw new Error('document cycle or shared node');
      visited.add(shape);
      if (shape.parent !== parent) throw new Error(`invalid parent: ${shape.id}`);
      if (index.has(shape.id)) throw new Error(`id already exists: ${shape.id}`);
      index.set(shape.id, shape);
      for (const child of shape.children) visit(child, shape.asContainer());
    };
    for (const child of this.#root.children) visit(child, this.#root);
    this.#index = index;
  }
  private isInside(shape: Shape, group: Group): boolean {
    for (let parent = shape.parent; parent; parent = parent.parent)
      if (parent === group) return true;
    return false;
  }
}

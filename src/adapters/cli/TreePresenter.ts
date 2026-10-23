import type { DocumentPresenter } from '../../application/DocumentPresenter.js';
import { Shape } from '../../domain/Shape.js';
import type { SvgDocument } from '../../domain/SvgDocument.js';

export class TreePresenter implements DocumentPresenter {
  tree(document: SvgDocument, id?: string): readonly string[] {
    const lines: string[] = [];
    const visit = (children: readonly Shape[], prefix: string): void => {
      children.forEach((shape, index) => {
        const last = index === children.length - 1;
        lines.push(`${prefix}${last ? '└── ' : '├── '}${shape.summary()}`);
        visit(shape.children, `${prefix}${last ? '    ' : '│   '}`);
      });
    };
    if (id !== undefined) {
      const shape = document.find(id);
      lines.push(shape.summary());
      visit(shape.children, '');
    } else {
      lines.push(`svg (${document.width}x${document.height})`);
      visit(document.children, '');
    }
    return lines;
  }
  show(document: SvgDocument, id: string): readonly string[] {
    const shape = document.find(id);
    const geometry: string[] = [];
    const styles: string[] = [];
    for (const [key, value] of Object.entries(shape.attributes)) {
      (Shape.presentationAttributes.includes(key) ? styles : geometry).push(`${key}=${value}`);
    }
    if (shape.text !== undefined) geometry.push(`text=${JSON.stringify(shape.text)}`);
    return [
      `${shape.label}  parent=${document.parentLabel(shape)}`,
      ...[geometry, styles]
        .filter((values) => values.length)
        .map((values) => `  ${values.join(' ')}`),
    ];
  }
}

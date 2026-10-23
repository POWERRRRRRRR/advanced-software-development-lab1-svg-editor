import { XMLBuilder, XMLParser, XMLValidator } from 'fast-xml-parser';
import type { LoadedDocument } from '../../application/DocumentRepository.js';
import { Group } from '../../domain/Group.js';
import { Numbers } from '../../domain/Numbers.js';
import { Shape } from '../../domain/Shape.js';
import { ShapeFactory } from '../../domain/ShapeFactory.js';
import { SvgDocument } from '../../domain/SvgDocument.js';
import { SvgStyles } from './SvgStyles.js';
import { UniformTransform } from './UniformTransform.js';
import { XmlElement } from './XmlElement.js';

type OrderedNode = { [key: string]: string | Record<string, string> | OrderedNode[] };

export class SvgCodec {
  readonly #parser = new XMLParser({
    preserveOrder: true,
    ignoreAttributes: false,
    parseTagValue: false,
    parseAttributeValue: false,
    trimValues: false,
    processEntities: true,
  });
  readonly #builder = new XMLBuilder({
    preserveOrder: true,
    ignoreAttributes: false,
    format: false,
    suppressEmptyNode: true,
  });
  constructor(private readonly factory = new ShapeFactory()) {}

  decode(source: string): LoadedDocument {
    if (/<!DOCTYPE|<!ENTITY|<\?xml-stylesheet/i.test(source))
      throw new Error('unsupported SVG document declaration or stylesheet');
    const validated = XMLValidator.validate(source);
    if (validated !== true) throw new Error(`invalid SVG XML: ${validated.err.msg}`);
    const roots = XmlElement.list(this.#parser.parse(source) as unknown);
    if (roots.length !== 1 || roots[0]!.name !== 'svg')
      throw new Error('SVG requires one <svg> root');
    const root = roots[0]!;
    if (root.content.trim()) throw new Error('unexpected SVG root text');
    const allowed = [
      'xmlns',
      'width',
      'height',
      'viewBox',
      'preserveAspectRatio',
      'version',
      'style',
      ...Shape.presentationAttributes,
    ];
    for (const name of Object.keys(root.attributes))
      if (!allowed.includes(name)) throw new Error(`unsupported SVG root attribute: ${name}`);
    if (root.attributes.xmlns && root.attributes.xmlns !== 'http://www.w3.org/2000/svg')
      throw new Error('invalid SVG namespace');
    const box = root.attributes.viewBox ? UniformTransform.numbers(root.attributes.viewBox) : [];
    const width = Numbers.positive(
      SvgStyles.length(root.attributes.width ?? String(box[2] ?? 800), 'width'),
      'canvas width',
    );
    const height = Numbers.positive(
      SvgStyles.length(root.attributes.height ?? String(box[3] ?? 600), 'height'),
      'canvas height',
    );
    const viewport = UniformTransform.viewport(root.attributes, width, height);
    const styles = SvgStyles.own(root.attributes);
    const reserved = new Set<string>();
    const scan = (element: XmlElement): void => {
      if (element.attributes.id !== undefined) {
        if (reserved.has(element.attributes.id))
          throw new Error(`id already exists: ${element.attributes.id}`);
        reserved.add(element.attributes.id);
      }
      element.children.forEach(scan);
    };
    root.children.forEach(scan);
    const warnings: string[] = [];
    const sequence = new Map<string, number>();
    const build = (
      element: XmlElement,
      inherited: Record<string, string>,
      parentTransform: UniformTransform,
      topLevel = false,
    ): Shape => {
      let id = element.attributes.id;
      if (id === undefined) {
        let counter = sequence.get(element.name) ?? 0;
        do {
          counter++;
          id = `${element.name}${counter}`;
        } while (reserved.has(id));
        sequence.set(element.name, counter);
        reserved.add(id);
        warnings.push(`warning: assigned id ${id} to unnamed <${element.name}>`);
      }
      const own = SvgStyles.own(element.attributes);
      const effective = { ...inherited, ...own };
      const transform = parentTransform.compose(
        UniformTransform.parse(element.attributes.transform),
      );
      const presentation = topLevel ? { ...inherited, ...own } : { ...own };
      const attributes = { ...element.attributes };
      for (const name of Shape.presentationAttributes) delete attributes[name];
      Object.assign(attributes, presentation);
      delete attributes.style;
      delete attributes.transform;
      // Numeric lengths in geometry are normalized by the adapter, independent of shape type.
      for (const name of Object.keys(attributes)) {
        if (/^(?:x|y|cx|cy|r|rx|ry|width|height|x1|y1|x2|y2)$/.test(name))
          attributes[name] = String(SvgStyles.length(attributes[name]!, name));
      }
      const shape = this.factory.fromAttributes(element.name, id, attributes, element.content);
      if (shape.text === undefined && element.content.trim())
        throw new Error(`unexpected text inside ${shape.label}`);
      shape.scale(transform.scale);
      shape.move(transform.dx, transform.dy);
      if (!element.children.length && transform.scale !== 1) {
        const widthValue =
          SvgStyles.length(effective['stroke-width'] ?? '1', 'stroke-width') * transform.scale;
        const fontValue =
          SvgStyles.length(effective['font-size'] ?? '16', 'font-size') * transform.scale;
        const normalized = {
          ...attributes,
          'stroke-width': String(widthValue),
          'font-size': String(fontValue),
        };
        const replacement = this.factory.fromAttributes(
          element.name,
          id,
          normalized,
          element.content,
        );
        replacement.scale(transform.scale);
        replacement.move(transform.dx, transform.dy);
        return replacement;
      }
      for (const child of element.children)
        shape.asContainer().insert(build(child, effective, transform));
      return shape;
    };
    const container = new Group('$canvas');
    for (const element of root.children) container.insert(build(element, styles, viewport, true));
    return { document: new SvgDocument(width, height, container), warnings };
  }

  encode(document: SvgDocument): string {
    document.validate();
    const node = (shape: Shape): OrderedNode => ({
      [shape.tag]: shape.text === undefined ? shape.children.map(node) : [{ '#text': shape.text }],
      ':@': Object.fromEntries(
        Object.entries({ id: shape.id, ...shape.attributes }).map(([key, value]) => [
          `@_${key}`,
          value,
        ]),
      ),
    });
    const root: OrderedNode = {
      svg: document.children.map(node),
      ':@': {
        '@_xmlns': 'http://www.w3.org/2000/svg',
        '@_width': String(document.width),
        '@_height': String(document.height),
        '@_viewBox': `0 0 ${document.width} ${document.height}`,
      },
    };
    return `<?xml version="1.0" encoding="UTF-8"?>\n${this.#builder.build([root]) as string}\n`;
  }
}

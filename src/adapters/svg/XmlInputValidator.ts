import { XMLValidator } from 'fast-xml-parser';

export class XmlInputValidator {
  static validate(source: string): void {
    for (const character of source) {
      if (!this.validCharacter(character.codePointAt(0)!)) throw new Error('invalid XML character');
    }
    const markup = source.replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, '').replace(/<!--[\s\S]*?-->/g, '');
    if (/<!DOCTYPE|<!ENTITY|<\?xml-stylesheet/i.test(markup)) {
      throw new Error('unsupported SVG document declaration or stylesheet');
    }
    const validated = XMLValidator.validate(source);
    if (validated !== true) throw new Error('invalid SVG XML: ' + validated.err.msg);
    for (const reference of markup.matchAll(/&([^;\s<&]*);/g)) {
      const name = reference[1]!;
      if (/^(?:amp|lt|gt|quot|apos)$/.test(name)) continue;
      if (!/^#(?:[0-9]+|x[0-9a-fA-F]+)$/.test(name))
        throw new Error('unknown XML entity: &' + name + ';');
      const point = name.startsWith('#x')
        ? Number.parseInt(name.slice(2), 16)
        : Number(name.slice(1));
      if (!this.validCharacter(point)) throw new Error('invalid XML character reference');
    }
  }
  private static validCharacter(point: number): boolean {
    return (
      point === 9 ||
      point === 10 ||
      point === 13 ||
      (point >= 0x20 && point <= 0xd7ff) ||
      (point >= 0xe000 && point <= 0xfffd) ||
      (point >= 0x10000 && point <= 0x10ffff)
    );
  }
}

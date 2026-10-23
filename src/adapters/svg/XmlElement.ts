export class XmlElement {
  private constructor(
    readonly name: string,
    readonly attributes: Readonly<Record<string, string>>,
    readonly children: readonly XmlElement[],
    readonly content: string,
  ) {}

  static list(value: unknown): XmlElement[] {
    if (!Array.isArray(value)) throw new Error('invalid XML node sequence');
    const result: XmlElement[] = [];
    for (const item of value as unknown[]) {
      if (!item || typeof item !== 'object') throw new Error('invalid XML node');
      const entry = item as Record<string, unknown>;
      const name = Object.keys(entry).find((key) => key !== ':@');
      if (!name) continue;
      if (name === '#text') {
        if (String(entry[name]).trim()) throw new Error('unexpected text outside text element');
        continue;
      }
      if (name.startsWith('?') || name.startsWith('#')) continue;
      const rawAttributes = entry[':@'];
      const attributes: Record<string, string> = {};
      if (rawAttributes && typeof rawAttributes === 'object') {
        for (const [key, item] of Object.entries(rawAttributes))
          attributes[key.replace(/^@_/, '')] = String(item);
      }
      const rawChildren = entry[name];
      if (!Array.isArray(rawChildren)) throw new Error('invalid XML children');
      const content = (rawChildren as Record<string, unknown>[])
        .filter((node) => '#text' in node)
        .map((node) => String(node['#text']))
        .join('');
      const structural = (rawChildren as Record<string, unknown>[]).filter(
        (node) => !('#text' in node),
      );
      result.push(new XmlElement(name, attributes, this.list(structural), content));
    }
    return result;
  }
}

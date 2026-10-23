import type { Argument } from '../../application/Argument.js';

export class Tokenizer {
  parse(line: string): readonly Argument[] {
    if (!line.trim() || line.trimStart().startsWith('#')) return [];
    const tokens: Argument[] = [];
    let position = 0;
    while (position < line.length) {
      if (/\s/.test(line[position]!)) {
        position++;
        continue;
      }
      const quoted = line[position] === '"';
      let value = '';
      if (quoted) {
        position++;
        let closed = false;
        while (position < line.length) {
          const character = line[position++]!;
          if (character === '"') {
            closed = true;
            break;
          }
          if (character === '\\' && ['"', '\\'].includes(line[position] ?? ''))
            value += line[position++]!;
          else value += character;
        }
        if (!closed) throw new Error('unterminated double quote');
        if (position < line.length && !/\s/.test(line[position]!))
          throw new Error('expected whitespace after double quote');
      } else {
        while (position < line.length && !/\s/.test(line[position]!)) {
          if (line[position] === '"') throw new Error('double quote must start an argument');
          value += line[position++]!;
        }
      }
      tokens.push({ value, quoted });
    }
    return tokens;
  }
}

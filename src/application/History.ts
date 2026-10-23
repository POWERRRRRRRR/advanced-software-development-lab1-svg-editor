import type { SvgDocument } from '../domain/SvgDocument.js';
import type { EditCommand } from './EditCommand.js';

export class History {
  readonly #undo: EditCommand[] = [];
  readonly #redo: EditCommand[] = [];
  #blocked = false;
  reset(): void {
    this.#undo.length = 0;
    this.#redo.length = 0;
    this.#blocked = true;
  }
  record(command: EditCommand): void {
    this.#undo.push(command);
    this.#redo.length = 0;
    this.#blocked = false;
  }
  undo(): { document: SvgDocument; output: string } {
    this.allowed();
    const command = this.#undo.at(-1);
    if (!command) throw new Error('nothing to undo');
    const document = command.undo();
    this.#undo.pop();
    this.#redo.push(command);
    return { document, output: `undo: ${command.summary}` };
  }
  redo(): { document: SvgDocument; output: string } {
    this.allowed();
    const command = this.#redo.at(-1);
    if (!command) throw new Error('nothing to redo');
    const document = command.redo();
    this.#redo.pop();
    this.#undo.push(command);
    return { document, output: `redo: ${command.summary}` };
  }
  private allowed(): void {
    if (this.#blocked) throw new Error('undo not allowed after io command');
  }
}

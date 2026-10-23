import type { Argument } from '../Argument.js';
import { Command } from '../Command.js';
import type { EditorSession } from '../EditorSession.js';
import { Numbers } from '../../domain/Numbers.js';

export class CanvasCommand extends Command {
  constructor(args: readonly Argument[]) {
    super(args);
  }
  override async execute(session: EditorSession): Promise<readonly string[]> {
    this.arity(0, 2);
    if (this.args.length === 1) throw new Error('canvas requires both width and height');
    if (!this.args.length) {
      const document = session.document;
      return [`canvas ${document.width}x${document.height}`];
    }
    return session.resize(
      Numbers.parse(this.values[0]!, 'width'),
      Numbers.parse(this.values[1]!, 'height'),
    );
  }
}

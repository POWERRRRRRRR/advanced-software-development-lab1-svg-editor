import type { Argument } from '../Argument.js';
import { Command } from '../Command.js';
import type { EditorSession } from '../EditorSession.js';

export class ReadCommand extends Command {
  constructor(args: readonly Argument[]) {
    super(args);
  }
  override async execute(session: EditorSession): Promise<readonly string[]> {
    this.arity(1);
    return session.read(this.values[0]!);
  }
}

import type { Argument } from '../Argument.js';
import { Command } from '../Command.js';
import type { EditorSession } from '../EditorSession.js';
import { Numbers } from '../../domain/Numbers.js';

export class InitCommand extends Command {
  constructor(args: readonly Argument[]) {
    super(args);
  }
  override async execute(session: EditorSession): Promise<readonly string[]> {
    this.arity(0, 2);
    return session.initialize(
      this.values[0] === undefined ? 800 : Numbers.parse(this.values[0], 'width'),
      this.values[1] === undefined ? 600 : Numbers.parse(this.values[1], 'height'),
    );
  }
}

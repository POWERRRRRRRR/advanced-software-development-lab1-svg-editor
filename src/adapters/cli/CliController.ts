import { CommandFactory } from '../../application/CommandFactory.js';
import type { EditorSession } from '../../application/EditorSession.js';
import { Tokenizer } from './Tokenizer.js';

export class CliController {
  constructor(
    private readonly session: EditorSession,
    private readonly commands = new CommandFactory(),
    private readonly tokenizer = new Tokenizer(),
  ) {}
  async execute(line: string): Promise<{ lines: readonly string[]; failed: boolean }> {
    try {
      const [name, ...arguments_] = this.tokenizer.parse(line);
      if (!name) return { lines: [], failed: false };
      const lines = await this.commands.create(name.value, arguments_).execute(this.session);
      return { lines, failed: false };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unexpected failure';
      return { lines: [`error: ${message.replace(/[\r\n\u2028\u2029]/g, ' ')}`], failed: true };
    }
  }
}

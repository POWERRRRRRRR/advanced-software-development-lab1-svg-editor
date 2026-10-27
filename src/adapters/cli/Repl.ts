import { createInterface } from 'node:readline';
import type { Readable, Writable } from 'node:stream';
import type { CliController } from './CliController.js';

export class Repl {
  constructor(
    private readonly controller: CliController,
    private readonly input: Readable,
    private readonly output: Writable,
    private readonly errors: Writable,
    private readonly interactive: boolean,
    private readonly version: string,
  ) {}
  async run(): Promise<number> {
    this.output.write(`svg-editor ${this.version} — type 'help' for commands\n`);
    const terminal = createInterface({
      input: this.input,
      output: this.output,
      terminal: this.interactive,
    });
    terminal.setPrompt('svg> ');
    terminal.on('SIGINT', () => terminal.close());
    let failed = false;
    try {
      if (this.interactive) terminal.prompt();
      for await (const line of terminal) {
        const result = await this.controller.execute(line);
        if (this.interactive && result.clearDisplay && !result.failed)
          this.output.write('\u001b[2J\u001b[3J\u001b[H');
        const target = result.failed ? this.errors : this.output;
        if (result.lines.length) target.write(`${result.lines.join('\n')}\n`);
        failed ||= result.failed;
        if (this.interactive) terminal.prompt();
      }
    } finally {
      terminal.close();
    }
    return !this.interactive && failed ? 1 : 0;
  }
}

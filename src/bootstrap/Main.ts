import { CliController } from '../adapters/cli/CliController.js';
import { Repl } from '../adapters/cli/Repl.js';
import { TreePresenter } from '../adapters/cli/TreePresenter.js';
import { FileDocumentRepository } from '../adapters/files/FileDocumentRepository.js';
import { EditorSession } from '../application/EditorSession.js';
import { Version } from './Version.js';

export class Main {
  static async run(): Promise<number> {
    const session = new EditorSession(new FileDocumentRepository(), new TreePresenter());
    const repl = new Repl(
      new CliController(session),
      process.stdin,
      process.stdout,
      process.stderr,
      Boolean(process.stdin.isTTY),
      Version.value,
    );
    return repl.run();
  }
}

process.exitCode = await Main.run().catch((error: unknown) => {
  process.stderr.write(
    `error: ${error instanceof Error ? error.message.replace(/[\r\n]/g, ' ') : 'unexpected failure'}\n`,
  );
  return 1;
});

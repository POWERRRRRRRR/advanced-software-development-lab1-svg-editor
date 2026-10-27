import { CliController } from '../adapters/cli/CliController.js';
import { Repl } from '../adapters/cli/Repl.js';
import { TreePresenter } from '../adapters/cli/TreePresenter.js';
import { FileDocumentRepository } from '../adapters/files/FileDocumentRepository.js';
import { EditorSession } from '../application/EditorSession.js';
import { PreviewServer } from '../adapters/preview/PreviewServer.js';
import { Version } from './Version.js';

export class Main {
  static async run(): Promise<number> {
    const args = process.argv.slice(2);
    if (args.length && (args.length !== 1 || args[0] !== '--preview'))
      throw new Error('usage: npm run cli -- [--preview]');
    const session = new EditorSession(new FileDocumentRepository(), new TreePresenter());
    const repl = new Repl(
      new CliController(session),
      process.stdin,
      process.stdout,
      process.stderr,
      Boolean(process.stdin.isTTY && process.stdout.isTTY),
      Version.value,
    );
    const preview = args.includes('--preview') ? new PreviewServer(session) : undefined;
    try {
      if (preview) {
        const url = await preview.start();
        process.stdout.write(`浏览器实时预览（无需 save）：${url}\n`);
      }
      return await repl.run();
    } finally {
      await preview?.close();
    }
  }
}

process.exitCode = await Main.run().catch((error: unknown) => {
  process.stderr.write(
    `error: ${error instanceof Error ? error.message.replace(/[\r\n]/g, ' ') : 'unexpected failure'}\n`,
  );
  return 1;
});

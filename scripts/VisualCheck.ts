import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export class VisualCheck {
  static async run(): Promise<void> {
    const chrome =
      process.env.CHROME_BIN ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    const destination = resolve('doc/engineering/evidence');
    await mkdir(destination, { recursive: true });
    const profile = await mkdtemp(join(tmpdir(), 'lab1-render-'));
    const results = [];
    try {
      for (const { name, input } of [
        { name: 'flowchart', input: 'examples/flowchart.svg' },
        { name: 'transforms', input: 'examples/transforms.svg' },
        { name: 'transforms-normalized', input: 'examples/transforms-normalized.svg' },
        { name: 'architecture', input: 'doc/engineering/architecture.svg' },
      ]) {
        const screenshot = join(destination, `${name}.png`);
        execFileSync(
          chrome,
          [
            '--headless=new',
            '--disable-gpu',
            '--no-first-run',
            '--disable-background-networking',
            '--disable-component-update',
            '--disable-extensions',
            '--hide-scrollbars',
            `--user-data-dir=${profile}`,
            '--window-size=900,650',
            '--virtual-time-budget=1000',
            `--screenshot=${screenshot}`,
            pathToFileURL(resolve(input)).href,
          ],
          { timeout: 30000, stdio: 'pipe' },
        );
        results.push({ input, screenshot: `${name}.png` });
      }
      const report = {
        timestamp: new Date().toISOString(),
        browser: execFileSync(chrome, ['--version'], { encoding: 'utf8' }).trim(),
        method:
          'Isolated local Chrome headless CLI. Browser connector bootstrap failed before browser selection; no user browser profile accessed.',
        viewport: [900, 650],
        results,
      };
      await writeFile(join(destination, 'visual.json'), JSON.stringify(report, null, 2) + '\n');
      const original = await readFile(join(destination, 'transforms.png'));
      const normalized = await readFile(join(destination, 'transforms-normalized.png'));
      const diff = {
        method:
          'Compare complete PNG bytes from the same browser and viewport; identical PNG bytes imply identical pixels.',
        exactPngByteMatch: original.equals(normalized),
        originalBytes: original.length,
        normalizedBytes: normalized.length,
      };
      await writeFile(join(destination, 'visual-diff.json'), JSON.stringify(diff, null, 2) + '\n');
      assert.ok(diff.exactPngByteMatch, 'normalized SVG changed pixels in the visual fixture');
      await copyFile('examples/flowchart.svg', join(destination, 'flowchart.svg'));
      console.log(JSON.stringify(report, null, 2));
    } finally {
      await rm(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
    }
  }
}

await VisualCheck.run();

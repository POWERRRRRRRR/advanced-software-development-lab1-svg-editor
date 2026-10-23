import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

export class ReleaseCheck {
  static async capture(
    executable: string,
    args: readonly string[],
    cwd: string,
    env: NodeJS.ProcessEnv,
    log: string,
    header: string,
    input?: string,
  ): Promise<string> {
    try {
      const output = execFileSync(executable, [...args], {
        cwd,
        env,
        encoding: 'utf8',
        timeout: 120000,
        ...(input === undefined ? {} : { input }),
      });
      await writeFile(log, header + output);
      return output;
    } catch (error) {
      const failure = error as { stdout?: string; stderr?: string };
      await writeFile(log, header + String(failure.stdout ?? '') + String(failure.stderr ?? ''));
      throw error;
    }
  }
  static async run(): Promise<void> {
    const source = process.cwd();
    const destination = resolve('doc/engineering/evidence');
    await mkdir(destination, { recursive: true });
    const checkout = await mkdtemp(join(tmpdir(), 'lab1-release-'));
    const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
    const runtimes = process.argv.slice(2);
    if (!runtimes.length) runtimes.push(process.execPath);
    const results = [];
    try {
      execFileSync('git', ['clone', '--quiet', '--no-hardlinks', '--local', source, checkout]);
      execFileSync('git', ['checkout', '--quiet', '--detach', commit], { cwd: checkout });
      for (const [index, executable] of runtimes.entries()) {
        const node = resolve(executable);
        const env = { ...process.env, PATH: dirname(node) + ':' + process.env.PATH };
        const version = execFileSync(node, ['--version'], { encoding: 'utf8' }).trim();
        const label = 'node-' + version.split('.')[0]!.slice(1);
        const header = 'sourceCommit: ' + commit + '\nnode: ' + version + '\n';
        if (index === 0)
          await this.capture(
            'npm',
            ['ci'],
            checkout,
            env,
            join(destination, 'install.log'),
            header,
          );
        const output = await this.capture(
          'npm',
          ['run', 'check'],
          checkout,
          env,
          join(destination, label + '.log'),
          header,
        );
        const testCount = Number(output.match(/(?:# |ℹ )?tests (\d+)/)?.[1]);
        assert.ok(testCount > 0, 'test runner must report executed tests');
        await this.capture(
          node,
          ['dist/bootstrap/Main.js'],
          checkout,
          env,
          join(destination, label + '-compiled.log'),
          header,
          'init 200 100\ncreate rect r 1 2 3 4 red\nmove r 10 20\nundo\nredo\nsave release-smoke.svg\ntree\n',
        );
        results.push({
          node: version,
          check: 'passed',
          tests: testCount,
          compiledCli: 'passed',
          log: label + '.log',
        });
        console.log(version + ': install/check/compiled smoke passed for ' + commit);
      }
      const report = {
        timestamp: new Date().toISOString(),
        sourceCommit: commit,
        cleanLocalClone: true,
        install: 'npm ci',
        platform: process.platform,
        arch: process.arch,
        results,
      };
      await writeFile(
        join(destination, 'clean-checkout.json'),
        JSON.stringify(report, null, 2) + '\n',
      );
    } finally {
      await rm(checkout, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
    }
  }
}

await ReleaseCheck.run();

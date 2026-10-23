import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { basename, dirname, relative, resolve } from 'node:path';
import test from 'node:test';
import ts from 'typescript';

class ArchitectureAudit {
  async files(directory: string): Promise<string[]> {
    const entries = await readdir(directory, { withFileTypes: true });
    const nested = await Promise.all(
      entries.map(async (entry) => {
        const path = resolve(directory, entry.name);
        return entry.isDirectory() ? this.files(path) : path.endsWith('.ts') ? [path] : [];
      }),
    );
    return nested.flat();
  }

  async verify(): Promise<void> {
    const permitted: Record<string, string[]> = {
      domain: ['domain'],
      application: ['domain', 'application'],
      adapters: ['domain', 'application', 'adapters'],
      bootstrap: ['domain', 'application', 'adapters', 'bootstrap'],
    };
    for (const path of await this.files('src')) {
      const layer = relative(resolve('src'), path).split('/')[0]!;
      const file = ts.createSourceFile(
        path,
        await readFile(path, 'utf8'),
        ts.ScriptTarget.Latest,
        true,
      );
      const classes = file.statements.filter(ts.isClassDeclaration);
      assert.ok(classes.length <= 1, `multiple classes in ${path}`);
      if (classes.length) assert.equal(classes[0]!.name?.text, basename(path, '.ts'));
      const visit = (node: ts.Node): void => {
        assert.ok(!ts.isSwitchStatement(node), `switch dispatch forbidden: ${path}`);
        assert.ok(!ts.isFunctionDeclaration(node), `production free function: ${path}`);
        if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
          const specifier = node.moduleSpecifier.text;
          if (specifier.startsWith('.')) {
            const target = relative(resolve('src'), resolve(dirname(path), specifier)).split(
              '/',
            )[0]!;
            assert.ok(permitted[layer]?.includes(target), `${layer} -> ${target}: ${path}`);
          } else if (layer === 'domain' || layer === 'application') {
            assert.fail(`IO/library dependency in core: ${specifier}`);
          }
        }
        ts.forEachChild(node, visit);
      };
      visit(file);
    }
  }
}

test('architecture: dependency directions, one class per file, no switch/free functions', async () => {
  await new ArchitectureAudit().verify();
});

import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { performance } from 'node:perf_hooks';
import { CommandFactory } from '../src/application/CommandFactory.js';
import { EditorSession } from '../src/application/EditorSession.js';
import { Group } from '../src/domain/Group.js';
import { Rect } from '../src/domain/Rect.js';
import { SvgDocument } from '../src/domain/SvgDocument.js';

export class Benchmark {
  static async sample(count: number): Promise<Record<string, number>> {
    const root = new Group('$canvas');
    const scene = new Group('scene');
    root.insert(scene);
    for (let index = 0; index < count; index++)
      scene.insert(new Rect(`r${index}`, index, index, 10, 10));
    const document = new SvgDocument(20000, 20000, root);
    const clones: number[] = [];
    for (let index = 0; index < 7; index++) {
      const start = performance.now();
      const copy = document.clone();
      clones.push(performance.now() - start);
      assert.equal(copy.count, count + 1);
    }
    const session = new EditorSession(
      { read: async () => ({ document, warnings: [] }), write: async () => undefined },
      { tree: () => [], show: () => [] },
    );
    await session.read('memory.svg');
    const commands = new CommandFactory();
    global.gc?.();
    const memory = process.memoryUsage().heapUsed;
    const edits = 20;
    const start = performance.now();
    for (let index = 0; index < edits; index++)
      await commands
        .create('move', [
          { value: 'scene', quoted: false },
          { value: '1', quoted: false },
          { value: '-1', quoted: false },
        ])
        .execute(session);
    const elapsed = performance.now() - start;
    global.gc?.();
    const heapDeltaMiB = (process.memoryUsage().heapUsed - memory) / 1024 / 1024;
    assert.equal(session.document.find('r0').attributes.x, String(edits));
    const undoStart = performance.now();
    for (let index = 0; index < edits; index++) session.undo();
    const undoMs = performance.now() - undoStart;
    assert.equal(session.document.find('r0').attributes.x, '0');
    const redoStart = performance.now();
    for (let index = 0; index < edits; index++) session.redo();
    const redoMs = performance.now() - redoStart;
    assert.equal(session.document.find('r0').attributes.x, String(edits));
    return {
      shapes: count,
      edits,
      cloneMedianMs: clones.sort((a, b) => a - b)[3]!,
      editTotalMs: elapsed,
      editMeanMs: elapsed / edits,
      undoMeanMs: undoMs / edits,
      redoMeanMs: redoMs / edits,
      heapDeltaMiB,
    };
  }
  static async run(): Promise<void> {
    const results = [];
    for (const count of [100, 1000, 10000]) results.push(await this.sample(count));
    const report = {
      timestamp: new Date().toISOString(),
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      gcExposed: typeof global.gc === 'function',
      notes:
        '7 clone samples (no discarded warm-up); 20 edits with retained history; means are observations, not an SLA. Includes assertions for full undo and redo.',
      results,
    };
    const destination = process.argv[2] ?? 'artifacts/benchmark.json';
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report, null, 2));
  }
}

await Benchmark.run();

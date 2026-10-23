import { open, readFile, rename, stat, unlink } from 'node:fs/promises';
import type { FileAccess } from './FileAccess.js';

export class NodeFileAccess implements FileAccess {
  async read(path: string): Promise<string> {
    return readFile(path, 'utf8');
  }
  async mode(path: string): Promise<number | undefined> {
    try {
      const info = await stat(path);
      if (!info.isFile() || !(info.mode & 0o222))
        throw new Error('destination is not a writable regular file');
      return info.mode & 0o777;
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT')
        return undefined;
      throw error;
    }
  }
  async writeExclusive(path: string, content: string, mode: number): Promise<void> {
    const file = await open(path, 'wx', mode);
    try {
      await file.writeFile(content, 'utf8');
      await file.sync();
    } finally {
      await file.close();
    }
  }
  async replace(temporary: string, destination: string): Promise<void> {
    await rename(temporary, destination);
  }
  async remove(path: string): Promise<void> {
    await unlink(path);
  }
}

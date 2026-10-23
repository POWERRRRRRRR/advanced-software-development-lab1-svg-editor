import { randomUUID } from 'node:crypto';
import { basename, dirname, join } from 'node:path';
import type { DocumentRepository, LoadedDocument } from '../../application/DocumentRepository.js';
import type { SvgDocument } from '../../domain/SvgDocument.js';
import { SvgCodec } from '../svg/SvgCodec.js';
import type { FileAccess } from './FileAccess.js';
import { NodeFileAccess } from './NodeFileAccess.js';

export class FileDocumentRepository implements DocumentRepository {
  constructor(
    private readonly codec = new SvgCodec(),
    private readonly files: FileAccess = new NodeFileAccess(),
  ) {}
  async read(path: string): Promise<LoadedDocument> {
    let source: string;
    try {
      source = await this.files.read(path);
    } catch {
      throw new Error(`cannot read file: ${path}`);
    }
    try {
      return this.codec.decode(source);
    } catch (error) {
      throw new Error(
        `cannot read file: ${path} (${error instanceof Error ? error.message : 'invalid SVG'})`,
      );
    }
  }
  async write(path: string, document: SvgDocument): Promise<void> {
    const temporary = join(dirname(path), `.${basename(path)}.${randomUUID()}.tmp`);
    let created = false;
    try {
      const mode = await this.files.mode(path);
      const content = this.codec.encode(document);
      // writeExclusive owns the file once creation succeeds; cleanup also covers partial writes.
      created = true;
      await this.files.writeExclusive(temporary, content, mode ?? 0o666);
      await this.files.replace(temporary, path);
    } catch {
      throw new Error(`cannot write file: ${path}`);
    } finally {
      if (created) await this.files.remove(temporary).catch(() => undefined);
    }
  }
}

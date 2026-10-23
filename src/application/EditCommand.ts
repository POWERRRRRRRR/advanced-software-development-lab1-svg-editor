import type { SvgDocument } from '../domain/SvgDocument.js';
import { Command } from './Command.js';
import type { EditorSession } from './EditorSession.js';

export abstract class EditCommand extends Command {
  #before: SvgDocument | undefined;
  #after: SvgDocument | undefined;
  #summary = '';

  override async execute(session: EditorSession): Promise<readonly string[]> {
    return session.edit(this);
  }
  abstract apply(document: SvgDocument): string;
  capture(before: SvgDocument, after: SvgDocument, summary: string): void {
    this.#before = before;
    this.#after = after;
    this.#summary = summary;
  }
  undo(): SvgDocument {
    if (!this.#before) throw new Error('command has not executed');
    return this.#before.clone();
  }
  redo(): SvgDocument {
    if (!this.#after) throw new Error('command has not executed');
    return this.#after.clone();
  }
  get summary(): string {
    return this.#summary;
  }
}

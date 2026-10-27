import { SvgDocument } from '../domain/SvgDocument.js';
import type { DocumentPresenter } from './DocumentPresenter.js';
import type { DocumentRepository } from './DocumentRepository.js';
import type { EditCommand } from './EditCommand.js';
import { History } from './History.js';

export class EditorSession {
  #document: SvgDocument | undefined;
  #path: string | undefined;
  #revision = 0;
  readonly #history = new History();
  constructor(
    private readonly repository: DocumentRepository,
    private readonly presenter: DocumentPresenter,
  ) {}

  /** Changes only after a successful document replacement; queries and save are neutral. */
  get revision(): number {
    return this.#revision;
  }
  get document(): SvgDocument {
    return this.current().clone();
  }
  get path(): string | undefined {
    return this.#path;
  }
  initialize(width = 800, height = 600): readonly string[] {
    const document = new SvgDocument(width, height);
    this.#document = document;
    this.#revision++;
    this.#path = undefined;
    this.#history.reset();
    return [`canvas ${width}x${height} created`];
  }
  resize(width: number, height: number): readonly string[] {
    const draft = this.current().clone();
    draft.resize(width, height);
    this.#document = draft;
    this.#revision++;
    this.#history.reset();
    return [`canvas resized to ${width}x${height}`];
  }
  async read(path: string): Promise<readonly string[]> {
    const loaded = await this.repository.read(path);
    loaded.document.validate();
    const document = loaded.document.clone();
    this.#document = document;
    this.#revision++;
    this.#path = path;
    this.#history.reset();
    return [...loaded.warnings, `read ${path} (${document.count} elements)`];
  }
  async save(path = this.#path): Promise<readonly string[]> {
    const current = this.current();
    if (!path) throw new Error("no file path. use 'save <file.svg>' first");
    await this.repository.write(path, current.clone());
    this.#path = path;
    this.#history.reset();
    return [`saved to ${path} (${current.count} elements)`];
  }
  edit(command: EditCommand): readonly string[] {
    const before = this.current();
    const draft = before.clone();
    const summary = command.apply(draft);
    draft.validate();
    command.capture(before, draft, summary);
    this.#document = draft;
    this.#revision++;
    this.#history.record(command);
    return [summary];
  }
  undo(): readonly string[] {
    this.current();
    const result = this.#history.undo();
    this.#document = result.document;
    this.#revision++;
    return [result.output];
  }
  redo(): readonly string[] {
    this.current();
    const result = this.#history.redo();
    this.#document = result.document;
    this.#revision++;
    return [result.output];
  }
  tree(id?: string): readonly string[] {
    return this.presenter.tree(this.document, id);
  }
  show(id: string): readonly string[] {
    return this.presenter.show(this.document, id);
  }
  private current(): SvgDocument {
    if (!this.#document) throw new Error("no document. use 'init' or 'read' first");
    return this.#document;
  }
}

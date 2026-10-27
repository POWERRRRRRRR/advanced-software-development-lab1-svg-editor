import type { Argument } from './Argument.js';
import type { EditorSession } from './EditorSession.js';

export abstract class Command {
  protected constructor(protected readonly args: readonly Argument[]) {}
  protected get values(): string[] {
    return this.args.map((arg) => arg.value);
  }
  protected arity(min: number, max = min): void {
    if (this.args.length < min || this.args.length > max)
      throw new Error('invalid arguments. use help for syntax');
  }
  /** Presentation intent only; adapters decide whether/how to clear their display. */
  get clearsDisplay(): boolean {
    return false;
  }
  abstract execute(session: EditorSession): Promise<readonly string[]>;
}

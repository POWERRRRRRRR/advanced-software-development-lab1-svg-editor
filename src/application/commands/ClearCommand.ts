import type { Argument } from '../Argument.js';
import { Command } from '../Command.js';

export class ClearCommand extends Command {
  constructor(args: readonly Argument[]) {
    super(args);
  }
  override get clearsDisplay(): boolean {
    return true;
  }
  override async execute(): Promise<readonly string[]> {
    this.arity(0);
    return [];
  }
}

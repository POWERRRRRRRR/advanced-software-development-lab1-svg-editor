import type { Argument } from '../Argument.js';
import { Command } from '../Command.js';

export class HelpCommand extends Command {
  constructor(
    args: readonly Argument[],
    private readonly syntax: readonly string[],
  ) {
    super(args);
  }
  override async execute(): Promise<readonly string[]> {
    this.arity(0);
    return this.syntax;
  }
}

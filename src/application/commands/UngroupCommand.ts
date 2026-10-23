import type { Argument } from '../Argument.js';
import { EditCommand } from '../EditCommand.js';
import type { SvgDocument } from '../../domain/SvgDocument.js';

export class UngroupCommand extends EditCommand {
  constructor(args: readonly Argument[]) {
    super(args);
  }
  override apply(document: SvgDocument): string {
    this.arity(1);
    const id = this.values[0]!;
    const count = document.ungroup(id);
    return `g#${id} ungrouped (${count} children)`;
  }
}

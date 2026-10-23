import type { Argument } from '../Argument.js';
import { EditCommand } from '../EditCommand.js';
import type { SvgDocument } from '../../domain/SvgDocument.js';

export class FrontCommand extends EditCommand {
  constructor(args: readonly Argument[]) {
    super(args);
  }
  override apply(document: SvgDocument): string {
    this.arity(1);
    const id = this.values[0]!;
    document.reorder(id, true);
    return `${document.find(id).label} moved to front`;
  }
}

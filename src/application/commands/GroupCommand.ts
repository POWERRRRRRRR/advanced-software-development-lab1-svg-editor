import type { Argument } from '../Argument.js';
import { EditCommand } from '../EditCommand.js';
import type { SvgDocument } from '../../domain/SvgDocument.js';

export class GroupCommand extends EditCommand {
  constructor(args: readonly Argument[]) {
    super(args);
  }
  override apply(document: SvgDocument): string {
    this.arity(2, Number.MAX_SAFE_INTEGER);
    const [id, ...ids] = this.values;
    const group = document.group(id!, ids);
    return `${group.label} created with ${group.children.length} children`;
  }
}

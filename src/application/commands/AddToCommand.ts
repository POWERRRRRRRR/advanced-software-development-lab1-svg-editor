import type { Argument } from '../Argument.js';
import { EditCommand } from '../EditCommand.js';
import type { SvgDocument } from '../../domain/SvgDocument.js';

export class AddToCommand extends EditCommand {
  constructor(args: readonly Argument[]) {
    super(args);
  }
  override apply(document: SvgDocument): string {
    this.arity(2);
    const [group, id] = this.values;
    document.addTo(group!, id!);
    return `${document.find(id!).label} moved into g#${group}`;
  }
}

import type { Argument } from '../Argument.js';
import { EditCommand } from '../EditCommand.js';
import type { SvgDocument } from '../../domain/SvgDocument.js';

export class SetCommand extends EditCommand {
  constructor(args: readonly Argument[]) {
    super(args);
  }
  override apply(document: SvgDocument): string {
    this.arity(3);
    const [id, attribute, value] = this.values;
    const shape = document.find(id!);
    shape.set(attribute!, value!);
    return `${shape.label} updated: ${attribute}=${JSON.stringify(value)}`;
  }
}

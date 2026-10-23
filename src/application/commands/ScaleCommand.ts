import type { Argument } from '../Argument.js';
import { EditCommand } from '../EditCommand.js';
import type { SvgDocument } from '../../domain/SvgDocument.js';
import { Numbers } from '../../domain/Numbers.js';

export class ScaleCommand extends EditCommand {
  constructor(args: readonly Argument[]) {
    super(args);
  }
  override apply(document: SvgDocument): string {
    this.arity(2);
    const [id, value] = this.values;
    const factor = Numbers.positive(Numbers.parse(value!, 'scale factor'), 'scale factor');
    const shape = document.find(id!);
    shape.scale(factor);
    return `${shape.label} scaled by ${factor}`;
  }
}

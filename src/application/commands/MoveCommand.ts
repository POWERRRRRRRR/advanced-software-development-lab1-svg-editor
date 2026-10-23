import type { Argument } from '../Argument.js';
import { EditCommand } from '../EditCommand.js';
import type { SvgDocument } from '../../domain/SvgDocument.js';
import { Numbers } from '../../domain/Numbers.js';

export class MoveCommand extends EditCommand {
  constructor(args: readonly Argument[]) {
    super(args);
  }
  override apply(document: SvgDocument): string {
    this.arity(3);
    const [id, dx, dy] = this.values;
    const x = Numbers.parse(dx!, 'dx');
    const y = Numbers.parse(dy!, 'dy');
    const shape = document.find(id!);
    shape.move(x, y);
    return `${shape.label} moved by (${x},${y})`;
  }
}

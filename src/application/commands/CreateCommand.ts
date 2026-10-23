import type { Argument } from '../Argument.js';
import { EditCommand } from '../EditCommand.js';
import type { SvgDocument } from '../../domain/SvgDocument.js';
import type { ShapeFactory } from '../../domain/ShapeFactory.js';

export class CreateCommand extends EditCommand {
  constructor(
    args: readonly Argument[],
    private readonly factory: ShapeFactory,
  ) {
    super(args);
  }
  override apply(document: SvgDocument): string {
    this.arity(2, Number.MAX_SAFE_INTEGER);
    const [type, id, ...parameters] = this.values;
    let parentId: string | undefined;
    if (this.args.length >= 4 && this.args.at(-2)!.value === 'in' && !this.args.at(-2)!.quoted) {
      parentId = parameters.pop()!;
      parameters.pop();
    }
    const shape = this.factory.fromArguments(type!, id!, parameters);
    document.add(shape, parentId);
    return `${shape.label} created${parentId === undefined ? '' : ` in g#${parentId}`}`;
  }
}

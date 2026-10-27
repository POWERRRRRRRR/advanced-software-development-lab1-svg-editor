import type { Argument } from './Argument.js';
import type { Command } from './Command.js';
import { ShapeFactory } from '../domain/ShapeFactory.js';
import { CreateCommand } from './commands/CreateCommand.js';
import { DeleteCommand } from './commands/DeleteCommand.js';
import { MoveCommand } from './commands/MoveCommand.js';
import { ScaleCommand } from './commands/ScaleCommand.js';
import { SetCommand } from './commands/SetCommand.js';
import { GroupCommand } from './commands/GroupCommand.js';
import { UngroupCommand } from './commands/UngroupCommand.js';
import { AddToCommand } from './commands/AddToCommand.js';
import { FrontCommand } from './commands/FrontCommand.js';
import { BackCommand } from './commands/BackCommand.js';
import { InitCommand } from './commands/InitCommand.js';
import { ReadCommand } from './commands/ReadCommand.js';
import { SaveCommand } from './commands/SaveCommand.js';
import { CanvasCommand } from './commands/CanvasCommand.js';
import { TreeCommand } from './commands/TreeCommand.js';
import { ShowCommand } from './commands/ShowCommand.js';
import { UndoCommand } from './commands/UndoCommand.js';
import { RedoCommand } from './commands/RedoCommand.js';
import { ClearCommand } from './commands/ClearCommand.js';
import { HelpCommand } from './commands/HelpCommand.js';

type Definition = { syntax: string; create: (args: readonly Argument[]) => Command };

export class CommandFactory {
  readonly #definitions: Map<string, Definition>;
  constructor(private readonly shapes = new ShapeFactory()) {
    this.#definitions = new Map<string, Definition>([
      ['init', { syntax: 'init [w] [h]', create: (args) => new InitCommand(args) }],
      ['read', { syntax: 'read <file.svg>', create: (args) => new ReadCommand(args) }],
      ['save', { syntax: 'save [file.svg]', create: (args) => new SaveCommand(args) }],
      ['canvas', { syntax: 'canvas [w] [h]', create: (args) => new CanvasCommand(args) }],
      [
        'create',
        {
          syntax: 'create <type> <id> [params...] [in <containerId>]',
          create: (args) => new CreateCommand(args, this.shapes),
        },
      ],
      ['delete', { syntax: 'delete <id>', create: (args) => new DeleteCommand(args) }],
      ['move', { syntax: 'move <id> <dx> <dy>', create: (args) => new MoveCommand(args) }],
      ['scale', { syntax: 'scale <id> <factor>', create: (args) => new ScaleCommand(args) }],
      ['set', { syntax: 'set <id> <attr> <value>', create: (args) => new SetCommand(args) }],
      [
        'group',
        { syntax: 'group <newGid> <id1> [id2...]', create: (args) => new GroupCommand(args) },
      ],
      ['ungroup', { syntax: 'ungroup <gid>', create: (args) => new UngroupCommand(args) }],
      ['addto', { syntax: 'addto <gid> <id>', create: (args) => new AddToCommand(args) }],
      ['front', { syntax: 'front <id>', create: (args) => new FrontCommand(args) }],
      ['back', { syntax: 'back <id>', create: (args) => new BackCommand(args) }],
      ['tree', { syntax: 'tree [id]', create: (args) => new TreeCommand(args) }],
      ['show', { syntax: 'show <id>', create: (args) => new ShowCommand(args) }],
      ['help', { syntax: 'help', create: (args) => new HelpCommand(args, this.syntax()) }],
      [
        'clear',
        { syntax: 'clear (terminal display only)', create: (args) => new ClearCommand(args) },
      ],
      ['undo', { syntax: 'undo', create: (args) => new UndoCommand(args) }],
      ['redo', { syntax: 'redo', create: (args) => new RedoCommand(args) }],
    ]);
  }
  create(name: string, args: readonly Argument[]): Command {
    const definition = this.#definitions.get(name);
    if (!definition) throw new Error(`unknown command: ${name}`);
    return definition.create(args);
  }
  private syntax(): string[] {
    return [
      ...[...this.#definitions.values()].map((definition) => definition.syntax),
      'create rect <id> <x> <y> <w> <h> [fill]',
      'create circle <id> <cx> <cy> <r> [fill]',
      'create ellipse <id> <cx> <cy> <rx> <ry> [fill]',
      'create line <id> <x1> <y1> <x2> <y2> [stroke]',
      'create text <id> <x> <y> "content"',
      'create g <id>',
      'EOF / Ctrl-C: exit; # at the start of a line: comment',
    ];
  }
}

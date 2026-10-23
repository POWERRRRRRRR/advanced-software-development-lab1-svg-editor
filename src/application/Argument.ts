/** Immutable input DTO; domain objects remain encapsulated behavioral classes. */
export interface Argument {
  readonly value: string;
  readonly quoted: boolean;
}

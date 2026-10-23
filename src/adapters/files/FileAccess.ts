export interface FileAccess {
  read(path: string): Promise<string>;
  mode(path: string): Promise<number | undefined>;
  writeExclusive(path: string, content: string, mode: number): Promise<void>;
  replace(temporary: string, destination: string): Promise<void>;
  remove(path: string): Promise<void>;
}

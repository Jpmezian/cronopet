/**
 * Stub de `expo-file-system` — operações de arquivo viram no-op.
 * O store usa File/Paths pra mover foto pra Documents/. Em teste,
 * só nos importa que o URI retornado seja string consistente.
 */

export const Paths = {
  document: { uri: 'file:///stub/Documents/' },
};

export class File {
  uri: string;
  constructor(parent: { uri: string } | string, name?: string) {
    if (typeof parent === 'string') this.uri = parent;
    else this.uri = parent.uri + (name ?? '');
  }
  copy(_dest: File): void { /* no-op */ }
}

/**
 * ULID mínimo (Crockford base32: 48 bits de tempo + 80 bits aleatórios).
 * Implementação própria para não puxar dependência por 25 linhas —
 * suficiente para ids de sessão ordenáveis por criação.
 */
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

export function ulid(now: number = Date.now()): string {
  let time = now;
  const timeChars = new Array<string>(10);
  for (let i = 9; i >= 0; i--) {
    timeChars[i] = ALPHABET[time % 32]!;
    time = Math.floor(time / 32);
  }

  const rand = new Uint8Array(16);
  globalThis.crypto.getRandomValues(rand);
  let randomPart = '';
  for (let i = 0; i < 16; i++) {
    randomPart += ALPHABET[rand[i]! % 32]!;
  }

  return timeChars.join('') + randomPart;
}

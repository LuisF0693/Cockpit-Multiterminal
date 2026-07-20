/**
 * Regra "mesmo projeto" pro vínculo terminal-a-terminal (Épico 9, FR25),
 * centralizada pra não divergir entre o handler manual (`terminalLinkCreate`)
 * e o vínculo automático chefe→worker (Story 17.2). Pura — sem I/O; cada
 * chamador decide o efeito colateral (lançar erro vs. só logar).
 */

/**
 * Dois terminais só podem ser vinculados quando pertencem ao MESMO projeto
 * conhecido. `null` (terminal sem projeto associado) NUNCA conta como "mesmo
 * projeto" — nem quando os dois lados são `null` — porque "sem projeto" não é
 * uma identidade compartilhada, é ausência de informação.
 */
export function isSameProject(a: string | null, b: string | null): boolean {
  if (a === null || b === null) return false;
  return a === b;
}

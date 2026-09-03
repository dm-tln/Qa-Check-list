/** Префикс привязки к пункту чек-листа для экспорта */
export function formatChecklistItemRef(number: string): string {
  return `[Пункт чек-листа №${number}]`;
}

export function withChecklistItemRef(number: string, text: string): string {
  return `${formatChecklistItemRef(number)} ${text}`.trim();
}

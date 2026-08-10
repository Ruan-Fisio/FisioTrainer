export function parseListParam(value: string | undefined | null): string[] {
  if (!value) return [];
  return value.split(",").filter(Boolean);
}

export function buildListParam(ids: string[]): string | undefined {
  return ids.length > 0 ? ids.join(",") : undefined;
}

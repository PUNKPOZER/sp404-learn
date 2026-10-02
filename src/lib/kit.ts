export function padOf(voice: string, kit: Record<number, string>): number | null {
  const pads = Object.keys(kit).map(Number).sort((a, b) => a - b);
  return pads.find((p) => kit[p] === voice) ?? null;
}

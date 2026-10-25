// Selection only. Rust owns topology, membership and final weight validation.
export interface SkinPart {
  id: string;
  label: string;
  node: number;
  primitive: number;
  vertices: number;
}
export interface AttachmentTarget {
  id: string;
  label: string;
  parts: SkinPart[];
}
export function attachmentTargets(
  parts: SkinPart[],
  grouped: boolean,
): AttachmentTarget[] {
  if (!grouped)
    return parts.map((p) => ({ id: p.id, label: p.label, parts: [p] }));
  const groups = new Map<string, AttachmentTarget>();
  for (const part of parts) {
    const id = `surface:${part.node}:${part.primitive}`;
    let group = groups.get(id);
    if (!group) {
      const name = part.label.replace(/ · primitive \d+ · part \d+$/, "");
      group = {
        id,
        label: `${name} · node ${part.node} · surface ${part.primitive}`,
        parts: [],
      };
      groups.set(id, group);
    }
    group.parts.push(part);
  }
  return [...groups.values()];
}
export function attachmentValue(
  parts: SkinPart[],
  rigid: Record<string, number>,
): string {
  const values = new Set(
    parts.map((p) => (rigid[p.id] === undefined ? "" : String(rigid[p.id]))),
  );
  return values.size > 1 ? "mixed" : ([...values][0] ?? "");
}

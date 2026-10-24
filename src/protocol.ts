export interface Inspection {
  schema_version: 1;
  preview_allowed: boolean;
  inventory: {
    meshes: number;
    mesh_instances: number;
    primitives: number;
    vertices: number;
    skins: number;
    joints: number;
    animations: number;
    images: number;
  };
  nodes: {
    index: number;
    name: string | null;
    children: number[];
    mesh: number | null;
    skin: number | null;
    local_matrix: number[][];
  }[];
  diagnostics: {
    severity: "error" | "warning";
    code: string;
    path: string;
    message: string;
    remedy: string;
  }[];
}
export type WorkerReply =
  | { revision: number; phase: "inspecting" }
  | { revision: number; phase: "done"; report: Inspection; bytes: ArrayBuffer }
  | { revision: number; phase: "error"; message: string };

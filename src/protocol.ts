export interface Inspection {
  schema_version: 2;
  rig: { mapping: MappingReview; binds: BindValidation } | null;
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
  | {
      revision: number;
      phase: "done";
      report: Inspection;
      bytes: ArrayBuffer;
      source_sha256: string;
    }
  | { revision: number; phase: "error"; message: string };

export type Diagnostic = Inspection["diagnostics"][number];
export type Mapping = Record<string, number | null>;
export interface MappingReview {
  valid: boolean;
  bones: {
    bone: string;
    required: boolean;
    node: number | null;
    candidates: number[];
  }[];
  diagnostics: Diagnostic[];
}
export interface BindValidation {
  valid: boolean;
  diagnostics: Diagnostic[];
  skins: {
    skin: number;
    joints: number;
    mesh_nodes: number[];
    neutral_consistency: "consistent" | "review_required" | "unchecked";
    max_joint_rest_difference: number | null;
  }[];
}
export interface MappingFile {
  schema_version: 1;
  source_sha256: string;
  mapping: Mapping;
}

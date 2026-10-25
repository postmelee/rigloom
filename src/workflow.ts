import type { Diagnostic, Inspection } from "./protocol";

// Presentation only: Rust remains the authority for all validation and export gates.
export function nextStep(report: Inspection): {
  message: string;
  panel?: "rig" | "mapping" | "export";
  action?: string;
} {
  if (
    !report.preview_allowed ||
    report.diagnostics.some((d) => d.severity === "error") ||
    report.rig?.binds.valid === false
  ) {
    return {
      message:
        "This file needs attention. Read the issues below; file or skin-data problems must be repaired in the source editor.",
    };
  }
  if (report.inventory.skins === 0) {
    if (report.inventory.animations > 0)
      return {
        message:
          "New rigging needs a static model. Export a separate GLB without animations from the source editor.",
      };
    return {
      message:
        "No skin found. For a humanoid, place joints, then preview deformation.",
      panel: "rig",
      action: "Place joints",
    };
  }
  if (!report.rig?.mapping.valid)
    return {
      message:
        "An existing rig was found. Identify its body parts before export; its weights are preserved.",
      panel: "mapping",
      action: "Review bone mapping",
    };
  return {
    message:
      "Rig checks passed. Review the model and set its export information. These checks do not guarantee natural deformation.",
    panel: "export",
    action: "Prepare export",
  };
}

export function diagnosticTitle(d: Diagnostic): string {
  const titles: Record<string, string> = {
    mapping_required: "Assign a required body part",
    mapping_ambiguous: "Choose between matching bones",
    mapping_duplicate: "A bone is assigned more than once",
    mapping_hierarchy: "Check the body-part connections",
    mapping_parent: "Check the parent bone",
    mapping_node: "Choose an existing bone",
    rest_matrix_shear: "Repair a model transform in the source editor",
    bind_rest_review: "Review the model's original rest pose",
    resource_uri: "Use a GLB with embedded resources",
    unsupported_extension: "Export a supported GLB variant",
    invalid_glb: "This file could not be read as a GLB",
  };
  return (
    titles[d.code] ??
    (d.severity === "error" ? "File needs attention" : "Review before export")
  );
}

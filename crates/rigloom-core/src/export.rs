//! VRM 1.0 serialization without rebaking the source geometry or skin.
use crate::{Diagnostic, Severity, inspect_glb_with_mapping};
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use std::collections::BTreeMap;

pub const VRM_LICENSE_URL: &str = "https://vrm.dev/licenses/1.0/";

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ExportMeta {
    pub name: String,
    pub authors: Vec<String>,
    pub avatar_permission: String,
    pub commercial_usage: String,
    pub credit_notation: String,
    pub modification: String,
    pub allow_excessively_violent_usage: bool,
    pub allow_excessively_sexual_usage: bool,
    pub allow_political_or_religious_usage: bool,
    pub allow_antisocial_or_hate_usage: bool,
    pub allow_redistribution: bool,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub version: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub copyright_information: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub contact_information: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub other_license_url: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub struct ExportRequest {
    pub mapping: BTreeMap<String, Option<usize>>,
    pub meta: ExportMeta,
    pub source_pose_confirmed: bool,
    pub rights_confirmed: bool,
    pub acknowledge_bind_warning: bool,
}

#[derive(Debug, Serialize)]
pub struct ExportReport {
    pub schema_version: u32,
    pub export_allowed: bool,
    pub diagnostics: Vec<Diagnostic>,
    pub changes: Vec<String>,
    pub preserved: Vec<String>,
    pub limitations: Vec<String>,
    pub source_byte_length: usize,
    pub output_byte_length: usize,
    pub humanoid_bones: usize,
}

#[derive(Debug)]
pub struct ExportResult {
    pub bytes: Option<Vec<u8>>,
    pub report: ExportReport,
}

impl ExportReport {
    fn error(&mut self, code: &str, path: &str, message: &str, remedy: &str) {
        self.diagnostics.push(Diagnostic {
            severity: Severity::Error,
            code: code.into(),
            path: path.into(),
            message: message.into(),
            remedy: remedy.into(),
        });
    }
    fn blocked(self) -> ExportResult {
        ExportResult {
            bytes: None,
            report: self,
        }
    }
    fn has_errors(&self) -> bool {
        self.diagnostics
            .iter()
            .any(|d| d.severity == Severity::Error)
    }
}

fn validate_meta(meta: &ExportMeta, report: &mut ExportReport) {
    if meta.name.trim().is_empty() {
        report.error(
            "meta_name",
            "/meta/name",
            "The model name must not be blank.",
            "Enter the model's name.",
        );
    }
    if meta.authors.is_empty() || meta.authors.iter().any(|s| s.trim().is_empty()) {
        report.error(
            "meta_authors",
            "/meta/authors",
            "At least one nonblank author is required; blank author entries are not allowed.",
            "Enter the actual author names, preserving their attribution.",
        );
    }
    for (key, value, allowed) in [
        (
            "avatarPermission",
            meta.avatar_permission.as_str(),
            &["onlyAuthor", "onlySeparatelyLicensedPerson", "everyone"][..],
        ),
        (
            "commercialUsage",
            meta.commercial_usage.as_str(),
            &["personalNonProfit", "personalProfit", "corporation"][..],
        ),
        (
            "creditNotation",
            meta.credit_notation.as_str(),
            &["required", "unnecessary"][..],
        ),
        (
            "modification",
            meta.modification.as_str(),
            &[
                "prohibited",
                "allowModification",
                "allowModificationRedistribution",
            ][..],
        ),
    ] {
        if !allowed.contains(&value) {
            report.error("meta_permission", &format!("/meta/{key}"), "Select an explicit supported VRM usage permission.", "Use the permission granted by the model's rights holder; conversion does not grant rights.");
        }
    }
    if let Some(url) = &meta.other_license_url {
        let authority = url
            .strip_prefix("https://")
            .or_else(|| url.strip_prefix("http://"))
            .and_then(|rest| rest.split(['/', '?', '#']).next());
        if authority.is_none_or(str::is_empty)
            || url
                .chars()
                .any(|c| c.is_whitespace() || c.is_control() || matches!(c, '<' | '>' | '"'))
        {
            report.error(
                "meta_license_url",
                "/meta/otherLicenseUrl",
                "The additional license must use a nonempty HTTP(S) URL.",
                "Enter the rights holder's license URL or omit this optional field.",
            );
        }
    }
}

fn validate_nonempty_arrays(document: &Value, report: &mut ExportReport) {
    let mut arrays: Vec<(String, &Value)> = [
        "accessors",
        "animations",
        "buffers",
        "bufferViews",
        "cameras",
        "images",
        "materials",
        "meshes",
        "nodes",
        "samplers",
        "scenes",
        "skins",
        "textures",
    ]
    .into_iter()
    .filter_map(|key| document.get(key).map(|value| (format!("/{key}"), value)))
    .collect();
    for (collection, keys) in [
        ("nodes", &["children", "weights"][..]),
        ("scenes", &["nodes"][..]),
        ("meshes", &["primitives", "weights"][..]),
        ("skins", &["joints"][..]),
        ("animations", &["channels", "samplers"][..]),
    ] {
        for (index, item) in document[collection]
            .as_array()
            .into_iter()
            .flatten()
            .enumerate()
        {
            for key in keys {
                if let Some(value) = item.get(*key) {
                    arrays.push((format!("/{collection}/{index}/{key}"), value));
                }
            }
        }
    }
    for (mesh_index, mesh) in document["meshes"]
        .as_array()
        .into_iter()
        .flatten()
        .enumerate()
    {
        for (primitive_index, primitive) in mesh["primitives"]
            .as_array()
            .into_iter()
            .flatten()
            .enumerate()
        {
            if let Some(targets) = primitive.get("targets") {
                arrays.push((
                    format!("/meshes/{mesh_index}/primitives/{primitive_index}/targets"),
                    targets,
                ));
            }
        }
    }
    for (path, array) in arrays {
        if array.as_array().is_some_and(Vec::is_empty) {
            report.error(
                "source_schema",
                &path,
                "A present glTF resource/relationship array must not be empty.",
                "Omit an unused optional array or supply valid entries in the source exporter.",
            );
        }
    }
}

// The inspector qualifies positions and skin data. Check the retained surface
// semantics too, without asking renderer readers to interpret malformed layouts.
fn validate_surface(document: &Value, binary: &[u8], report: &mut ExportReport) {
    let Some(meshes) = document["meshes"].as_array() else {
        return;
    };
    for (mesh_index, mesh) in meshes.iter().enumerate() {
        let Some(primitives) = mesh["primitives"].as_array() else {
            continue;
        };
        let target_count = primitives
            .first()
            .and_then(|p| p["targets"].as_array())
            .map_or(0, Vec::len);
        if mesh["weights"]
            .as_array()
            .is_some_and(|weights| weights.len() != target_count)
        {
            report.error(
                "surface_morph_count",
                &format!("/meshes/{mesh_index}/weights"),
                "Mesh weights must match the number of morph targets.",
                "Preserve one initial weight per target in the source exporter.",
            );
        }
        for (primitive_index, primitive) in primitives.iter().enumerate() {
            let path = format!("/meshes/{mesh_index}/primitives/{primitive_index}");
            if primitive["targets"].as_array().map_or(0, Vec::len) != target_count {
                report.error(
                    "surface_morph_count",
                    &format!("{path}/targets"),
                    "All primitives of one mesh must have the same number of morph targets.",
                    "Repair the source target lists without changing target indices.",
                );
            }
            let vertex_count = primitive["attributes"]["POSITION"]
                .as_u64()
                .map(|index| document["accessors"][index as usize]["count"].as_u64());
            if let Some(attributes) = primitive["attributes"].as_object() {
                for (semantic, index) in attributes {
                    if semantic == "TANGENT"
                        || semantic.starts_with("JOINTS_")
                        || semantic.starts_with("WEIGHTS_")
                    {
                        continue;
                    }
                    validate_surface_accessor(
                        document,
                        binary,
                        index,
                        semantic,
                        false,
                        vertex_count.flatten(),
                        &format!("{path}/attributes/{semantic}"),
                        report,
                    );
                }
            }
            if let Some(targets) = primitive["targets"].as_array() {
                for (target_index, target) in targets.iter().enumerate() {
                    if let Some(attributes) = target.as_object() {
                        if attributes.is_empty() {
                            report.error(
                                "source_schema",
                                &format!("{path}/targets/{target_index}"),
                                "A morph target must contain at least one supported attribute.",
                                "Prepare a POSITION or NORMAL morph delta before export.",
                            );
                        }
                        for (semantic, index) in attributes {
                            if semantic == "TANGENT" {
                                continue;
                            }
                            if primitive["attributes"].get(semantic).is_none() {
                                report.error(
                                    "surface_morph_attribute",
                                    &format!("{path}/targets/{target_index}/{semantic}"),
                                    "A morph delta requires the matching base attribute.",
                                    "Export the matching base attribute with the morph delta.",
                                );
                            }
                            validate_surface_accessor(
                                document,
                                binary,
                                index,
                                semantic,
                                true,
                                vertex_count.flatten(),
                                &format!("{path}/targets/{target_index}/{semantic}"),
                                report,
                            );
                        }
                    }
                }
            }
        }
    }
    for (node_index, node) in document["nodes"]
        .as_array()
        .into_iter()
        .flatten()
        .enumerate()
    {
        if let Some(weights) = node["weights"].as_array() {
            let target_count = node["mesh"]
                .as_u64()
                .and_then(|index| meshes.get(index as usize))
                .and_then(|mesh| mesh["primitives"][0]["targets"].as_array())
                .map_or(0, Vec::len);
            if weights.len() != target_count {
                report.error(
                    "surface_morph_count",
                    &format!("/nodes/{node_index}/weights"),
                    "Node weights must match the instantiated mesh's morph targets.",
                    "Export one node weight per target and a referenced mesh.",
                );
            }
        }
    }
}

#[allow(clippy::too_many_arguments)]
fn validate_surface_accessor(
    document: &Value,
    binary: &[u8],
    index: &Value,
    semantic: &str,
    morph: bool,
    count: Option<u64>,
    path: &str,
    report: &mut ExportReport,
) {
    let Some(index) = index.as_u64().and_then(|n| usize::try_from(n).ok()) else {
        return;
    };
    let accessor = &document["accessors"][index];
    let shape = accessor["type"].as_str().unwrap_or("");
    let component = accessor["componentType"].as_u64().unwrap_or(0);
    let normalized = accessor["normalized"].as_bool().unwrap_or(false);
    let float = component == 5126 && !normalized;
    let normalized_unsigned = matches!(component, 5121 | 5123) && normalized;
    let valid = if morph || matches!(semantic, "POSITION" | "NORMAL") {
        matches!(semantic, "POSITION" | "NORMAL") && shape == "VEC3" && float
    } else if semantic.starts_with("TEXCOORD_") {
        shape == "VEC2" && (float || normalized_unsigned)
    } else if semantic.starts_with("COLOR_") {
        matches!(shape, "VEC3" | "VEC4") && (float || normalized_unsigned)
    } else {
        // Custom semantics have no standard interpretation. Preserve them, but
        // still check finite floating-point components and storage alignment.
        semantic.starts_with('_')
    };
    if !valid || accessor["count"].as_u64() != count {
        report.error("surface_accessor_layout", path, "A retained surface attribute or morph delta has an invalid semantic layout or vertex count.", "Export FLOAT VEC3 positions/normals and morph deltas, supported color/UV layouts, and one value per vertex.");
        return;
    }
    let Some(view_index) = accessor["bufferView"]
        .as_u64()
        .and_then(|n| usize::try_from(n).ok())
    else {
        return;
    };
    let view = &document["bufferViews"][view_index];
    let relative = accessor["byteOffset"].as_u64().unwrap_or(0) as usize;
    let start = view["byteOffset"].as_u64().unwrap_or(0) as usize + relative;
    let components = match shape {
        "SCALAR" => 1,
        "VEC2" => 2,
        "VEC3" => 3,
        "VEC4" | "MAT2" => 4,
        "MAT3" => 9,
        "MAT4" => 16,
        _ => 0,
    };
    let component_size = match component {
        5120 | 5121 => 1,
        5122 | 5123 => 2,
        _ => 4,
    };
    let stride = view["byteStride"]
        .as_u64()
        .map_or(components * component_size, |n| n as usize);
    if !relative.is_multiple_of(4)
        || !start.is_multiple_of(component_size)
        || !stride.is_multiple_of(4)
    {
        report.error("surface_accessor_alignment", path, "Surface attribute offsets/strides must satisfy glTF vertex alignment.", "Align vertex elements and strides to four bytes and absolute offsets to their component size.");
        return;
    }
    if component == 5126 {
        for element in 0..count.unwrap_or(0) as usize {
            for component in 0..components {
                let at = start + element * stride + component * 4;
                let Some(bytes) = binary.get(at..at + 4) else {
                    report.error(
                        "surface_accessor_bounds",
                        path,
                        "A retained surface attribute exceeds BIN storage.",
                        "Repair source accessor offsets and counts.",
                    );
                    return;
                };
                if !f32::from_le_bytes(bytes.try_into().unwrap()).is_finite() {
                    report.error("surface_nonfinite", path, "A retained surface attribute contains NaN or infinity.", "Repair nonfinite normals, texture coordinates, colors or morph deltas before export.");
                    return;
                }
            }
        }
    }
}

/// Produces an actual GLB with VRMC_vrm metadata and humanoid references.
/// All binary data and source indices remain unchanged. Geometry/pose preparation
/// and rights are explicit user confirmations, not inferred from model names.
pub fn export_vrm(bytes: &[u8], request: &ExportRequest) -> ExportResult {
    let mut report = ExportReport {
        schema_version: 1,
        export_allowed: false,
        diagnostics: vec![],
        changes: vec![],
        preserved: vec![],
        limitations: vec![],
        source_byte_length: bytes.len(),
        output_byte_length: 0,
        humanoid_bones: 0,
    };
    validate_meta(&request.meta, &mut report);
    if !request.source_pose_confirmed {
        report.error("source_pose_confirmation", "/source_pose_confirmed", "Confirm that the source is prepared in T-pose, facing +Z, using a right-handed Y-up coordinate system and meters.", "Prepare and inspect the source in its authoring tool before confirming. This exporter does not rebake coordinates or poses.");
    }
    if !request.rights_confirmed {
        report.error("rights_confirmation", "/rights_confirmed", "Authority to assign the entered attribution and usage permissions has not been confirmed.", "Check the original model's terms before assigning VRM permissions. Unknown rights are not CC0.");
    }
    let inspection = inspect_glb_with_mapping(bytes, &request.mapping);
    report.diagnostics.extend(
        inspection
            .diagnostics
            .into_iter()
            .filter(|d| !matches!(d.code.as_str(), "inspection_only" | "animations_static")),
    );
    let Some(rig) = inspection.rig else {
        report.error(
            "source_not_exportable",
            "/",
            "Structural inspection did not reach mapping and skin validation.",
            "Resolve the source inspection errors and inspect the GLB again.",
        );
        return report.blocked();
    };
    if request.mapping.len() != rig.mapping.bones.len()
        || rig
            .mapping
            .bones
            .iter()
            .any(|b| !request.mapping.contains_key(&b.bone))
    {
        report.error("mapping_confirmation", "/mapping", "Export requires an explicit choice or null for every supported humanoid bone.", "Review and validate all mapping choices; export does not silently accept regenerated suggestions.");
    }
    report.humanoid_bones = rig
        .mapping
        .bones
        .iter()
        .filter(|b| b.node.is_some())
        .count();
    let mapping_valid = rig.mapping.valid;
    let binds_valid = rig.binds.valid;
    let bind_warning = rig
        .binds
        .diagnostics
        .iter()
        .any(|d| d.code == "bind_rest_review");
    report.diagnostics.extend(rig.mapping.diagnostics);
    report.diagnostics.extend(rig.binds.diagnostics);
    if !mapping_valid || !binds_valid {
        report.error(
            "rig_not_exportable",
            "/rig",
            "Humanoid mapping and existing skin checks must both pass before export.",
            "Resolve the mapping and skin diagnostics; no source data is automatically repaired.",
        );
    }
    if bind_warning && !request.acknowledge_bind_warning {
        report.error("bind_review_confirmation", "/acknowledge_bind_warning", "The source has differing joint-world × inverse-bind products at its stored pose.", "Review the bind/rest warning and explicitly acknowledge it before preserving this pose in the output.");
    }
    if report.has_errors() {
        return report.blocked();
    }
    // Framing and JSON have already been checked by the inspector. Keep the raw
    // JSON rather than reconstructing a model from gltf's filtered schema types.
    let raw_json = match crate::framing(bytes) {
        Ok(json) => json,
        Err(error) => {
            report.error(
                "source_not_exportable",
                "/",
                error,
                "Inspect a complete GLB first.",
            );
            return report.blocked();
        }
    };
    let mut document: Value = match serde_json::from_slice(raw_json) {
        Ok(value) => value,
        Err(error) => {
            report.error(
                "source_not_exportable",
                "/",
                &error.to_string(),
                "Inspect a complete GLB first.",
            );
            return report.blocked();
        }
    };
    let binary_tail = &bytes[20 + raw_json.len()..];
    let binary = binary_tail.get(8..).unwrap_or_default();
    validate_nonempty_arrays(&document, &mut report);
    validate_surface(&document, binary, &mut report);
    let mut reachable = vec![false; inspection.nodes.len()];
    let mut queue: Vec<usize> = document["scenes"][0]["nodes"]
        .as_array()
        .into_iter()
        .flatten()
        .filter_map(|v| v.as_u64().and_then(|n| usize::try_from(n).ok()))
        .collect();
    while let Some(index) = queue.pop() {
        if reachable[index] {
            continue;
        }
        reachable[index] = true;
        queue.extend(inspection.nodes[index].children.iter().copied());
    }
    if !inspection
        .nodes
        .iter()
        .any(|n| reachable[n.index] && n.mesh.is_some() && n.skin.is_some())
    {
        report.error(
            "existing_skin_required",
            "/skins",
            "This export slice requires a skinned mesh in the character scene.",
            "Prepare an existing rig and weights; creating a new skin is a separate task.",
        );
    }
    let mut tangents = 0;
    if let Some(meshes) = document["meshes"].as_array_mut() {
        for (mesh_index, mesh) in meshes.iter_mut().enumerate() {
            if let Some(primitives) = mesh["primitives"].as_array_mut() {
                for (primitive_index, primitive) in primitives.iter_mut().enumerate() {
                    if let Some(attributes) = primitive["attributes"].as_object_mut() {
                        tangents += usize::from(attributes.remove("TANGENT").is_some());
                    }
                    if let Some(targets) =
                        primitive.get_mut("targets").and_then(Value::as_array_mut)
                    {
                        for (target_index, target) in targets.iter_mut().enumerate() {
                            if let Some(attributes) = target.as_object_mut()
                                && attributes.remove("TANGENT").is_some()
                            {
                                tangents += 1;
                                if attributes.is_empty() {
                                    report.error("tangent_only_morph", &format!("/meshes/{mesh_index}/primitives/{primitive_index}/targets/{target_index}"), "Removing a tangent-only morph target would erase a target and change its indices.", "Prepare POSITION or NORMAL morph deltas in the source tool; this exporter will not silently remove the target.");
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    if report.has_errors() {
        return report.blocked();
    }
    let mut meta = match serde_json::to_value(&request.meta) {
        Ok(value) => value,
        Err(error) => {
            report.error(
                "metadata_serialization",
                "/meta",
                &error.to_string(),
                "Check the metadata values.",
            );
            return report.blocked();
        }
    };
    meta["licenseUrl"] = Value::String(VRM_LICENSE_URL.into());
    let human_bones: BTreeMap<_, _> = rig
        .mapping
        .bones
        .into_iter()
        .filter_map(|bone| bone.node.map(|node| (bone.bone, json!({"node":node}))))
        .collect();
    if !document["extensions"].is_object() {
        document["extensions"] = json!({});
    }
    document["extensions"]["VRMC_vrm"] =
        json!({"specVersion":"1.0", "meta":meta, "humanoid":{"humanBones":human_bones}});
    document["extensionsUsed"] = json!(["VRMC_vrm"]);
    // Empty extension declarations carry no source feature and violate the schema.
    if document["extensionsRequired"]
        .as_array()
        .is_some_and(Vec::is_empty)
    {
        document
            .as_object_mut()
            .unwrap()
            .remove("extensionsRequired");
        report
            .changes
            .push("Removed an empty extensionsRequired declaration.".into());
    }
    report.changes.push("Added VRMC_vrm 1.0, reviewed humanoid node references and explicit metadata/usage permissions.".into());
    if tangents > 0 {
        report.changes.push(format!("Omitted {tangents} mesh/morph TANGENT references as specified by VRM; source accessors and BIN bytes remain present."));
    }
    report.preserved.extend([
        "Original BIN chunk, including geometry, skin influences, inverse binds, embedded images and padding, is byte-identical.".into(),
        "Node indices, hierarchy, local transforms, skins, supported PBR materials/textures and non-tangent morph data are preserved; no MToon conversion or pose rebake.".into(),
        format!("Retained {} glTF animations and {} cameras with their original data/references; VRM runtimes do not use these items.", inspection.inventory.animations, document["cameras"].as_array().map_or(0, Vec::len)),
    ]);
    report.limitations.extend([
        "T-pose, +Z facing, Y-up meters and permission authority were user-confirmed, not inferred or mechanically certified.".into(),
        "First-person annotations, expressions, look-at, spring-bone physics and node constraints are not generated.".into(),
        "A valid mapping and numeric skin checks do not certify natural deformation or compatibility with every VRM application.".into(),
        "Runtime checks do not exhaustively validate glTF semantics or decode embedded images. Pinned schema and independent loader checks cover the generated regression fixtures, not every user export.".into(),
    ]);
    if bind_warning {
        report.limitations.push("The stored-pose/bind difference was explicitly acknowledged; artist-intended neutral-surface preservation remains unconfirmed.".into());
    }
    let mut json = match serde_json::to_vec(&document) {
        Ok(json) => json,
        Err(error) => {
            report.error(
                "serialization_failed",
                "/",
                &error.to_string(),
                "Check the source JSON and metadata.",
            );
            return report.blocked();
        }
    };
    while !json.len().is_multiple_of(4) {
        json.push(b' ');
    }
    let total = 20usize
        .checked_add(json.len())
        .and_then(|n| n.checked_add(binary_tail.len()));
    let Some((total, json_length)) =
        total.and_then(|total| Some((u32::try_from(total).ok()?, u32::try_from(json.len()).ok()?)))
    else {
        report.error(
            "glb_size",
            "/",
            "The output exceeds GLB's 32-bit length fields.",
            "Reduce the model size in the source authoring tool.",
        );
        return report.blocked();
    };
    let mut output = Vec::with_capacity(total as usize);
    output.extend_from_slice(b"glTF");
    output.extend_from_slice(&2u32.to_le_bytes());
    output.extend_from_slice(&total.to_le_bytes());
    output.extend_from_slice(&json_length.to_le_bytes());
    output.extend_from_slice(&0x4e4f534au32.to_le_bytes());
    output.extend_from_slice(&json);
    output.extend_from_slice(binary_tail);
    if let Err(error) = gltf::Gltf::from_slice(&output) {
        report.error(
            "output_gltf",
            "/",
            &format!("Serialized output failed glTF validation: {error}"),
            "Repair the source structure before exporting.",
        );
        return report.blocked();
    }
    report.export_allowed = true;
    report.output_byte_length = output.len();
    ExportResult {
        bytes: Some(output),
        report,
    }
}

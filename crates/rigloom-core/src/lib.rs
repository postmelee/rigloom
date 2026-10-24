//! Pure, read-only inspection. No file system, network, DOM or renderer dependencies.
use serde::Serialize;
use std::collections::BTreeMap;

pub mod bind;
pub mod mapping;

#[derive(Debug, Serialize)]
pub struct RigReview {
    pub mapping: mapping::MappingReview,
    pub binds: bind::BindValidation,
}
use serde_json::Value;

#[derive(Debug, Serialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum Severity {
    Error,
    Warning,
}
#[derive(Debug, Serialize)]
pub struct Diagnostic {
    pub severity: Severity,
    pub code: String,
    pub path: String,
    pub message: String,
    pub remedy: String,
}
#[derive(Debug, Serialize)]
pub struct NodeInfo {
    pub index: usize,
    pub name: Option<String>,
    pub children: Vec<usize>,
    pub mesh: Option<usize>,
    pub skin: Option<usize>,
    pub local_matrix: [[f32; 4]; 4],
}
#[derive(Debug, Default, Serialize)]
pub struct Inventory {
    pub meshes: usize,
    pub mesh_instances: usize,
    pub primitives: usize,
    pub vertices: usize,
    pub skins: usize,
    pub joints: usize,
    pub animations: usize,
    pub images: usize,
}
#[derive(Debug, Serialize)]
pub struct Inspection {
    pub rig: Option<RigReview>,
    pub schema_version: u32,
    pub preview_allowed: bool,
    pub inventory: Inventory,
    pub nodes: Vec<NodeInfo>,
    pub diagnostics: Vec<Diagnostic>,
}
impl Default for Inspection {
    fn default() -> Self {
        Self {
            schema_version: 2,
            rig: None,
            preview_allowed: false,
            inventory: Inventory::default(),
            nodes: vec![],
            diagnostics: vec![],
        }
    }
}
impl Inspection {
    fn issue(
        &mut self,
        severity: Severity,
        code: &str,
        path: impl Into<String>,
        message: impl Into<String>,
        remedy: &str,
    ) {
        self.diagnostics.push(Diagnostic {
            severity,
            code: code.into(),
            path: path.into(),
            message: message.into(),
            remedy: remedy.into(),
        });
    }
    fn error(
        &mut self,
        code: &str,
        path: impl Into<String>,
        message: impl Into<String>,
        remedy: &str,
    ) {
        self.issue(Severity::Error, code, path, message, remedy);
    }
}
fn u32_at(data: &[u8], at: usize) -> Option<u32> {
    Some(u32::from_le_bytes(data.get(at..at + 4)?.try_into().ok()?))
}
fn framing(bytes: &[u8]) -> Result<&[u8], &'static str> {
    if bytes.len() < 20
        || bytes.get(..4) != Some(b"glTF")
        || u32_at(bytes, 4) != Some(2)
        || u32_at(bytes, 8).map(|n| n as usize) != Some(bytes.len())
    {
        return Err("Expected a complete glTF 2.0 GLB with an exact declared length.");
    }
    let mut offset = 12usize;
    let mut json = None;
    let mut chunks = 0;
    while offset < bytes.len() {
        let length = u32_at(bytes, offset).ok_or("Truncated chunk header.")? as usize;
        let kind = u32_at(bytes, offset + 4).ok_or("Truncated chunk type.")?;
        let end = offset
            .checked_add(8)
            .and_then(|v| v.checked_add(length))
            .ok_or("Chunk length overflow.")?;
        if !length.is_multiple_of(4) || end > bytes.len() {
            return Err("Invalid chunk alignment or length.");
        }
        match (chunks, kind) {
            (0, 0x4e4f534a) => json = Some(&bytes[offset + 8..end]),
            (1, 0x004e4942) => {}
            _ => return Err("Only one JSON chunk followed by an optional BIN chunk is supported."),
        }
        offset = end;
        chunks += 1;
    }
    json.ok_or("Missing JSON chunk.")
}
fn inspect_json(value: &Value, path: &str, report: &mut Inspection) {
    match value {
        Value::Object(map) => {
            if let Some(Value::Object(extensions)) = map.get("extensions") {
                for name in extensions.keys() {
                    report.error(
                        "unsupported_extension",
                        format!("{path}/extensions/{name}"),
                        format!("Extension {name} has not been qualified in this inspector."),
                        "Prepare an uncompressed core glTF 2.0 GLB; retain the original file.",
                    );
                }
            }
            // extras is application metadata, not a glTF resource/extension location.
            for (key, child) in map {
                if key != "extras" && key != "extensions" {
                    inspect_json(child, &format!("{path}/{key}"), report);
                }
            }
        }
        Value::Array(values) => {
            for (i, child) in values.iter().enumerate() {
                inspect_json(child, &format!("{path}/{i}"), report);
            }
        }
        _ => {}
    }
}
/// Does not modify input. Preview eligibility is intentionally narrower than glTF conformance.
pub fn inspect_glb(bytes: &[u8]) -> Inspection {
    inspect_glb_with_mapping(bytes, &BTreeMap::new())
}

/// Mapping overrides are semantic keys and stable source node indices; null clears a suggestion.
/// Input bytes and existing transforms, binds and weights are never rewritten.
pub fn inspect_glb_with_mapping(
    bytes: &[u8],
    overrides: &BTreeMap<String, Option<usize>>,
) -> Inspection {
    let mut report = Inspection::default();
    let json = match framing(bytes) {
        Ok(j) => j,
        Err(e) => {
            report.error(
                "invalid_glb",
                "/",
                e,
                "Export a self-contained GLB 2.0 and try again.",
            );
            return report;
        }
    };
    let raw: Value = match serde_json::from_slice(json) {
        Ok(v) => v,
        Err(e) => {
            report.error(
                "invalid_json",
                "/",
                e.to_string(),
                "Re-export valid glTF JSON.",
            );
            return report;
        }
    };
    inspect_json(&raw, "", &mut report);
    for field in ["extensionsUsed", "extensionsRequired"] {
        if let Some(list) = raw[field].as_array() {
            for name in list {
                report.error(
                    "unsupported_extension",
                    format!("/{field}"),
                    format!("Declared extension {name} is not yet qualified."),
                    "Use core glTF 2.0 resources without extensions for this first slice.",
                );
            }
        }
    }
    for key in ["buffers", "images"] {
        if let Some(items) = raw[key].as_array() {
            for (i, item) in items.iter().enumerate() {
                if item.get("uri").is_some() {
                    report.error(
                        "resource_uri",
                        format!("/{key}/{i}/uri"),
                        "URI resources (including data URIs) are not supported in this slice.",
                        "Embed buffers in the GLB BIN chunk and images in buffer views.",
                    );
                }
            }
        }
    }
    // gltf-json 1.4.1's primitive hook directly indexes POSITION before returning
    // reference errors. Guard this input before invoking that validation hook.
    let accessor_count = raw["accessors"].as_array().map_or(0, Vec::len);
    if let Some(meshes) = raw["meshes"].as_array() {
        for (mesh_index, mesh) in meshes.iter().enumerate() {
            if let Some(primitives) = mesh["primitives"].as_array() {
                for (primitive_index, primitive) in primitives.iter().enumerate() {
                    if let Some(index) = primitive["attributes"]["POSITION"].as_u64()
                        && usize::try_from(index).map_or(true, |index| index >= accessor_count)
                    {
                        report.error(
                            "invalid_gltf",
                            format!("/meshes/{mesh_index}/primitives/{primitive_index}/attributes/POSITION"),
                            "POSITION references an accessor that does not exist.",
                            "Repair the POSITION accessor reference in the source exporter.",
                        );
                        return report;
                    }
                }
            }
        }
    }
    // gltf-json permits both representations and gltf then silently favors matrix.
    // Reject contradictory rest data instead of hiding the source transform.
    if let Some(nodes) = raw["nodes"].as_array() {
        for (index, node) in nodes.iter().enumerate() {
            if node.get("matrix").is_some()
                && ["translation", "rotation", "scale"]
                    .iter()
                    .any(|key| node.get(key).is_some())
            {
                report.error(
                    "rest_transform_conflict",
                    format!("/nodes/{index}"),
                    "A node must use either matrix or TRS, never both.",
                    "Export one unambiguous rest transform per node.",
                );
                return report;
            }
        }
    }
    let gltf = match gltf::Gltf::from_slice(bytes) {
        Ok(g) => g,
        Err(e) => {
            report.error(
                "invalid_gltf",
                "/",
                e.to_string(),
                "Correct the glTF validation errors in the source exporter.",
            );
            return report;
        }
    };
    let blob = gltf.blob.as_deref().unwrap_or_default();
    for buffer in gltf.buffers() {
        if matches!(buffer.source(), gltf::buffer::Source::Bin)
            && (buffer.length() > blob.len() || blob.len() - buffer.length() > 3)
        {
            report.error(
                "buffer_length",
                format!("/buffers/{}", buffer.index()),
                "BIN length does not match declared buffer length plus padding.",
                "Re-export complete binary data.",
            );
        }
    }
    for view in gltf.views() {
        if view
            .offset()
            .checked_add(view.length())
            .is_none_or(|end| end > view.buffer().length() || end > blob.len())
        {
            report.error(
                "buffer_view_bounds",
                format!("/bufferViews/{}", view.index()),
                "Buffer view exceeds binary data.",
                "Repair the buffer view in the source exporter.",
            );
        }
    }
    for accessor in gltf.accessors() {
        let path = format!("/accessors/{}", accessor.index());
        if accessor.count() == 0 {
            report.error(
                "accessor_count",
                &path,
                "An accessor must contain at least one element.",
                "Remove unused empty accessors or export nonempty attribute data.",
            );
        }

        if accessor.sparse().is_some() {
            report.error(
                "sparse_accessor",
                &path,
                "Sparse accessors are not yet qualified.",
                "Export dense attributes for this slice.",
            );
        }
        if let Some(view) = accessor.view() {
            let stride = view.stride().unwrap_or(accessor.size());
            let end = accessor
                .count()
                .saturating_sub(1)
                .checked_mul(stride)
                .and_then(|n| n.checked_add(accessor.offset()))
                .and_then(|n| n.checked_add(accessor.size()));
            if stride < accessor.size() || end.is_none_or(|n| n > view.length()) {
                report.error(
                    "accessor_bounds",
                    &path,
                    "Accessor layout exceeds its buffer view.",
                    "Repair attribute offsets, counts and strides.",
                );
            }
        } else {
            report.error(
                "accessor_storage",
                &path,
                "Accessor has no dense storage.",
                "Export dense attributes for this slice.",
            );
        }
    }
    let nodes: Vec<_> = gltf.nodes().collect();
    let mut parents = vec![0usize; nodes.len()];
    for node in &nodes {
        for child in node.children() {
            parents[child.index()] += 1;
        }
        report.nodes.push(NodeInfo {
            index: node.index(),
            name: node.name().map(str::to_owned),
            children: node.children().map(|n| n.index()).collect(),
            mesh: node.mesh().map(|m| m.index()),
            skin: node.skin().map(|s| s.index()),
            local_matrix: node.transform().matrix(),
        });
    }
    if parents.iter().any(|&n| n > 1) {
        report.error(
            "node_multiple_parents",
            "/nodes",
            "A node has multiple parents.",
            "Export a tree hierarchy.",
        );
    }
    let mut degrees = parents.clone();
    let mut queue: Vec<_> = degrees
        .iter()
        .enumerate()
        .filter(|&(_, n)| *n == 0)
        .map(|(i, _)| i)
        .collect();
    let mut seen = 0;
    while let Some(i) = queue.pop() {
        seen += 1;
        for child in nodes[i].children() {
            degrees[child.index()] -= 1;
            if degrees[child.index()] == 0 {
                queue.push(child.index());
            }
        }
    }
    if seen != nodes.len() {
        report.error(
            "node_cycle",
            "/nodes",
            "Node hierarchy contains a cycle.",
            "Remove cyclic node references.",
        );
    }
    report.inventory = Inventory {
        meshes: gltf.meshes().count(),
        mesh_instances: nodes.iter().filter(|n| n.mesh().is_some()).count(),
        primitives: gltf.meshes().map(|m| m.primitives().count()).sum(),
        vertices: 0,
        skins: gltf.skins().count(),
        joints: gltf.skins().map(|s| s.joints().count()).sum(),
        animations: gltf.animations().count(),
        images: gltf.images().count(),
    };
    if report.inventory.meshes == 0 {
        report.error(
            "no_meshes",
            "/meshes",
            "No character mesh found.",
            "Export the character geometry.",
        );
    }
    if gltf.scenes().count() != 1 {
        report.error(
            "scene_count",
            "/scenes",
            "This slice requires exactly one scene; character count is not inferred.",
            "Export one character scene, retaining all required meshes.",
        );
    }
    for scene in gltf.scenes() {
        for root in scene.nodes() {
            if parents[root.index()] != 0 {
                report.error(
                    "scene_root_parent",
                    "/scenes",
                    "A scene root has a parent.",
                    "Export valid scene roots.",
                );
            }
        }
    }
    // Readers are only used after checking every binary range and unsupported encoding.
    if report
        .diagnostics
        .iter()
        .any(|d| d.severity == Severity::Error)
    {
        return report;
    }
    for mesh in gltf.meshes() {
        for primitive in mesh.primitives() {
            let path = format!("/meshes/{}/primitives/{}", mesh.index(), primitive.index());
            if primitive.mode() != gltf::mesh::Mode::Triangles {
                report.error(
                    "primitive_mode",
                    &path,
                    "Only triangle primitives are supported.",
                    "Triangulate the source mesh.",
                );
            }
            // Binary readers assume the semantic's exact shape and component type;
            // gltf's schema checks do not enforce those assumptions for us.
            if let Some(position) = primitive.get(&gltf::Semantic::Positions)
                && (position.data_type() != gltf::accessor::DataType::F32
                    || position.dimensions() != gltf::accessor::Dimensions::Vec3
                    || position.normalized())
            {
                report.error(
                    "position_layout",
                    format!("{path}/attributes/POSITION"),
                    "POSITION must be a non-normalized FLOAT VEC3 accessor.",
                    "Re-export vertex positions as three floating-point components.",
                );
                continue;
            }
            if let Some(indices) = primitive.indices()
                && (!matches!(
                    indices.data_type(),
                    gltf::accessor::DataType::U8
                        | gltf::accessor::DataType::U16
                        | gltf::accessor::DataType::U32
                ) || indices.dimensions() != gltf::accessor::Dimensions::Scalar
                    || indices.normalized())
            {
                report.error(
                    "index_layout",
                    format!("{path}/indices"),
                    "Indices must be non-normalized unsigned integer SCALAR values.",
                    "Re-export indices as UNSIGNED_BYTE, UNSIGNED_SHORT or UNSIGNED_INT scalars.",
                );
                continue;
            }
            let reader = primitive.reader(|_| Some(blob));
            let Some(positions) = reader.read_positions() else {
                report.error(
                    "missing_positions",
                    &path,
                    "Mesh is missing positions.",
                    "Export vertex positions.",
                );
                continue;
            };
            let count = positions.len();
            report.inventory.vertices += count;
            if positions.into_iter().flatten().any(|v| !v.is_finite()) {
                report.error(
                    "nonfinite_positions",
                    &path,
                    "Vertex positions contain NaN or infinity.",
                    "Repair invalid vertex coordinates.",
                );
            }
            for (_, attribute) in primitive.attributes() {
                if attribute.count() != count {
                    report.error(
                        "attribute_count",
                        &path,
                        "Vertex attribute counts differ.",
                        "Export one attribute value per vertex.",
                    );
                }
            }
            if let Some(indices) = reader.read_indices() {
                let indices = indices.into_u32();
                if !indices.len().is_multiple_of(3)
                    || indices.into_iter().any(|i| i as usize >= count)
                {
                    report.error(
                        "invalid_indices",
                        &path,
                        "Triangle indices are incomplete or out of bounds.",
                        "Repair triangle topology.",
                    );
                }
            } else if !count.is_multiple_of(3) {
                report.error(
                    "triangle_count",
                    &path,
                    "Nonindexed triangle vertex count is not divisible by three.",
                    "Export complete triangles.",
                );
            }
        }
    }
    if report.inventory.skins == 0 {
        report.issue(
            Severity::Warning,
            "unrigged",
            "/skins",
            "No existing skin found. Semi-automatic rigging is planned for M2.",
            "Inspect the surface now; joint placement is not implemented yet.",
        );
    }
    if report.inventory.animations > 0 {
        report.issue(
            Severity::Warning,
            "animations_static",
            "/animations",
            "Animations are inventoried but not played in this preview.",
            "Keep the source; export animation disposition is a later M1 task.",
        );
    }
    report.issue(Severity::Warning,"inspection_only","/","Preview and structural rig checks do not certify deformation quality or VRM conformance.","Review mapping and bind warnings; VRM serialization and independent compatibility validation are still pending.");
    report.preview_allowed = !report
        .diagnostics
        .iter()
        .any(|d| d.severity == Severity::Error);
    if report.preview_allowed {
        let binds = bind::validate(&gltf);
        // Three.js currently renders only the first four influences. Never display
        // a silently truncated skin as if all validated source influences were used.
        report.preview_allowed = binds.valid
            && !binds.diagnostics.iter().any(|d| {
                matches!(
                    d.code.as_str(),
                    "preview_influence_limit" | "preview_mesh_transform"
                )
            });
        report.rig = Some(RigReview {
            mapping: mapping::review(&gltf, overrides),
            binds,
        });
    }
    report
}

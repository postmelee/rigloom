//! Immutable skin checks. Matrices use glTF's column-major convention.
use crate::{Diagnostic, Severity};
use gltf::accessor::{DataType, Dimensions};
use serde::Serialize;
use std::collections::{BTreeMap, BTreeSet};

type Matrix = [[f64; 4]; 4];
const IDENTITY: Matrix = [
    [1., 0., 0., 0.],
    [0., 1., 0., 0.],
    [0., 0., 1., 0.],
    [0., 0., 0., 1.],
];

#[derive(Debug, Serialize)]
pub struct SkinValidation {
    pub skin: usize,
    pub joints: usize,
    pub mesh_nodes: Vec<usize>,
    /// Consistent means all joint-world * inverse-bind products agree, not that
    /// an artist-approved neutral pose or deformation quality was established.
    pub neutral_consistency: String,
    pub max_joint_rest_difference: Option<f64>,
}
#[derive(Debug, Serialize)]
pub struct BindValidation {
    pub valid: bool,
    pub skins: Vec<SkinValidation>,
    pub diagnostics: Vec<Diagnostic>,
}
impl BindValidation {
    fn issue(&mut self, severity: Severity, code: &str, path: String, message: &str, remedy: &str) {
        self.diagnostics.push(Diagnostic {
            severity,
            code: code.into(),
            path,
            message: message.into(),
            remedy: remedy.into(),
        });
    }
    fn error(&mut self, code: &str, path: String, message: &str) {
        self.issue(Severity::Error, code, path, message, "Repair this data in the source exporter; Rigloom does not rewrite weights or transforms.");
    }
    fn warning(&mut self, code: &str, path: String, message: &str, remedy: &str) {
        self.issue(Severity::Warning, code, path, message, remedy);
    }
}
// glTF alignment applies both inside the view and at the absolute buffer offset.
// Vertex elements additionally need four-byte relative offsets and strides.
fn accessor_aligned(accessor: &gltf::Accessor<'_>, vertex: bool) -> bool {
    let Some(view) = accessor.view() else {
        return false;
    };
    let component = accessor.data_type().size();
    let offset = accessor.offset();
    let stride = view.stride().unwrap_or(accessor.size());
    offset.is_multiple_of(component)
        && view
            .offset()
            .checked_add(offset)
            .is_some_and(|absolute| absolute.is_multiple_of(component))
        && stride.is_multiple_of(component)
        && (!vertex || (offset.is_multiple_of(4) && stride.is_multiple_of(4)))
}
fn multiply(a: Matrix, b: Matrix) -> Matrix {
    std::array::from_fn(|c| std::array::from_fn(|r| (0..4).map(|k| a[k][r] * b[c][k]).sum()))
}
fn matrix_valid(m: Matrix) -> bool {
    m.iter().flatten().all(|x| x.is_finite())
        && m[0][3].abs() <= 1e-6
        && m[1][3].abs() <= 1e-6
        && m[2][3].abs() <= 1e-6
        && (m[3][3] - 1.).abs() <= 1e-6
}
fn trs_decomposable(m: Matrix) -> bool {
    // A local T * R * S matrix has orthogonal basis columns. Normalize the
    // comparison by both column lengths so model units do not affect the check.
    // Composed world matrices and inverse binds may legitimately contain shear.
    for a in 0..3 {
        for b in a + 1..3 {
            let dot: f64 = (0..3).map(|r| m[a][r] * m[b][r]).sum();
            let a_length = (0..3).map(|r| m[a][r].powi(2)).sum::<f64>().sqrt();
            let b_length = (0..3).map(|r| m[b][r].powi(2)).sum::<f64>().sqrt();
            if dot.abs() > 1e-5 * a_length * b_length {
                return false;
            }
        }
    }
    true
}
fn invertible(m: Matrix) -> bool {
    // Scale each row first so tiny but invertible model units are not rejected
    // by an arbitrary absolute determinant cutoff.
    let mut rows = std::array::from_fn::<_, 4, _>(|r| std::array::from_fn::<_, 4, _>(|c| m[c][r]));
    for row in &mut rows {
        let scale = row.iter().map(|x| x.abs()).fold(0., f64::max);
        if !scale.is_finite() || scale == 0. {
            return false;
        }
        for x in row {
            *x /= scale;
        }
    }
    for col in 0..4 {
        let pivot = (col..4)
            .max_by(|&a, &b| rows[a][col].abs().total_cmp(&rows[b][col].abs()))
            .unwrap();
        if rows[pivot][col].abs() <= 1e-14 {
            return false;
        }
        rows.swap(col, pivot);
        let pivot_row = rows[col];
        for row in rows.iter_mut().skip(col + 1) {
            let factor = row[col] / pivot_row[col];
            for (value, pivot) in row.iter_mut().zip(pivot_row).skip(col) {
                *value -= factor * pivot;
            }
        }
    }
    true
}
fn difference(a: Matrix, b: Matrix) -> f64 {
    a.iter()
        .flatten()
        .zip(b.iter().flatten())
        .map(|(x, y)| (x - y).abs() / (1. + x.abs().max(y.abs())))
        .fold(0., f64::max)
}
fn is_ancestor(ancestor: usize, mut node: usize, parents: &[Option<usize>]) -> bool {
    for _ in 0..=parents.len() {
        if node == ancestor {
            return true;
        }
        let Some(parent) = parents[node] else {
            return false;
        };
        node = parent;
    }
    false
}
/// Call only after the inspector has validated GLB storage, accessor bounds,
/// node references and an acyclic single-parent hierarchy.
pub fn validate(gltf: &gltf::Gltf) -> BindValidation {
    let mut report = BindValidation {
        valid: false,
        skins: vec![],
        diagnostics: vec![],
    };
    let nodes: Vec<_> = gltf.nodes().collect();
    let mut parents = vec![None; nodes.len()];
    for node in &nodes {
        for child in node.children() {
            parents[child.index()] = Some(node.index());
        }
    }
    let mut world = vec![IDENTITY; nodes.len()];
    let mut roots: Vec<_> = parents
        .iter()
        .enumerate()
        .filter_map(|(i, p)| p.is_none().then_some(i))
        .collect();
    let mut tree_root = vec![0; nodes.len()];
    while let Some(i) = roots.pop() {
        let node = &nodes[i];
        let local = node.transform().matrix().map(|c| c.map(f64::from));
        if !matrix_valid(local) {
            report.error(
                "rest_transform",
                format!("/nodes/{i}"),
                "Node transform must be finite and affine.",
            );
        }
        if matches!(node.transform(), gltf::scene::Transform::Matrix { .. })
            && matrix_valid(local)
            && !trs_decomposable(local)
        {
            report.error(
                "rest_matrix_shear",
                format!("/nodes/{i}/matrix"),
                "A local node matrix must decompose to translation, rotation and scale; shear is not supported by glTF.",
            );
        }
        if let gltf::scene::Transform::Decomposed { rotation, .. } = node.transform() {
            let norm: f64 = rotation.iter().map(|x| f64::from(*x).powi(2)).sum();
            if !norm.is_finite() || (norm - 1.).abs() > 1e-5 {
                report.error(
                    "rest_rotation",
                    format!("/nodes/{i}/rotation"),
                    "Node rotation must be a finite unit quaternion.",
                );
            }
        }
        world[i] = parents[i].map_or(local, |p| multiply(world[p], local));
        tree_root[i] = parents[i].map_or(i, |p| tree_root[p]);
        if !matrix_valid(world[i]) {
            report.error(
                "world_transform",
                format!("/nodes/{i}"),
                "Accumulated world transform must remain finite and affine.",
            );
        }
        roots.extend(node.children().map(|n| n.index()));
    }
    let scene_roots: BTreeSet<_> = gltf
        .scenes()
        .flat_map(|s| s.nodes().map(|n| n.index()).collect::<Vec<_>>())
        .collect();
    let blob = gltf.blob.as_deref().unwrap_or_default();
    for skin in gltf.skins() {
        let path = format!("/skins/{}", skin.index());
        let joints: Vec<_> = skin.joints().map(|n| n.index()).collect();
        if joints.is_empty() {
            report.error(
                "skin_joints_empty",
                format!("{path}/joints"),
                "A skin must contain at least one joint, including unused skins.",
            );
        }
        let mesh_nodes: Vec<_> = nodes
            .iter()
            .filter(|n| n.skin().is_some_and(|s| s.index() == skin.index()))
            .map(|n| n.index())
            .collect();
        let unique: BTreeSet<_> = joints.iter().copied().collect();
        if unique.len() != joints.len() {
            report.error(
                "duplicate_skin_joint",
                format!("{path}/joints"),
                "A skin must not reference a joint more than once.",
            );
        }
        if let Some(first) = joints.first() {
            if joints.iter().any(|j| tree_root[*j] != tree_root[*first]) {
                report.error(
                    "skin_common_root",
                    format!("{path}/joints"),
                    "All joints in a skin must have a common ancestor.",
                );
            }
            if mesh_nodes
                .iter()
                .any(|n| scene_roots.contains(&tree_root[*n]))
                && joints.iter().any(|j| !scene_roots.contains(&tree_root[*j]))
            {
                report.error(
                    "skin_joint_scene",
                    format!("{path}/joints"),
                    "Joints of an instantiated skin must belong to its scene.",
                );
            }
        }
        if let Some(root) = skin.skeleton()
            && joints
                .iter()
                .any(|&j| !is_ancestor(root.index(), j, &parents))
        {
            report.error(
                "skin_skeleton_root",
                format!("{path}/skeleton"),
                "The skeleton node must be an ancestor of every joint (or the joint itself).",
            );
        }
        for &j in &joints {
            if !invertible(world[j]) {
                report.error(
                    "singular_joint_transform",
                    format!("/nodes/{j}"),
                    "A joint rest transform is singular or numerically unstable.",
                );
            }
        }
        let mut summary = SkinValidation {
            skin: skin.index(),
            joints: joints.len(),
            mesh_nodes: mesh_nodes.clone(),
            neutral_consistency: "unchecked".into(),
            max_joint_rest_difference: None,
        };
        let mut matrices = None;
        if let Some(accessor) = skin.inverse_bind_matrices() {
            if accessor.data_type() != DataType::F32
                || accessor.dimensions() != Dimensions::Mat4
                || accessor.normalized()
                || accessor.view().is_some_and(|view| view.stride().is_some())
                || !accessor_aligned(&accessor, false)
            {
                report.error(
                    "inverse_bind_layout",
                    format!("{path}/inverseBindMatrices"),
                    "Inverse binds must be tightly packed, non-normalized FLOAT MAT4 values without bufferView.byteStride, with relative and absolute offsets aligned to four bytes.",
                );
            } else if accessor.count() < joints.len() {
                report.error(
                    "inverse_bind_count",
                    format!("{path}/inverseBindMatrices"),
                    "Inverse-bind count must be at least the number of skin joints.",
                );
            } else {
                matrices = skin
                    .reader(|_| Some(blob))
                    .read_inverse_bind_matrices()
                    .map(|m| m.map(|m| m.map(|c| c.map(f64::from))).collect::<Vec<_>>());
            }
        } else {
            matrices = Some(vec![IDENTITY; joints.len()]);
        }
        if let Some(matrices) = matrices {
            let mut products = Vec::with_capacity(joints.len());
            for (i, matrix) in matrices.iter().enumerate() {
                if !matrix_valid(*matrix) {
                    report.error(
                        "inverse_bind_matrix",
                        format!("{path}/inverseBindMatrices/{i}"),
                        "Inverse binds must be finite affine matrices with last row [0, 0, 0, 1].",
                    );
                } else if !invertible(*matrix) {
                    report.error(
                        "singular_inverse_bind",
                        format!("{path}/inverseBindMatrices/{i}"),
                        "Inverse bind is singular or numerically unstable.",
                    );
                } else if let Some(joint) = joints.get(i) {
                    let product = multiply(world[*joint], *matrix);
                    if matrix_valid(product) {
                        products.push(product);
                    }
                }
            }
            if products.len() == joints.len() && !products.is_empty() {
                let delta = products
                    .iter()
                    .map(|m| difference(products[0], *m))
                    .fold(0., f64::max);
                summary.max_joint_rest_difference = Some(delta);
                summary.neutral_consistency = if delta <= 1e-5 {
                    "consistent"
                } else {
                    "review_required"
                }
                .into();
                if delta > 1e-5 {
                    report.warning("bind_rest_review", path.clone(), "Joint-world × inverse-bind products differ at the stored pose. This can be an intentional pose or a bind mismatch; neutral preservation is unconfirmed.", "Review the source bind pose before export; no transform or inverse bind was changed.");
                }
            }
        }
        for node_index in mesh_nodes {
            let node = &nodes[node_index];
            if !invertible(world[node_index]) {
                report.warning(
                    "preview_mesh_transform",
                    format!("/nodes/{node_index}"),
                    "glTF ignores the skinned mesh node transform, but the current preview renderer cannot handle a singular mesh world transform reliably.",
                    "Remove the irrelevant mesh transform in the source exporter, or await a renderer fix. Preview is withheld and source data is unchanged.",
                );
            }
            let Some(mesh) = node.mesh() else {
                report.error(
                    "skin_without_mesh",
                    format!("/nodes/{node_index}/skin"),
                    "A node referencing a skin must also reference a mesh.",
                );
                continue;
            };
            for primitive in mesh.primitives() {
                validate_weights(&primitive, blob, joints.len(), node_index, &mut report);
            }
        }
        report.skins.push(summary);
    }
    report.valid = !report
        .diagnostics
        .iter()
        .any(|d| d.severity == Severity::Error);
    report
}
fn validate_weights(
    primitive: &gltf::Primitive<'_>,
    blob: &[u8],
    joint_count: usize,
    node_index: usize,
    report: &mut BindValidation,
) {
    let path = format!("/nodes/{node_index}/mesh/primitives/{}", primitive.index());
    let mut sets = BTreeMap::<u32, (Option<gltf::Accessor<'_>>, Option<gltf::Accessor<'_>>)>::new();
    for (semantic, accessor) in primitive.attributes() {
        match semantic {
            gltf::Semantic::Joints(i) => sets.entry(i).or_default().0 = Some(accessor),
            gltf::Semantic::Weights(i) => sets.entry(i).or_default().1 = Some(accessor),
            _ => {}
        }
    }
    if sets.is_empty() {
        report.error(
            "missing_skin_attributes",
            path,
            "A skinned primitive needs JOINTS_0 and WEIGHTS_0.",
        );
        return;
    }
    if sets.keys().copied().ne(0..sets.len() as u32) {
        report.error(
            "skin_attribute_sets",
            path.clone(),
            "Joint/weight sets must start at zero and be consecutive.",
        );
    }
    let count = primitive
        .get(&gltf::Semantic::Positions)
        .map_or(0, |a| a.count());
    let mut layout_ok = true;
    for (&set, pair) in &sets {
        let (Some(joints), Some(weights)) = pair else {
            report.error(
                "skin_attribute_pair",
                format!("{path}/attributes/{set}"),
                "Each joint attribute set must have its matching weight set.",
            );
            layout_ok = false;
            continue;
        };
        if joints.dimensions() != Dimensions::Vec4
            || !matches!(joints.data_type(), DataType::U8 | DataType::U16)
            || joints.normalized()
            || !accessor_aligned(joints, true)
        {
            report.error(
                "joints_layout",
                format!("{path}/attributes/JOINTS_{set}"),
                "Joint attributes must be non-normalized unsigned byte/short VEC4 values with component-aligned absolute offsets and four-byte relative offsets/strides.",
            );
            layout_ok = false;
        }
        let weights_type = match weights.data_type() {
            DataType::F32 => !weights.normalized(),
            DataType::U8 | DataType::U16 => weights.normalized(),
            _ => false,
        };
        if weights.dimensions() != Dimensions::Vec4
            || !weights_type
            || !accessor_aligned(weights, true)
        {
            report.error(
                "weights_layout",
                format!("{path}/attributes/WEIGHTS_{set}"),
                "Weights must be FLOAT VEC4 or normalized unsigned byte/short VEC4 values with component-aligned absolute offsets and four-byte relative offsets/strides.",
            );
            layout_ok = false;
        }
        if joints.count() != count || weights.count() != count {
            report.error(
                "skin_attribute_count",
                path.clone(),
                "Skin attribute count must match the position count.",
            );
            layout_ok = false;
        }
    }
    if !layout_ok {
        return;
    }
    if sets.len() > 1 {
        report.warning("preview_influence_limit", path.clone(), "All influence sets are validated, but the current preview renderer supports only the first four influences.", "Keep the original data; preview is withheld instead of dropping additional influences.");
    }
    let reader = primitive.reader(|_| Some(blob));
    let mut values = Vec::with_capacity(sets.len());
    for &set in sets.keys() {
        let (Some(joints), Some(weights)) = (reader.read_joints(set), reader.read_weights(set))
        else {
            report.error(
                "skin_attribute_storage",
                path.clone(),
                "Skin attributes could not be read from dense storage.",
            );
            return;
        };
        values.push((joints.into_u16(), weights.into_f32()));
    }
    // Report the first affected vertex for each fault class, not millions of diagnostics.
    let mut emitted = BTreeSet::new();
    for vertex in 0..count {
        let mut sum = 0f64;
        let mut nonzero = 0;
        let mut used = BTreeSet::new();
        let mut errors = BTreeSet::new();
        for (joints, weights) in &mut values {
            let (Some(j), Some(w)) = (joints.next(), weights.next()) else {
                return;
            };
            for influence in 0..4 {
                if usize::from(j[influence]) >= joint_count {
                    errors.insert("joint_index_bounds");
                }
                let weight = w[influence];
                if !weight.is_finite() {
                    errors.insert("weights_nonfinite");
                } else if weight < 0. {
                    errors.insert("weights_negative");
                } else {
                    sum += f64::from(weight);
                    if weight > 0. {
                        nonzero += 1;
                        if !used.insert(j[influence]) {
                            errors.insert("duplicate_joint_influence");
                        }
                    }
                }
            }
        }
        if sum == 0. {
            errors.insert("unweighted_vertex");
        } else if (sum - 1.).abs() > 2e-7 * f64::from(nonzero.max(1)) {
            errors.insert("weights_sum");
        }
        for code in errors {
            if !emitted.insert(code) {
                continue;
            }
            let message = match code {
                "joint_index_bounds" => {
                    "Joint index is outside this instance's skin.joints array (including zero-weight entries)."
                }
                "weights_nonfinite" => "Weights contain NaN or infinity.",
                "weights_negative" => "Weights contain a negative value.",
                "duplicate_joint_influence" => {
                    "A vertex has more than one positive weight for the same joint."
                }
                "unweighted_vertex" => "A vertex has no positive finite influence.",
                _ => {
                    "Weights across all sets must sum to one (tolerance 2e-7 per positive influence)."
                }
            };
            report.error(code, format!("{path}/vertices/{vertex}"), message);
        }
    }
}

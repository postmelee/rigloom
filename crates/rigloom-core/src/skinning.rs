//! Original distance priors + edge-only diffusion. No volume solver or external code.
use crate::placement::{self, BONES, Frame, Matrix, PARENTS, Point};
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use std::collections::{BTreeMap, BTreeSet};

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Request {
    pub frame: Frame,
    pub joints: Vec<Point>,
    pub method: String,
    pub rigid: BTreeMap<String, usize>,
}
#[derive(Serialize, Clone)]
pub struct Part {
    pub id: String,
    pub label: String,
    pub node: usize,
    pub primitive: usize,
    pub vertices: usize,
    pub center: Point,
}
#[derive(Serialize)]
pub struct Report {
    pub algorithm: String,
    pub vertices: usize,
    pub components: Vec<Part>,
    pub rigid: BTreeMap<String, usize>,
    pub max_weight_sum_error: f64,
    pub unweighted_vertices: usize,
    pub mapping: BTreeMap<String, Option<usize>>,
    pub warnings: Vec<String>,
}
pub struct Output {
    pub bytes: Vec<u8>,
    pub report: Report,
}
struct Surface {
    label: String,
    node: usize,
    primitive: usize,
    world: Matrix,
    points: Vec<Point>,
    edges: Vec<Vec<usize>>,
    components: Vec<Vec<usize>>,
}
const VERTEX_LIMIT: usize = 200_000;
fn surfaces(bytes: &[u8], frame: &Frame) -> Result<Vec<Surface>, String> {
    let prepared = placement::prepare(bytes, frame)?;
    let gltf = placement::source(bytes)?;
    if gltf.animations().len() != 0 {
        return Err("Initial skinning requires a static source. Export a separate rest-pose GLB without animations.".into());
    }
    let worlds = placement::worlds(&gltf);
    let mut surfaces = vec![];
    let mut count = 0;
    for node in gltf.nodes() {
        let (Some(mesh), Some(world)) = (node.mesh(), worlds[node.index()]) else {
            continue;
        };
        let world = placement::multiply(prepared.matrix, world);
        for primitive in mesh.primitives() {
            if primitive.morph_targets().len() != 0 {
                return Err("Initial skinning of morph targets is not qualified. Use a separate base-mesh GLB; the original is unchanged.".into());
            }
            let reader = primitive.reader(|_| gltf.blob.as_deref());
            let positions = reader.read_positions().ok_or("Missing positions")?;
            count += positions.len();
            if count > VERTEX_LIMIT {
                return Err("Initial skinning work guard: at most 200,000 active vertex instances. Try a reduced test copy.".into());
            }
            let points: Vec<_> = positions
                .map(|p| placement::point(world, p.map(f64::from)))
                .collect();
            if points
                .iter()
                .flatten()
                .any(|v| !v.is_finite() || v.abs() > 1e8)
            {
                return Err("Prepared positions exceed the supported numerical range.".into());
            }
            let indices: Vec<usize> = reader
                .read_indices()
                .map(|v| v.into_u32().map(|i| i as usize).collect())
                .unwrap_or_else(|| (0..points.len()).collect());
            let mut edges = vec![BTreeSet::new(); points.len()];
            for t in indices.chunks_exact(3) {
                for (a, b) in [(t[0], t[1]), (t[1], t[2]), (t[2], t[0])] {
                    if a >= points.len() || b >= points.len() {
                        return Err("Triangle index exceeds positions.".into());
                    }
                    if a != b {
                        edges[a].insert(b);
                        edges[b].insert(a);
                    }
                }
            }
            let edges: Vec<Vec<_>> = edges.into_iter().map(|e| e.into_iter().collect()).collect();
            let mut seen = vec![false; points.len()];
            let mut components = vec![];
            for start in 0..points.len() {
                if seen[start] {
                    continue;
                }
                seen[start] = true;
                let mut component = vec![];
                let mut stack = vec![start];
                while let Some(i) = stack.pop() {
                    component.push(i);
                    for &n in &edges[i] {
                        if !seen[n] {
                            seen[n] = true;
                            stack.push(n);
                        }
                    }
                }
                component.sort_unstable();
                components.push(component);
            }
            surfaces.push(Surface {
                label: node.name().unwrap_or("Unnamed mesh").to_string(),
                node: node.index(),
                primitive: primitive.index(),
                world,
                points,
                edges,
                components,
            });
        }
    }
    Ok(surfaces)
}
fn parts(surfaces: &[Surface]) -> Vec<Part> {
    surfaces
        .iter()
        .flat_map(|s| {
            s.components.iter().enumerate().map(|(c, indices)| Part {
                id: format!("{}:{}:{c}", s.node, s.primitive),
                label: format!("{} · primitive {} · part {}", s.label, s.primitive, c),
                node: s.node,
                primitive: s.primitive,
                vertices: indices.len(),
                center: std::array::from_fn(|a| {
                    indices.iter().map(|&i| s.points[i][a]).sum::<f64>() / indices.len() as f64
                }),
            })
        })
        .collect()
}
pub fn list_parts(bytes: &[u8], frame: &Frame) -> Result<Vec<Part>, String> {
    Ok(parts(&surfaces(bytes, frame)?))
}
fn segment_distance(p: Point, a: Point, b: Point) -> f64 {
    let ab: Point = std::array::from_fn(|i| b[i] - a[i]);
    let denominator: f64 = ab.iter().map(|v| v * v).sum();
    let t = if denominator > 0. {
        ((0..3).map(|i| (p[i] - a[i]) * ab[i]).sum::<f64>() / denominator).clamp(0., 1.)
    } else {
        0.
    };
    placement::distance(p, std::array::from_fn(|i| a[i] + t * ab[i]))
}
fn prior(points: &[Point], joints: &[Point]) -> Vec<[f64; 15]> {
    distance_prior(points, joints, false)
}
fn distance_prior(points: &[Point], joints: &[Point], compact: bool) -> Vec<[f64; 15]> {
    distance_fields(points, joints, compact)
        .map(|(prior, _)| prior)
        .collect()
}
fn distance_fields<'a>(
    points: &'a [Point],
    joints: &'a [Point],
    compact: bool,
) -> impl Iterator<Item = ([f64; 15], [f64; 15])> + 'a {
    let height = (joints[2][1] - joints[5][1]).abs().max(1e-5);
    let children = [
        Some(1),
        Some(2),
        None,
        Some(4),
        Some(5),
        None,
        Some(7),
        Some(8),
        None,
        Some(10),
        Some(11),
        None,
        Some(13),
        Some(14),
        None,
    ];
    points.iter().map(move |&p| {
        let mut distances = [0.; 15];
        for i in 0..15 {
            let a = joints[i];
            let b = if let Some(c) = children[i] {
                joints[c]
            } else if i == 2 {
                [a[0], a[1] + height * 0.1, a[2]]
            } else if i == 5 || i == 8 {
                [a[0], a[1], a[2] + height * 0.1]
            } else {
                let parent = joints[PARENTS[i].unwrap()];
                std::array::from_fn(|k| a[k] + (a[k] - parent[k]) * 0.2)
            };
            distances[i] = segment_distance(p, a, b).max(height * 0.01);
        }
        let min = distances.iter().copied().fold(f64::INFINITY, f64::min);
        // Keep full support through twice the nearest distance, then fade to
        // zero at the existing three-distance boundary. Remote geometry keeps
        // the same confidence fallback as v2; this is not attachment inference.
        let confidence = if compact {
            ((height * 0.2 - min) / (height * 0.1)).clamp(0., 1.)
        } else {
            0.
        };
        let support = distances.map(|d| {
            let x = (3. - d / min).clamp(0., 1.);
            1. - confidence + confidence * x * x * (3. - 2. * x)
        });
        let mut w = distances.map(|d| {
            // Compact support suppresses weak remote influences near the skeleton.
            // Fade back to the baseline for distant geometry: proximity cannot identify
            // whether a detached accessory belongs to a hand, torso, or another joint.
            let falloff = (min / d).powi(4);
            if !compact {
                return falloff;
            }
            let taper = (1. - (d / (min * 3.)).powi(2)).max(0.).powi(2);
            falloff * (1. - confidence + confidence * taper)
        });
        let sum: f64 = w.iter().sum();
        for v in &mut w {
            *v /= sum;
        }
        (w, support)
    })
}
fn diffuse(prior: &[[f64; 15]], edges: &[Vec<usize>]) -> Vec<[f64; 15]> {
    let mut current = prior.to_vec();
    // Fixed iteration count and sorted adjacency make native/WASM results reproducible.
    // The 35% prior anchor prevents a connected body from converging to one uniform blend.
    for _ in 0..32 {
        current = edges
            .iter()
            .enumerate()
            .map(|(i, adj)| {
                if adj.is_empty() {
                    return prior[i];
                }
                std::array::from_fn(|b| {
                    0.35 * prior[i][b]
                        + 0.65 * adj.iter().map(|&j| current[j][b]).sum::<f64>() / adj.len() as f64
                })
            })
            .collect();
    }
    current
}
// Diffusion can reintroduce a remote influence even where the compact prior
// was zero. Reapply continuous local support after smoothing, before top-four
// truncation. The nearest segment retains its anchored positive mass, so the
// sum cannot vanish. No edges or source geometry are created or welded.
fn surface_weights(points: &[Point], joints: &[Point], edges: &[Vec<usize>]) -> Vec<[f64; 15]> {
    let prior = distance_prior(points, joints, true);
    let mut weights = diffuse(&prior, edges);
    // Stream masks rather than retaining another 15-value array per vertex.
    for (w, (_, mask)) in weights
        .iter_mut()
        .zip(distance_fields(points, joints, true))
    {
        if mask.iter().all(|m| *m == 1.) {
            continue;
        }
        for (v, m) in w.iter_mut().zip(mask) {
            *v *= m;
        }
        let sum: f64 = w.iter().sum();
        for v in w {
            *v /= sum;
        }
    }
    weights
}
fn top_four(w: [f64; 15]) -> ([u16; 4], [f32; 4]) {
    let mut order: Vec<_> = (0..15).collect();
    order.sort_by(|&a, &b| w[b].total_cmp(&w[a]).then(a.cmp(&b)));
    let sum: f64 = order[..4].iter().map(|&i| w[i]).sum();
    (
        std::array::from_fn(|k| order[k] as u16),
        std::array::from_fn(|k| (w[order[k]] / sum) as f32),
    )
}
fn append(
    raw: &mut Value,
    bin: &mut Vec<u8>,
    data: &[u8],
    component: u32,
    kind: &str,
    count: usize,
) -> usize {
    while !bin.len().is_multiple_of(4) {
        bin.push(0);
    }
    let offset = bin.len();
    bin.extend(data);
    for key in ["bufferViews", "accessors"] {
        if raw.get(key).is_none() {
            raw[key] = json!([]);
        }
    }
    let views = raw["bufferViews"].as_array_mut().unwrap();
    let view = views.len();
    views.push(json!({"buffer":0,"byteOffset":offset,"byteLength":data.len()}));
    let accessors = raw["accessors"].as_array_mut().unwrap();
    let index = accessors.len();
    accessors.push(json!({"bufferView":view,"componentType":component,"type":kind,"count":count}));
    index
}
fn encode(raw: &Value, bin: &[u8]) -> Vec<u8> {
    let mut json = serde_json::to_vec(raw).unwrap();
    while !json.len().is_multiple_of(4) {
        json.push(b' ');
    }
    let mut bin = bin.to_vec();
    while !bin.len().is_multiple_of(4) {
        bin.push(0);
    }
    let mut out = vec![];
    for n in [
        0x46546c67u32,
        2,
        (28 + json.len() + bin.len()) as u32,
        json.len() as u32,
        0x4e4f534a,
    ] {
        out.extend(n.to_le_bytes());
    }
    out.extend(json);
    out.extend((bin.len() as u32).to_le_bytes());
    out.extend(0x004e4942u32.to_le_bytes());
    out.extend(bin);
    out
}
pub fn generate(bytes: &[u8], request: &Request) -> Result<Output, String> {
    placement::validate(&request.joints)?;
    if !["segment", "surface"].contains(&request.method.as_str()) {
        return Err("Unknown initial-weight method.".into());
    }
    let prepared = placement::prepare(bytes, &request.frame)?;
    let surfaces = surfaces(bytes, &request.frame)?;
    let parts = parts(&surfaces);
    for (id, bone) in &request.rigid {
        if *bone >= 15 || !parts.iter().any(|p| &p.id == id) {
            return Err(
                "Rigid assignment must reference an existing component and one of the 15 joints."
                    .into(),
            );
        }
    }
    let gltf = placement::source(bytes)?;
    let mut raw: Value =
        serde_json::from_slice(crate::framing(bytes)?).map_err(|e| e.to_string())?;
    let mut bin = gltf.blob.unwrap_or_default();
    let first = raw["nodes"].as_array().unwrap().len();
    for i in 0..15 {
        let t: Point = std::array::from_fn(|k| {
            request.joints[i][k] - PARENTS[i].map_or(0., |p| request.joints[p][k])
        });
        let children: Vec<_> = (0..15)
            .filter(|&j| PARENTS[j] == Some(i))
            .map(|j| first + j)
            .collect();
        let mut node = json!({"name":BONES[i],"translation":t});
        if !children.is_empty() {
            node["children"] = json!(children);
        }
        raw["nodes"].as_array_mut().unwrap().push(node);
    }
    let roots = raw["scenes"][0]["nodes"].clone();
    let wrapper = raw["nodes"].as_array().unwrap().len();
    raw["nodes"].as_array_mut().unwrap().push(json!({"name":"Rigloom prepared source","matrix":prepared.matrix.iter().flatten().copied().collect::<Vec<_>>(),"children":roots}));
    raw["scenes"][0]["nodes"] = json!([wrapper, first]);
    raw["skins"] = json!([]);
    let mut clones = BTreeMap::new();
    let mut max_error: f64 = 0.;
    let mut vertices = 0;
    for surface in &surfaces {
        if let std::collections::btree_map::Entry::Vacant(entry) = clones.entry(surface.node) {
            let original = raw["nodes"][surface.node]["mesh"].as_u64().unwrap() as usize;
            let copy = raw["meshes"][original].clone();
            let mesh = raw["meshes"].as_array().unwrap().len();
            raw["meshes"].as_array_mut().unwrap().push(copy);
            raw["nodes"][surface.node]["mesh"] = json!(mesh);
            entry.insert(mesh);
            let mut matrices = vec![];
            for joint in &request.joints {
                let mut inverse = placement::IDENTITY;
                for k in 0..3 {
                    inverse[3][k] = -joint[k];
                }
                for value in placement::multiply(inverse, surface.world).iter().flatten() {
                    matrices.extend((*value as f32).to_le_bytes());
                }
            }
            let ibm = append(&mut raw, &mut bin, &matrices, 5126, "MAT4", 15);
            let skin = raw["skins"].as_array().unwrap().len();
            raw["skins"].as_array_mut().unwrap().push(json!({"joints":(first..first+15).collect::<Vec<_>>(),"skeleton":first,"inverseBindMatrices":ibm}));
            raw["nodes"][surface.node]["skin"] = json!(skin);
        }
        let mut weights = if request.method == "surface" {
            surface_weights(&surface.points, &request.joints, &surface.edges)
        } else {
            prior(&surface.points, &request.joints)
        };
        for (c, indices) in surface.components.iter().enumerate() {
            if let Some(&bone) = request
                .rigid
                .get(&format!("{}:{}:{c}", surface.node, surface.primitive))
            {
                for &i in indices {
                    weights[i] = [0.; 15];
                    weights[i][bone] = 1.;
                }
            }
        }
        let mut joint_bytes = vec![];
        let mut weight_bytes = vec![];
        for w in weights {
            let (j, w) = top_four(w);
            if w.iter().any(|v| !v.is_finite() || *v < 0.) {
                return Err("Weight computation produced an invalid value.".into());
            }
            let error = (w.iter().map(|v| f64::from(*v)).sum::<f64>() - 1.).abs();
            if error > 1e-5 {
                return Err("Weight normalization failed.".into());
            }
            max_error = max_error.max(error);
            for v in j {
                joint_bytes.extend(v.to_le_bytes());
            }
            for v in w {
                weight_bytes.extend(v.to_le_bytes());
            }
        }
        vertices += surface.points.len();
        let ja = append(
            &mut raw,
            &mut bin,
            &joint_bytes,
            5123,
            "VEC4",
            surface.points.len(),
        );
        let wa = append(
            &mut raw,
            &mut bin,
            &weight_bytes,
            5126,
            "VEC4",
            surface.points.len(),
        );
        let attributes = &mut raw["meshes"][clones[&surface.node]]["primitives"][surface.primitive]
            ["attributes"];
        attributes["JOINTS_0"] = json!(ja);
        attributes["WEIGHTS_0"] = json!(wa);
    }
    raw["buffers"][0]["byteLength"] = json!(bin.len());
    let bytes = encode(&raw, &bin);
    let mut mapping: BTreeMap<_, _> = crate::inspect_glb(&bytes)
        .rig
        .ok_or("Generated rig inspection failed")?
        .mapping
        .bones
        .into_iter()
        .map(|b| (b.bone, None))
        .collect();
    for (i, name) in BONES.iter().enumerate() {
        mapping.insert(name.to_string(), Some(first + i));
    }
    let checked = crate::inspect_glb_with_mapping(&bytes, &mapping);
    if !checked.preview_allowed
        || checked
            .rig
            .as_ref()
            .is_none_or(|r| !r.mapping.valid || !r.binds.valid)
    {
        return Err(
            "Generated bind validation failed. Check the frame scale and joint spacing.".into(),
        );
    }
    Ok(Output {bytes,report:Report { algorithm:format!("{}-v{}-experimental",request.method, if request.method == "surface" { 3 } else { 1 }),vertices,components:parts,rigid:request.rigid.clone(),max_weight_sum_error:max_error,unweighted_vertices:0,mapping,
        warnings:vec!["Initial weights need visual review; nearby body parts can receive incorrect influence.".into(),"Diffusion follows triangle indices within each primitive. UV seams, separate clothes and coincident surfaces are not welded or inferred; assign rigid components explicitly where appropriate.".into(),"32 anchored diffusion steps with local support filtering are experimental, not a volumetric solver or final skinning quality.".into()] }})
}

#[cfg(test)]
mod tests {
    use super::*;
    fn fixture() -> Vec<u8> {
        let mut raw = json!({"asset":{"version":"2.0"},"buffers":[{"byteLength":0}],"nodes":[{"mesh":0,"translation":[3,4,5],"scale":[2,3,1]},{"mesh":0,"translation":[-2,0,1]}],"meshes":[{"primitives":[{"attributes":{}}]}],"scenes":[{"nodes":[0,1]}],"scene":0});
        let mut bin = vec![];
        let position = append(
            &mut raw,
            &mut bin,
            &[0f32, 0., 0., 1., 0., 0., 0., 2., 0.]
                .into_iter()
                .flat_map(f32::to_le_bytes)
                .collect::<Vec<_>>(),
            5126,
            "VEC3",
            3,
        );
        raw["accessors"][position]["min"] = json!([0, 0, 0]);
        raw["accessors"][position]["max"] = json!([1, 2, 0]);
        raw["meshes"][0]["primitives"][0]["attributes"]["POSITION"] = json!(position);
        raw["buffers"][0]["byteLength"] = json!(bin.len());
        encode(&raw, &bin)
    }
    fn request(bytes: &[u8]) -> Request {
        let frame = Frame {
            up: "Z".into(),
            turn: 1,
            scale: 0.1,
            floor: false,
        };
        // This planar fixture has zero Z extent, so prepare with X up instead.
        let frame = Frame {
            up: "X".into(),
            ..frame
        };
        let p = placement::prepare(bytes, &frame).unwrap();
        Request {
            frame,
            joints: p.joints,
            method: "surface".into(),
            rigid: BTreeMap::new(),
        }
    }
    #[test]
    fn generated_bind_preserves_transformed_instances_and_original_binary() {
        let input = fixture();
        let before = input.clone();
        let request = request(&input);
        let generated = generate(&input, &request).unwrap();
        assert_eq!(input, before);
        assert_eq!(generated.bytes, generate(&input, &request).unwrap().bytes);
        let source = placement::source(&input).unwrap();
        let result = gltf::Gltf::from_slice(&generated.bytes).unwrap();
        assert!(
            result
                .blob
                .as_ref()
                .unwrap()
                .starts_with(source.blob.as_ref().unwrap())
        );
        let world = placement::worlds(&result);
        let surfaces = surfaces(&input, &request.frame).unwrap();
        assert_eq!(result.skins().len(), 2);
        for node in result.nodes().filter(|n| n.skin().is_some()) {
            let skin = node.skin().unwrap();
            let joints: Vec<_> = skin.joints().map(|n| n.index()).collect();
            let matrices: Vec<_> = skin
                .reader(|_| result.blob.as_deref())
                .read_inverse_bind_matrices()
                .unwrap()
                .collect();
            let surface = surfaces.iter().find(|s| s.node == node.index()).unwrap();
            let mesh = node.mesh().unwrap();
            let primitive = mesh.primitives().next().unwrap();
            let reader = primitive.reader(|_| result.blob.as_deref());
            let positions: Vec<_> = reader.read_positions().unwrap().collect();
            let ids: Vec<_> = reader.read_joints(0).unwrap().into_u16().collect();
            let weights: Vec<_> = reader.read_weights(0).unwrap().into_f32().collect();
            for (i, p) in positions.iter().enumerate() {
                let mut deformed = [0.; 3];
                for k in 0..4 {
                    let j = ids[i][k] as usize;
                    let m = placement::multiply(
                        world[joints[j]].unwrap(),
                        matrices[j].map(|c| c.map(f64::from)),
                    );
                    let q = placement::point(m, p.map(f64::from));
                    for a in 0..3 {
                        deformed[a] += q[a] * f64::from(weights[i][k]);
                    }
                }
                assert!(
                    placement::distance(deformed, surface.points[i]) < 1e-5,
                    "{deformed:?} != {:?}",
                    surface.points[i]
                );
            }
        }
        assert_eq!(generated.report.unweighted_vertices, 0);
        assert!(generated.report.max_weight_sum_error < 1e-6);
    }
    #[test]
    fn rigid_components_are_exact_and_reject_stale_assignments() {
        let input = fixture();
        let mut request = request(&input);
        let parts = list_parts(&input, &request.frame).unwrap();
        assert_eq!(parts.len(), 2);
        request.rigid.insert(parts[0].id.clone(), 11);
        let out = generate(&input, &request).unwrap();
        let gltf = gltf::Gltf::from_slice(&out.bytes).unwrap();
        let primitive = gltf
            .nodes()
            .next()
            .unwrap()
            .mesh()
            .unwrap()
            .primitives()
            .next()
            .unwrap();
        let reader = primitive.reader(|_| gltf.blob.as_deref());
        assert!(
            reader
                .read_weights(0)
                .unwrap()
                .into_f32()
                .all(|w| w == [1., 0., 0., 0.])
        );
        assert!(
            reader
                .read_joints(0)
                .unwrap()
                .into_u16()
                .all(|j| j[0] == 11)
        );
        request.rigid.insert("missing".into(), 0);
        assert!(generate(&input, &request).is_err());
        request.rigid.clear();
        request.rigid.insert(parts[0].id.clone(), 15);
        assert!(generate(&input, &request).is_err());
    }
    #[test]
    fn unsupported_and_existing_data_are_never_replaced() {
        let input = fixture();
        let mut request = request(&input);
        let output = generate(&input, &request).unwrap();
        assert!(
            generate(&output.bytes, &request)
                .err()
                .unwrap()
                .contains("Existing skins")
        );
        request.method = "unknown".into();
        assert!(generate(&input, &request).is_err());
        request.method = "segment".into();
        assert!(generate(&input, &request).is_ok());
        request.joints[2] = request.joints[0];
        assert!(generate(&input, &request).is_err());
        let mut raw: Value = serde_json::from_slice(crate::framing(&input).unwrap()).unwrap();
        raw["meshes"][0]["primitives"][0]["targets"] = json!([{"POSITION":0}]);
        let morph = encode(
            &raw,
            gltf::Gltf::from_slice(&input)
                .unwrap()
                .blob
                .as_ref()
                .unwrap(),
        );
        assert!(
            list_parts(&morph, &Frame::default())
                .err()
                .unwrap()
                .contains("morph")
        );
    }
    #[test]
    fn animation_is_rejected_without_erasing_source_channels() {
        let input = fixture();
        let mut gltf = gltf::Gltf::from_slice(&input).unwrap();
        let mut raw: Value = serde_json::from_slice(crate::framing(&input).unwrap()).unwrap();
        let bin = gltf.blob.as_mut().unwrap();
        let time = append(
            &mut raw,
            bin,
            &[0f32, 1., 2.]
                .into_iter()
                .flat_map(f32::to_le_bytes)
                .collect::<Vec<_>>(),
            5126,
            "SCALAR",
            3,
        );
        raw["accessors"][time]["min"] = json!([0]);
        raw["accessors"][time]["max"] = json!([2]);
        raw["animations"] = json!([{"samplers":[{"input":time,"output":0}],"channels":[{"sampler":0,"target":{"node":0,"path":"translation"}}]}]);
        raw["buffers"][0]["byteLength"] = json!(bin.len());
        let animated = encode(&raw, bin);
        assert!(crate::inspect_glb(&animated).preview_allowed);
        assert!(
            list_parts(&animated, &Frame::default())
                .err()
                .unwrap()
                .contains("without animations")
        );
        assert_eq!(
            gltf::Gltf::from_slice(&animated)
                .unwrap()
                .animations()
                .len(),
            1
        );
    }
    #[test]
    fn smoothing_reduces_edge_variation_without_connecting_nearby_components() {
        // Two spatially adjacent strips remain disconnected by indices. Deliberate alternating
        // prior mimics competing segments; this measures smoothing, not anatomical correctness.
        let mut prior = vec![[0.; 15]; 8];
        for (i, w) in prior.iter_mut().enumerate() {
            w[if i < 4 { i % 2 } else { 5 }] = 1.;
        }
        let edges = vec![
            vec![1],
            vec![0, 2],
            vec![1, 3],
            vec![2],
            vec![5],
            vec![4, 6],
            vec![5, 7],
            vec![6],
        ];
        let out = diffuse(&prior, &edges);
        let variation = |values: &[[f64; 15]]| -> f64 {
            (0..3)
                .map(|i| (values[i][0] - values[i + 1][0]).powi(2))
                .sum()
        };
        println!(
            "strip edge variation: baseline={}, surface={}",
            variation(&prior),
            variation(&out)
        );
        assert!(variation(&out) < variation(&prior) * 0.2);
        assert!(
            out[4..]
                .iter()
                .all(|w| w[5] == 1. && w[0] == 0. && w[1] == 0.)
        );
        for w in out {
            let (j, w) = top_four(w);
            assert!(j.iter().all(|j| *j < 15));
            assert!((w.iter().sum::<f32>() - 1.).abs() < 1e-6);
        }
    }
    #[test]
    fn compact_prior_reduces_remote_motion_without_hardening_the_elbow() {
        let joints = vec![
            [0., 1., 0.],
            [0., 1.2, 0.],
            [0., 1.7, 0.],
            [0.1, 1., 0.],
            [0.1, 0.5, 0.],
            [0.1, 0., 0.],
            [-0.1, 1., 0.],
            [-0.1, 0.5, 0.],
            [-0.1, 0., 0.],
            [0.2, 1.5, 0.],
            [0.5, 1.5, 0.],
            [0.8, 1.5, 0.],
            [-0.2, 1.5, 0.],
            [-0.5, 1.5, 0.],
            [-0.8, 1.5, 0.],
        ];
        // Original cylinder surface samples on the upper arm, elbow and lower arm.
        let points: Vec<_> = (0..41).map(|i| [0.3 + i as f64 * 0.01, 1.54, 0.]).collect();
        let old = prior(&points, &joints);
        let new = distance_prior(&points, &joints, true);
        // Opposite arm motion must no longer pull this strip when its support is distant.
        let remote = |v: &[[f64; 15]]| v.iter().map(|w| w[12] + w[13] + w[14]).sum::<f64>();
        assert!(remote(&old) > 0.);
        assert_eq!(remote(&new), 0.);
        assert!(new[20][9] > 0.4 && new[20][10] > 0.4);
        // No nearest-label step at the elbow; retain a smooth upper/lower transition.
        assert!(new.windows(2).all(|w| (w[0][10] - w[1][10]).abs() < 0.3));
        for w in &new {
            assert!((w.iter().sum::<f64>() - 1.).abs() < 1e-12);
        }
        // Uniform model scaling must not change the weights.
        let scaled_points: Vec<_> = points.iter().map(|p| p.map(|v| v * 10.)).collect();
        let scaled_joints: Vec<_> = joints.iter().map(|p| p.map(|v| v * 10.)).collect();
        let scaled = distance_prior(&scaled_points, &scaled_joints, true);
        assert!(
            new.iter()
                .zip(scaled)
                .all(|(a, b)| a.iter().zip(b).all(|(x, y)| (x - y).abs() < 1e-12))
        );
        // A remote accessory has no reliable anatomical proximity: do not sharpen its guess.
        let far = [[2., 2., 2.]];
        assert_eq!(prior(&far, &joints), distance_prior(&far, &joints, true));
    }
    fn probe_joints() -> Vec<Point> {
        vec![
            [0., 1., 0.],
            [0., 1.2, 0.],
            [0., 1.7, 0.],
            [0.1, 1., 0.],
            [0.1, 0.5, 0.],
            [0.1, 0., 0.],
            [-0.1, 1., 0.],
            [-0.1, 0.5, 0.],
            [-0.1, 0., 0.],
            [0.2, 1.5, 0.],
            [0.5, 1.5, 0.],
            [0.8, 1.5, 0.],
            [-0.2, 1.5, 0.],
            [-0.5, 1.5, 0.],
            [-0.8, 1.5, 0.],
        ]
    }
    #[test]
    fn surface_support_removes_remote_influence_reintroduced_by_edges() {
        let joints = probe_joints();
        // Original coarse triangle spans left/right arm probes. Its edge mean
        // reintroduces opposite-arm mass despite the zero compact-distance prior.
        let points = [[0.65, 1.54, 0.], [0.66, 1.54, 0.], [-0.65, 1.54, 0.]];
        let edges = vec![vec![1, 2], vec![0, 2], vec![0, 1]];
        let baseline = diffuse(&distance_prior(&points, &joints, true), &edges);
        let output = surface_weights(&points, &joints, &edges);
        let remote = |w: &[f64; 15]| w[12] + w[13] + w[14];
        assert!(remote(&baseline[0]) > 0.1);
        assert_eq!(remote(&output[0]), 0.);
        assert!(output[0][10] > 0.9);
        assert_eq!(output, surface_weights(&points, &joints, &edges));
        for w in output {
            assert!(w.iter().all(|v| v.is_finite() && *v >= 0.));
            assert!((w.iter().sum::<f64>() - 1.).abs() < 1e-12);
            let (ids, values) = top_four(w);
            assert!(ids.iter().all(|i| *i < 15));
            assert!((values.iter().sum::<f32>() - 1.).abs() < 1e-6);
        }
    }
    #[test]
    fn surface_support_preserves_elbow_blending_continuity_and_scale() {
        let joints = probe_joints();
        let points: Vec<_> = (0..401)
            .map(|i| [0.3 + i as f64 * 0.001, 1.54, 0.])
            .collect();
        let edges: Vec<Vec<usize>> = (0..points.len())
            .map(|i| {
                [i.checked_sub(1), (i + 1 < points.len()).then_some(i + 1)]
                    .into_iter()
                    .flatten()
                    .collect()
            })
            .collect();
        let output = surface_weights(&points, &joints, &edges);
        assert!(output[200][9] > 0.4 && output[200][10] > 0.4);
        assert!(
            output
                .windows(2)
                .all(|w| w[0].iter().zip(w[1]).all(|(a, b)| (a - b).abs() < 0.03))
        );
        for scale in [0.1, 10.] {
            let p: Vec<_> = points.iter().map(|p| p.map(|v| v * scale)).collect();
            let j: Vec<_> = joints.iter().map(|p| p.map(|v| v * scale)).collect();
            let scaled = surface_weights(&p, &j, &edges);
            assert!(
                output
                    .iter()
                    .zip(scaled)
                    .all(|(a, b)| a.iter().zip(b).all(|(x, y)| (x - y).abs() < 1e-12))
            );
        }
    }
    #[test]
    fn surface_support_preserves_far_fallback_and_does_not_join_components() {
        let joints = probe_joints();
        let far = [[2., 2., 2.], [2.1, 2., 2.], [2., 2.1, 2.]];
        let edges = vec![vec![1, 2], vec![0, 2], vec![0, 1]];
        assert_eq!(
            surface_weights(&far, &joints, &edges),
            diffuse(&distance_prior(&far, &joints, true), &edges)
        );
        let points = [[0.65, 1.54, 0.], [0.66, 1.54, 0.], [0.65, 1.54, 0.]];
        let separate = vec![vec![1], vec![0], vec![]];
        let before = surface_weights(&points, &joints, &separate);
        let mut moved = points;
        moved[2] = [-0.65, 1.54, 0.];
        let after = surface_weights(&moved, &joints, &separate);
        assert_eq!(before[..2], after[..2]);
        let mut edited = joints.clone();
        edited[10][2] += 0.08;
        let edited_weights = surface_weights(&points, &edited, &separate);
        assert_ne!(edited_weights, before);
        assert!(
            edited_weights
                .iter()
                .all(|w| w.iter().all(|v| v.is_finite() && *v >= 0.)
                    && (w.iter().sum::<f64>() - 1.).abs() < 1e-12)
        );
    }
    #[test]
    fn nearby_segments_can_still_leak_and_are_not_claimed_correct() {
        let input = fixture();
        let request = request(&input);
        let p = request.joints[10];
        let weights = prior(&[p], &request.joints);
        // At an elbow the upper/lower segments meet: neither a hard nearest label nor smoothing
        // can infer the artist's intended crease from distance alone.
        assert!(weights[0][9] > 0.1 && weights[0][10] > 0.1);
        assert!(
            generate(&input, &request).unwrap().report.warnings[0].contains("incorrect influence")
        );
    }
}

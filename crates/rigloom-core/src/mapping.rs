//! Deterministic, reviewable semantic suggestions; node references remain source indices.
//! VRM 1.0 hierarchy reference (not vendored schema/code): vrm-c/vrm-specification
//! 94e82dd346fa6cf0337c4421728640e5252dd38e/specification/VRMC_vrm-1.0/humanoid.md.
use crate::{Diagnostic, Severity};
use serde::Serialize;
use std::collections::{BTreeMap, BTreeSet};

#[derive(Debug, Serialize)]
pub struct BoneMapping {
    pub bone: String,
    pub required: bool,
    pub node: Option<usize>,
    pub candidates: Vec<usize>,
}

#[derive(Debug, Serialize)]
pub struct MappingReview {
    pub valid: bool,
    pub bones: Vec<BoneMapping>,
    pub diagnostics: Vec<Diagnostic>,
}

struct Bone {
    name: &'static str,
    parent: Option<&'static str>,
    required: bool,
    needs_parent: bool,
}

fn definitions() -> Vec<Bone> {
    // A missing optional parent is skipped, except where VRM requires that segment.
    let mut bones: Vec<_> = [
        ("hips", None, true, false),
        ("spine", Some("hips"), true, false),
        ("chest", Some("spine"), false, false),
        ("upperChest", Some("chest"), false, true),
        ("neck", Some("upperChest"), false, false),
        ("head", Some("neck"), true, false),
        ("leftEye", Some("head"), false, false),
        ("rightEye", Some("head"), false, false),
        ("jaw", Some("head"), false, false),
        ("leftUpperLeg", Some("hips"), true, false),
        ("leftLowerLeg", Some("leftUpperLeg"), true, false),
        ("leftFoot", Some("leftLowerLeg"), true, false),
        ("leftToes", Some("leftFoot"), false, false),
        ("rightUpperLeg", Some("hips"), true, false),
        ("rightLowerLeg", Some("rightUpperLeg"), true, false),
        ("rightFoot", Some("rightLowerLeg"), true, false),
        ("rightToes", Some("rightFoot"), false, false),
        ("leftShoulder", Some("upperChest"), false, false),
        ("leftUpperArm", Some("leftShoulder"), true, false),
        ("leftLowerArm", Some("leftUpperArm"), true, false),
        ("leftHand", Some("leftLowerArm"), true, false),
        ("rightShoulder", Some("upperChest"), false, false),
        ("rightUpperArm", Some("rightShoulder"), true, false),
        ("rightLowerArm", Some("rightUpperArm"), true, false),
        ("rightHand", Some("rightLowerArm"), true, false),
    ]
    .into_iter()
    .map(|(name, parent, required, needs_parent)| Bone {
        name,
        parent,
        required,
        needs_parent,
    })
    .collect();
    for chain in [
        [
            "leftHand",
            "leftThumbMetacarpal",
            "leftThumbProximal",
            "leftThumbDistal",
        ],
        [
            "leftHand",
            "leftIndexProximal",
            "leftIndexIntermediate",
            "leftIndexDistal",
        ],
        [
            "leftHand",
            "leftMiddleProximal",
            "leftMiddleIntermediate",
            "leftMiddleDistal",
        ],
        [
            "leftHand",
            "leftRingProximal",
            "leftRingIntermediate",
            "leftRingDistal",
        ],
        [
            "leftHand",
            "leftLittleProximal",
            "leftLittleIntermediate",
            "leftLittleDistal",
        ],
        [
            "rightHand",
            "rightThumbMetacarpal",
            "rightThumbProximal",
            "rightThumbDistal",
        ],
        [
            "rightHand",
            "rightIndexProximal",
            "rightIndexIntermediate",
            "rightIndexDistal",
        ],
        [
            "rightHand",
            "rightMiddleProximal",
            "rightMiddleIntermediate",
            "rightMiddleDistal",
        ],
        [
            "rightHand",
            "rightRingProximal",
            "rightRingIntermediate",
            "rightRingDistal",
        ],
        [
            "rightHand",
            "rightLittleProximal",
            "rightLittleIntermediate",
            "rightLittleDistal",
        ],
    ] {
        for i in 1..chain.len() {
            bones.push(Bone {
                name: chain[i],
                parent: Some(chain[i - 1]),
                required: false,
                needs_parent: i > 1,
            });
        }
    }
    bones
}

fn normalized(name: &str) -> String {
    // Namespace/path separators are exporter conventions, not character identifiers.
    name.rsplit([':', '|', '/'])
        .next()
        .unwrap_or(name)
        .chars()
        .filter(char::is_ascii_alphanumeric)
        .map(|c| c.to_ascii_lowercase())
        .collect()
}

fn aliases(bone: &str) -> BTreeSet<String> {
    let mut names = BTreeSet::from([normalized(bone)]);
    if bone == "hips" {
        names.insert("pelvis".into());
    }
    let side = bone
        .strip_prefix("left")
        .map(|stem| ("left", "l", stem))
        .or_else(|| bone.strip_prefix("right").map(|stem| ("right", "r", stem)));
    if let Some((long, short, stem)) = side {
        let stem = stem.to_ascii_lowercase();
        let variants: Vec<&str> = match stem.as_str() {
            "upperleg" => vec!["upperleg", "thigh"],
            "lowerleg" => vec!["lowerleg", "shin", "calf"],
            "foot" => vec!["foot", "ankle"],
            "toes" => vec!["toes", "toe", "toebase"],
            "shoulder" => vec!["shoulder", "clavicle"],
            "upperarm" => vec!["upperarm", "arm"],
            "lowerarm" => vec!["lowerarm", "forearm"],
            "hand" => vec!["hand", "wrist"],
            _ => vec![stem.as_str()],
        };
        for variant in variants {
            for side in [long, short] {
                names.insert(format!("{side}{variant}"));
                names.insert(format!("{variant}{side}"));
            }
        }
    }
    names
}

impl MappingReview {
    fn issue(&mut self, severity: Severity, code: &str, bone: &str, message: String, remedy: &str) {
        self.diagnostics.push(Diagnostic {
            severity,
            code: code.into(),
            path: format!("/mapping/{bone}"),
            message,
            remedy: remedy.into(),
        });
    }
}

/// Review source node references without rewriting geometry, transforms or skin data.
/// Call after structural glTF validation. Explicit null overrides intentionally unassign a bone.
pub fn review(gltf: &gltf::Gltf, overrides: &BTreeMap<String, Option<usize>>) -> MappingReview {
    let definitions = definitions();
    let nodes: Vec<_> = gltf.nodes().collect();
    let mut parents = vec![None; nodes.len()];
    for node in &nodes {
        for child in node.children() {
            parents[child.index()] = Some(node.index());
        }
    }
    let mut reachable = vec![false; nodes.len()];
    let mut queue: Vec<_> = gltf
        .scenes()
        .flat_map(|scene| scene.nodes().map(|node| node.index()))
        .collect();
    while let Some(index) = queue.pop() {
        if reachable[index] {
            continue;
        }
        reachable[index] = true;
        queue.extend(nodes[index].children().map(|node| node.index()));
    }
    let mut report = MappingReview {
        valid: false,
        bones: vec![],
        diagnostics: vec![],
    };
    for key in overrides.keys() {
        if !definitions.iter().any(|bone| bone.name == key) {
            report.issue(
                Severity::Error,
                "mapping_unknown_bone",
                key,
                format!("{key} is not a VRM 1.0 humanoid bone key."),
                "Use a canonical VRM 1.0 semantic key; preserve custom names in the source model.",
            );
        }
    }
    for definition in &definitions {
        let aliases = aliases(definition.name);
        let candidates: Vec<_> = nodes
            .iter()
            .filter(|node| {
                reachable[node.index()]
                    && node
                        .name()
                        .is_some_and(|name| aliases.contains(&normalized(name)))
            })
            .map(|node| node.index())
            .collect();
        let node = overrides
            .get(definition.name)
            .copied()
            .unwrap_or_else(|| (candidates.len() == 1).then(|| candidates[0]));
        if candidates.len() > 1 && !overrides.contains_key(definition.name) {
            report.issue(
                Severity::Warning,
                "mapping_ambiguous",
                definition.name,
                format!(
                    "Multiple name matches for {}: {candidates:?}; none was selected.",
                    definition.name
                ),
                "Choose the intended source node manually.",
            );
        }
        if definition.required && node.is_none() {
            report.issue(Severity::Error, "mapping_required", definition.name, format!("Required humanoid bone {} is unassigned.", definition.name), "Assign the existing source node. A missing joint requires a separate rigging step.");
        }
        report.bones.push(BoneMapping {
            bone: definition.name.into(),
            required: definition.required,
            node,
            candidates,
        });
    }
    let assigned: BTreeMap<_, _> = report
        .bones
        .iter()
        .map(|bone| (bone.bone.clone(), bone.node))
        .collect();
    let mut owners = BTreeMap::<usize, String>::new();
    for definition in &definitions {
        let Some(node) = assigned[definition.name] else {
            continue;
        };
        if let Some(other) = owners.insert(node, definition.name.into()) {
            report.issue(
                Severity::Error,
                "mapping_duplicate",
                definition.name,
                format!(
                    "Source node {node} is assigned to both {other} and {}.",
                    definition.name
                ),
                "Assign each humanoid bone to a distinct source node.",
            );
        }
        if node >= nodes.len() {
            report.issue(
                Severity::Error,
                "mapping_node",
                definition.name,
                format!("Source node {node} does not exist."),
                "Choose a node from the current source model.",
            );
            continue;
        }
        if !reachable[node] {
            report.issue(
                Severity::Error,
                "mapping_scene",
                definition.name,
                format!("Source node {node} is not reachable from the source scene."),
                "Use a node in the character scene or repair the source scene hierarchy.",
            );
        }
        let positive_scale = match nodes[node].transform() {
            gltf::scene::Transform::Decomposed { scale, .. } => {
                scale.iter().all(|s| s.is_finite() && *s > 0.0)
            }
            gltf::scene::Transform::Matrix { matrix: m } => {
                // A matrix has no unique signed TRS decomposition. Require a finite,
                // orientation-preserving basis; explicit TRS negative scales fail above.
                let determinant = (m[0][0] as f64)
                    * ((m[1][1] as f64) * (m[2][2] as f64) - (m[2][1] as f64) * (m[1][2] as f64))
                    - (m[1][0] as f64)
                        * ((m[0][1] as f64) * (m[2][2] as f64)
                            - (m[2][1] as f64) * (m[0][2] as f64))
                    + (m[2][0] as f64)
                        * ((m[0][1] as f64) * (m[1][2] as f64)
                            - (m[1][1] as f64) * (m[0][2] as f64));
                m.iter().flatten().all(|v| v.is_finite()) && determinant > 0.0
            }
        };
        if !positive_scale {
            report.issue(Severity::Error, "mapping_scale", definition.name, format!("Humanoid node {node} has nonpositive or nonfinite scale."), "Repair the rest transform in the source exporter; VRM humanoid scale must be positive.");
        }
        if definition.needs_parent
            && definition
                .parent
                .is_some_and(|parent| assigned[parent].is_none())
        {
            report.issue(
                Severity::Error,
                "mapping_parent",
                definition.name,
                format!(
                    "{} requires an assigned {} bone.",
                    definition.name,
                    definition.parent.unwrap()
                ),
                "Assign the required preceding semantic segment or unassign this optional bone.",
            );
        }
    }
    for definition in &definitions {
        let Some(node) = assigned[definition.name].filter(|index| *index < nodes.len()) else {
            continue;
        };
        let mut expected = definition.parent;
        while let Some(parent) = expected {
            if assigned[parent].is_some() {
                break;
            }
            expected = definitions
                .iter()
                .find(|bone| bone.name == parent)
                .and_then(|bone| bone.parent);
        }
        let mut ancestor = parents[node];
        let mut actual = None;
        // Structural inspection rejects cycles; bound the walk for direct native callers too.
        for _ in 0..nodes.len() {
            let Some(index) = ancestor else {
                break;
            };
            if let Some(owner) = owners.get(&index) {
                actual = Some(owner.as_str());
                break;
            }
            ancestor = parents[index];
        }
        if actual != expected {
            report.issue(Severity::Error, "mapping_hierarchy", definition.name, format!("{} expects nearest mapped ancestor {expected:?}, but node {node} has {actual:?}.", definition.name), "Correct the semantic mapping or the source hierarchy. Unmapped helper nodes between bones are allowed.");
        }
    }
    report.valid = !report
        .diagnostics
        .iter()
        .any(|diagnostic| diagnostic.severity == Severity::Error);
    report
}

use rigloom_core::mapping::{MappingReview, review};
use serde_json::{Value, json};
use std::collections::BTreeMap;

fn model() -> Value {
    json!({
        "asset": {"version": "2.0"}, "scene": 0, "scenes": [{"nodes": [0]}],
        "nodes": [
            {"name": "hips", "children": [1, 9, 12]},
            {"name": "spine", "children": [2, 3, 6]},
            {"name": "head"},
            {"name": "leftUpperArm", "children": [4]},
            {"name": "leftLowerArm", "children": [5]},
            {"name": "leftHand"},
            {"name": "rightUpperArm", "children": [7]},
            {"name": "rightLowerArm", "children": [8]},
            {"name": "rightHand"},
            {"name": "leftUpperLeg", "children": [10]},
            {"name": "leftLowerLeg", "children": [11]},
            {"name": "leftFoot"},
            {"name": "rightUpperLeg", "children": [13]},
            {"name": "rightLowerLeg", "children": [14]},
            {"name": "rightFoot"}
        ]
    })
}
fn inspect(document: &Value, overrides: &BTreeMap<String, Option<usize>>) -> MappingReview {
    let bytes = serde_json::to_vec(document).unwrap();
    let gltf = gltf::Gltf::from_slice(&bytes).unwrap();
    review(&gltf, overrides)
}
fn code(report: &MappingReview, expected: &str) {
    assert!(
        report.diagnostics.iter().any(|d| d.code == expected),
        "{report:?}"
    );
}
fn node(report: &MappingReview, bone: &str) -> Option<usize> {
    report.bones.iter().find(|b| b.bone == bone).unwrap().node
}

#[test]
fn required_bones_map_with_skipped_optional_ancestors() {
    let report = inspect(&model(), &BTreeMap::new());
    assert!(report.valid, "{report:?}");
    assert_eq!(report.bones.len(), 55);
    assert_eq!(report.bones.iter().filter(|b| b.required).count(), 15);
    assert_eq!(node(&report, "head"), Some(2));
    assert_eq!(node(&report, "leftIndexProximal"), None);
}
#[test]
fn general_semantic_aliases_and_namespaces_do_not_need_character_rules() {
    let mut doc = model();
    for (index, name) in [
        (0, "Armature|pelvis"),
        (3, "skeleton:upper_arm.L"),
        (4, "L_forearm"),
        (9, "thigh_left"),
        (10, "left_shin"),
    ] {
        doc["nodes"][index]["name"] = json!(name);
    }
    let report = inspect(&doc, &BTreeMap::new());
    assert!(report.valid, "{report:?}");
    assert_eq!(node(&report, "hips"), Some(0));
    assert_eq!(node(&report, "leftLowerArm"), Some(4));
}
#[test]
fn helper_ancestors_are_allowed() {
    let mut doc = model();
    doc["nodes"][1]["children"] = json!([2, 15, 6]);
    doc["nodes"]
        .as_array_mut()
        .unwrap()
        .push(json!({"name":"helper", "children":[3]}));
    let report = inspect(&doc, &BTreeMap::new());
    assert!(report.valid, "{report:?}");
}
#[test]
fn multiple_matches_require_an_explicit_choice() {
    let mut doc = model();
    doc["scenes"][0]["nodes"] = json!([0, 15]);
    doc["nodes"]
        .as_array_mut()
        .unwrap()
        .push(json!({"name":"pelvis"}));
    let report = inspect(&doc, &BTreeMap::new());
    assert_eq!(node(&report, "hips"), None);
    code(&report, "mapping_ambiguous");
    code(&report, "mapping_required");
    let report = inspect(&doc, &BTreeMap::from([("hips".into(), Some(0))]));
    assert!(report.valid, "{report:?}");
    assert!(
        !report
            .diagnostics
            .iter()
            .any(|d| d.code == "mapping_ambiguous")
    );
}
#[test]
fn null_overrides_do_not_regenerate_suggestions() {
    let report = inspect(&model(), &BTreeMap::from([("hips".into(), None)]));
    assert_eq!(node(&report, "hips"), None);
    assert!(!report.valid);
    code(&report, "mapping_required");
}
#[test]
fn references_must_be_distinct_exist_and_use_canonical_keys() {
    let report = inspect(
        &model(),
        &BTreeMap::from([
            ("leftHand".into(), Some(8)),
            ("head".into(), Some(999)),
            ("LeftArm".into(), Some(3)),
        ]),
    );
    assert!(!report.valid);
    code(&report, "mapping_duplicate");
    code(&report, "mapping_node");
    code(&report, "mapping_unknown_bone");
}
#[test]
fn disconnected_source_nodes_are_not_suggested_or_accepted() {
    let mut doc = model();
    doc["nodes"][2]["name"] = json!("unnamed");
    doc["nodes"]
        .as_array_mut()
        .unwrap()
        .push(json!({"name":"head"}));
    let suggested = inspect(&doc, &BTreeMap::new());
    assert_eq!(node(&suggested, "head"), None);
    let manual = inspect(&doc, &BTreeMap::from([("head".into(), Some(15))]));
    code(&manual, "mapping_scene");
    assert!(!manual.valid);
}
#[test]
fn wrong_branch_and_intervening_mapped_bones_are_rejected() {
    let mut doc = model();
    doc["nodes"][1]["children"] = json!([2, 6]);
    doc["nodes"][2]["children"] = json!([3]);
    let report = inspect(&doc, &BTreeMap::new());
    // spine is still an ancestor, but head is an invalid intervening mapped ancestor.
    assert!(!report.valid);
    code(&report, "mapping_hierarchy");
}
#[test]
fn upper_chest_requires_chest_and_finger_segments_require_their_parent() {
    let mut doc = model();
    doc["nodes"][1]["children"] = json!([15]);
    doc["nodes"]
        .as_array_mut()
        .unwrap()
        .push(json!({"name":"upperChest","children":[2,3,6]}));
    doc["nodes"][5]["children"] = json!([16]);
    doc["nodes"]
        .as_array_mut()
        .unwrap()
        .push(json!({"name":"leftIndexDistal"}));
    let report = inspect(&doc, &BTreeMap::new());
    assert!(!report.valid);
    assert_eq!(
        report
            .diagnostics
            .iter()
            .filter(|d| d.code == "mapping_parent")
            .count(),
        2
    );
}
#[test]
fn complete_optional_finger_chain_is_mapping_data_only() {
    let mut doc = model();
    doc["nodes"][5]["children"] = json!([15]);
    doc["nodes"].as_array_mut().unwrap().extend([
        json!({"name":"leftThumbMetacarpal","children":[16]}),
        json!({"name":"leftThumbProximal","children":[17]}),
        json!({"name":"leftThumbDistal"}),
    ]);
    let report = inspect(&doc, &BTreeMap::new());
    assert!(report.valid, "{report:?}");
    assert_eq!(node(&report, "leftThumbDistal"), Some(17));
}
#[test]
fn humanoid_scales_must_be_positive() {
    for scale in [[-1.0, 1.0, 1.0], [-1.0, -1.0, 1.0], [0.0, 1.0, 1.0]] {
        let mut doc = model();
        doc["nodes"][2]["scale"] = json!(scale);
        let report = inspect(&doc, &BTreeMap::new());
        assert!(!report.valid);
        code(&report, "mapping_scale");
    }
    let mut doc = model();
    doc["nodes"][0]["translation"] = json!([3.0, 2.0, -1.0]);
    doc["nodes"][0]["scale"] = json!([0.5, 2.0, 1.0]);
    assert!(inspect(&doc, &BTreeMap::new()).valid);
}
#[test]
fn manual_mapping_json_round_trip_is_deterministic_and_preserves_source() {
    let mut doc = model();
    doc["nodes"][0]["name"] = json!("custom root");
    let original = doc.clone();
    let first = inspect(&doc, &BTreeMap::from([("hips".into(), Some(0))]));
    assert!(first.valid, "{first:?}");
    let data: BTreeMap<_, _> = first
        .bones
        .iter()
        .map(|b| (b.bone.clone(), b.node))
        .collect();
    let json = serde_json::to_string(&data).unwrap();
    let restored = serde_json::from_str(&json).unwrap();
    let second = inspect(&doc, &restored);
    assert_eq!(
        serde_json::to_string(&first).unwrap(),
        serde_json::to_string(&second).unwrap()
    );
    assert_eq!(doc, original);
}

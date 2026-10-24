use rigloom_core::bind::{BindValidation, validate};
use serde_json::{Value, json};

// Original fixtures: two translated joints, a triangle and independently
// constructed inverse translations. No third-party model data.
fn fixture() -> (Value, Vec<u8>) {
    let mut bin = vec![];
    for n in [0f32, 0., 0., 1., 0., 0., 0., 1., 0.] {
        bin.extend(n.to_le_bytes());
    }
    bin.extend([0; 24]);
    for _ in 0..3 {
        for n in [1f32, 0., 0., 0.] {
            bin.extend(n.to_le_bytes());
        }
    }
    for x in [2f32, 3.] {
        for n in [
            1., 0., 0., 0., 0., 1., 0., 0., 0., 0., 1., 0., -x, -3., -4., 1.,
        ] {
            bin.extend(n.to_le_bytes());
        }
    }
    let doc = json!({
        "asset":{"version":"2.0"}, "scene":0, "scenes":[{"nodes":[0,1]}],
        "nodes":[{"mesh":0,"skin":0,"translation":[7,8,9]}, {"name":"hips","translation":[2,3,4],"children":[2]}, {"name":"spine","translation":[1,0,0]}],
        "meshes":[{"primitives":[{"attributes":{"POSITION":0,"JOINTS_0":1,"WEIGHTS_0":2}}]}],
        "skins":[{"joints":[1,2],"skeleton":1,"inverseBindMatrices":3}],
        "buffers":[{"byteLength":bin.len()}],
        "bufferViews":[{"buffer":0,"byteOffset":0,"byteLength":36},{"buffer":0,"byteOffset":36,"byteLength":24},{"buffer":0,"byteOffset":60,"byteLength":48},{"buffer":0,"byteOffset":108,"byteLength":128}],
        "accessors":[
            {"bufferView":0,"componentType":5126,"count":3,"type":"VEC3","min":[0,0,0],"max":[1,1,0]},
            {"bufferView":1,"componentType":5123,"count":3,"type":"VEC4"},
            {"bufferView":2,"componentType":5126,"count":3,"type":"VEC4"},
            {"bufferView":3,"componentType":5126,"count":2,"type":"MAT4"}
        ]
    });
    (doc, bin)
}
fn glb(doc: &Value, binary: &[u8]) -> Vec<u8> {
    let mut json = serde_json::to_vec(doc).unwrap();
    while !json.len().is_multiple_of(4) {
        json.push(b' ');
    }
    let mut bin = binary.to_vec();
    while !bin.len().is_multiple_of(4) {
        bin.push(0);
    }
    let mut bytes = b"glTF".to_vec();
    bytes.extend(2u32.to_le_bytes());
    bytes.extend(((28 + json.len() + bin.len()) as u32).to_le_bytes());
    bytes.extend((json.len() as u32).to_le_bytes());
    bytes.extend(0x4e4f534au32.to_le_bytes());
    bytes.extend(json);
    bytes.extend((bin.len() as u32).to_le_bytes());
    bytes.extend(0x004e4942u32.to_le_bytes());
    bytes.extend(bin);
    bytes
}
fn check(doc: &Value, bin: &[u8]) -> BindValidation {
    validate(&gltf::Gltf::from_slice(&glb(doc, bin)).unwrap())
}
fn has(doc: &Value, bin: &[u8], code: &str) {
    let result = check(doc, bin);
    assert!(!result.valid, "{result:?}");
    assert!(
        result.diagnostics.iter().any(|d| d.code == code),
        "{result:?}"
    );
}
fn float(bin: &mut [u8], at: usize, value: f32) {
    bin[at..at + 4].copy_from_slice(&value.to_le_bytes());
}

#[test]
fn translated_joints_and_nonidentity_mesh_transforms_preserve_consistency() {
    let (doc, bin) = fixture();
    let before = glb(&doc, &bin);
    let result = check(&doc, &bin);
    assert!(result.valid, "{result:?}");
    assert_eq!(result.skins[0].neutral_consistency, "consistent");
    assert_eq!(result.skins[0].max_joint_rest_difference, Some(0.));
    assert_eq!(before, glb(&doc, &bin));
    assert_eq!(
        serde_json::to_string(&result).unwrap(),
        serde_json::to_string(&check(&doc, &bin)).unwrap()
    );
}
#[test]
fn same_skin_on_multiple_mesh_nodes_does_not_require_equal_mesh_transforms() {
    let (mut doc, bin) = fixture();
    doc["nodes"]
        .as_array_mut()
        .unwrap()
        .push(json!({"mesh":0,"skin":0,"translation":[-11,4,8],"scale":[2,3,4]}));
    doc["scenes"][0]["nodes"] = json!([0, 1, 3]);
    let result = check(&doc, &bin);
    assert!(result.valid, "{result:?}");
    assert_eq!(result.skins[0].mesh_nodes, vec![0, 3]);
    assert_eq!(result.skins[0].neutral_consistency, "consistent");
}
#[test]
fn common_nonidentity_bind_shape_is_not_a_bind_error() {
    let (doc, mut bin) = fixture();
    // Pre-multiplied common bind-shape translation +10 X.
    float(&mut bin, 108 + 48, 8.);
    float(&mut bin, 172 + 48, 7.);
    let result = check(&doc, &bin);
    assert!(result.valid, "{result:?}");
    assert_eq!(result.skins[0].neutral_consistency, "consistent");
}
#[test]
fn unequal_joint_rest_products_require_review_without_rewriting_pose() {
    let (doc, mut bin) = fixture();
    float(&mut bin, 172 + 48, -2.);
    let before = bin.clone();
    let result = check(&doc, &bin);
    assert!(result.valid, "{result:?}");
    assert_eq!(result.skins[0].neutral_consistency, "review_required");
    assert!(
        result
            .diagnostics
            .iter()
            .any(|d| d.code == "bind_rest_review")
    );
    assert_eq!(bin, before);
}
#[test]
fn omitted_inverse_binds_are_identity() {
    let (mut doc, bin) = fixture();
    doc["skins"][0]
        .as_object_mut()
        .unwrap()
        .remove("inverseBindMatrices");
    doc["nodes"][1]
        .as_object_mut()
        .unwrap()
        .remove("translation");
    doc["nodes"][2]
        .as_object_mut()
        .unwrap()
        .remove("translation");
    let result = check(&doc, &bin);
    assert!(result.valid, "{result:?}");
    assert_eq!(result.skins[0].neutral_consistency, "consistent");
}
#[test]
fn inverse_bind_count_may_exceed_joint_count() {
    let (mut doc, mut bin) = fixture();
    bin.extend_from_within(108..172);
    doc["buffers"][0]["byteLength"] = json!(bin.len());
    doc["bufferViews"][3]["byteLength"] = json!(192);
    doc["accessors"][3]["count"] = json!(3);
    assert!(check(&doc, &bin).valid);
    doc["accessors"][3]["count"] = json!(1);
    has(&doc, &bin, "inverse_bind_count");
}
#[test]
fn malformed_inverse_bind_layout_is_checked_before_binary_reader() {
    for (shape, component, normalized) in [
        ("VEC4", 5126, false),
        ("MAT4", 5123, false),
        ("MAT4", 5126, true),
    ] {
        let (mut doc, bin) = fixture();
        doc["accessors"][3]["type"] = json!(shape);
        doc["accessors"][3]["componentType"] = json!(component);
        doc["accessors"][3]["normalized"] = json!(normalized);
        has(&doc, &bin, "inverse_bind_layout");
    }
}
#[test]
fn rejects_nonfinite_nonaffine_and_singular_inverse_binds() {
    for (offset, value, code) in [
        (108, f32::NAN, "inverse_bind_matrix"),
        (120, 1., "inverse_bind_matrix"),
        (108, 0., "singular_inverse_bind"),
    ] {
        let (doc, mut bin) = fixture();
        float(&mut bin, offset, value);
        has(&doc, &bin, code);
    }
}
#[test]
fn rejects_nonunit_rotation_and_singular_joint_transform() {
    let (mut doc, bin) = fixture();
    doc["nodes"][1]["rotation"] = json!([0, 0, 0, 2]);
    has(&doc, &bin, "rest_rotation");
    doc["nodes"][1].as_object_mut().unwrap().remove("rotation");
    doc["nodes"][1]["scale"] = json!([1, 0, 1]);
    has(&doc, &bin, "singular_joint_transform");
}
#[test]
fn rejects_duplicate_joints_invalid_skeleton_and_detached_joints() {
    let (mut doc, bin) = fixture();
    doc["skins"][0]["joints"] = json!([1, 1]);
    has(&doc, &bin, "duplicate_skin_joint");
    doc["skins"][0]["joints"] = json!([1, 2]);
    doc["skins"][0]["skeleton"] = json!(2);
    has(&doc, &bin, "skin_skeleton_root");
    doc["skins"][0]["skeleton"] = json!(1);
    doc["nodes"][1].as_object_mut().unwrap().remove("children");
    has(&doc, &bin, "skin_common_root");
    has(&doc, &bin, "skin_joint_scene");
}
#[test]
fn rejects_nan_negative_zero_and_non_normalized_weights() {
    for (value, code) in [
        (f32::NAN, "weights_nonfinite"),
        (-1., "weights_negative"),
        (0., "unweighted_vertex"),
        (0.9, "weights_sum"),
    ] {
        let (doc, mut bin) = fixture();
        float(&mut bin, 60, value);
        has(&doc, &bin, code);
    }
}
#[test]
fn joint_indices_are_checked_even_for_zero_weight_entries() {
    let (doc, mut bin) = fixture();
    bin[38..40].copy_from_slice(&5u16.to_le_bytes());
    has(&doc, &bin, "joint_index_bounds");
}
#[test]
fn each_mesh_instance_uses_its_own_skin_joint_range() {
    let (mut doc, mut bin) = fixture();
    bin[36..38].copy_from_slice(&1u16.to_le_bytes());
    assert!(check(&doc, &bin).valid);
    doc["skins"]
        .as_array_mut()
        .unwrap()
        .push(json!({"joints":[1]}));
    doc["nodes"]
        .as_array_mut()
        .unwrap()
        .push(json!({"mesh":0,"skin":1}));
    doc["scenes"][0]["nodes"] = json!([0, 1, 3]);
    has(&doc, &bin, "joint_index_bounds");
}
#[test]
fn rejects_duplicate_positive_influences() {
    let (doc, mut bin) = fixture();
    float(&mut bin, 60, 0.5);
    float(&mut bin, 64, 0.5);
    has(&doc, &bin, "duplicate_joint_influence");
}
#[test]
fn malformed_joint_weight_layouts_never_reach_binary_readers() {
    for (accessor, shape, component, normalized, code) in [
        (1, "VEC3", 5123, false, "joints_layout"),
        (1, "VEC4", 5126, false, "joints_layout"),
        (1, "VEC4", 5123, true, "joints_layout"),
        (2, "VEC3", 5126, false, "weights_layout"),
        (2, "VEC4", 5123, false, "weights_layout"),
        (2, "VEC4", 5126, true, "weights_layout"),
    ] {
        let (mut doc, bin) = fixture();
        doc["accessors"][accessor]["type"] = json!(shape);
        doc["accessors"][accessor]["componentType"] = json!(component);
        doc["accessors"][accessor]["normalized"] = json!(normalized);
        has(&doc, &bin, code);
    }
}
#[test]
fn unsigned_normalized_weights_are_supported_and_exactly_normalized() {
    for (component, maximum, width) in [(5121, 255u16, 1usize), (5123, 65535u16, 2)] {
        let (mut doc, mut bin) = fixture();
        doc["accessors"][2]["componentType"] = json!(component);
        doc["accessors"][2]["normalized"] = json!(true);
        bin[60..108].fill(0);
        for vertex in 0..3 {
            let start = 60 + vertex * 4 * width;
            bin[start..start + width].copy_from_slice(&maximum.to_le_bytes()[..width]);
        }
        assert!(check(&doc, &bin).valid);
        bin[60..60 + width].copy_from_slice(&(maximum - 1).to_le_bytes()[..width]);
        has(&doc, &bin, "weights_sum");
    }
}
#[test]
fn pairs_counts_and_consecutive_sets_are_required() {
    let (mut doc, bin) = fixture();
    doc["meshes"][0]["primitives"][0]["attributes"]
        .as_object_mut()
        .unwrap()
        .remove("WEIGHTS_0");
    has(&doc, &bin, "skin_attribute_pair");
    doc["meshes"][0]["primitives"][0]["attributes"] =
        json!({"POSITION":0,"JOINTS_1":1,"WEIGHTS_1":2});
    has(&doc, &bin, "skin_attribute_sets");
    doc["meshes"][0]["primitives"][0]["attributes"] =
        json!({"POSITION":0,"JOINTS_0":1,"WEIGHTS_0":2});
    doc["accessors"][2]["count"] = json!(2);
    has(&doc, &bin, "skin_attribute_count");
}
#[test]
fn sums_all_influence_sets_and_warns_about_preview_limit() {
    let (mut doc, mut bin) = fixture();
    let joint_offset = bin.len();
    for _ in 0..3 {
        for n in [1u16, 0, 0, 0] {
            bin.extend(n.to_le_bytes());
        }
    }
    let weight_offset = bin.len();
    for _ in 0..3 {
        for n in [0.5f32, 0., 0., 0.] {
            bin.extend(n.to_le_bytes());
        }
    }
    for vertex in 0..3 {
        float(&mut bin, 60 + vertex * 16, 0.5);
    }
    doc["buffers"][0]["byteLength"] = json!(bin.len());
    doc["bufferViews"].as_array_mut().unwrap().extend([
        json!({"buffer":0,"byteOffset":joint_offset,"byteLength":24}),
        json!({"buffer":0,"byteOffset":weight_offset,"byteLength":48}),
    ]);
    doc["accessors"].as_array_mut().unwrap().extend([
        json!({"bufferView":4,"componentType":5123,"count":3,"type":"VEC4"}),
        json!({"bufferView":5,"componentType":5126,"count":3,"type":"VEC4"}),
    ]);
    doc["meshes"][0]["primitives"][0]["attributes"]["JOINTS_1"] = json!(4);
    doc["meshes"][0]["primitives"][0]["attributes"]["WEIGHTS_1"] = json!(5);
    let result = check(&doc, &bin);
    assert!(result.valid, "{result:?}");
    assert!(
        result
            .diagnostics
            .iter()
            .any(|d| d.code == "preview_influence_limit")
    );
    float(&mut bin, weight_offset, 0.4);
    has(&doc, &bin, "weights_sum");
}

#[test]
fn rotated_nonuniform_scaled_joint_hierarchy_uses_column_major_products() {
    let (mut doc, mut bin) = fixture();
    doc["nodes"][1]
        .as_object_mut()
        .unwrap()
        .remove("translation");
    // Rz(90 degrees) * S(2,3,4), followed by translation (2,3,4).
    doc["nodes"][1]["matrix"] = json!([0, 2, 0, 0, -3, 0, 0, 0, 0, 0, 4, 0, 2, 3, 4, 1]);
    for (index, inverse_x) in [-1.5f32, -2.5].into_iter().enumerate() {
        let inverse = [
            0.,
            -1. / 3.,
            0.,
            0.,
            0.5,
            0.,
            0.,
            0.,
            0.,
            0.,
            0.25,
            0.,
            inverse_x,
            2. / 3.,
            -1.,
            1.,
        ];
        for (component, value) in inverse.into_iter().enumerate() {
            float(&mut bin, 108 + index * 64 + component * 4, value);
        }
    }
    let result = check(&doc, &bin);
    assert!(result.valid, "{result:?}");
    assert_eq!(result.skins[0].neutral_consistency, "consistent");
    assert!(result.skins[0].max_joint_rest_difference.unwrap() < 1e-7);
}

#[test]
fn local_shear_is_rejected_independently_of_model_units() {
    for scale in [1e-12, 1.0, 1e12] {
        let (mut doc, bin) = fixture();
        doc["nodes"][1]
            .as_object_mut()
            .unwrap()
            .remove("translation");
        doc["nodes"][1]["matrix"] = json!([
            scale,
            0,
            0,
            0,
            0.5 * scale,
            scale,
            0,
            0,
            0,
            0,
            scale,
            0,
            0,
            0,
            0,
            1
        ]);
        has(&doc, &bin, "rest_matrix_shear");
    }
}
#[test]
fn composed_world_and_inverse_bind_shear_are_allowed() {
    let (mut doc, mut bin) = fixture();
    // Nonuniform parent scale followed by a local rotation gives world shear.
    doc["nodes"][1]["scale"] = json!([2, 1, 1]);
    let half_angle = std::f64::consts::FRAC_PI_8;
    doc["nodes"][2]["rotation"] = json!([0, 0, half_angle.sin(), half_angle.cos()]);
    // The inverse bind may include a bind-shape shear independently as well.
    float(&mut bin, 108 + 16, 0.25);
    let result = check(&doc, &bin);
    assert!(result.valid, "{result:?}");
    assert!(
        !result
            .diagnostics
            .iter()
            .any(|d| d.code == "rest_matrix_shear")
    );
}

#[test]
fn singular_skinned_mesh_transform_warns_without_invalidating_skin_data() {
    let (mut doc, bin) = fixture();
    doc["nodes"][0]["scale"] = json!([0, 1, 1]);
    let result = check(&doc, &bin);
    assert!(result.valid, "{result:?}");
    assert!(
        result
            .diagnostics
            .iter()
            .any(|d| d.code == "preview_mesh_transform" && d.path == "/nodes/0")
    );
    assert_eq!(result.skins[0].neutral_consistency, "consistent");
    doc["nodes"][0]["scale"] = json!([2, 3, 4]);
    assert!(
        !check(&doc, &bin)
            .diagnostics
            .iter()
            .any(|d| d.code == "preview_mesh_transform")
    );
}
#[test]
fn singular_mesh_ancestor_warns_even_when_mesh_local_transform_is_invertible() {
    let (mut doc, bin) = fixture();
    doc["nodes"]
        .as_array_mut()
        .unwrap()
        .push(json!({"scale":[1,0,1],"children":[0]}));
    doc["scenes"][0]["nodes"] = json!([3, 1]);
    let result = check(&doc, &bin);
    assert!(result.valid, "{result:?}");
    assert!(
        result
            .diagnostics
            .iter()
            .any(|d| d.code == "preview_mesh_transform" && d.path == "/nodes/0")
    );
}
#[test]
fn inverse_bind_stride_is_rejected_before_reader_or_preview() {
    let (mut doc, mut bin) = fixture();
    // Two MAT4 elements separated by four padding bytes. The range is valid,
    // but glTF allows byteStride only for vertex attributes.
    bin.splice(172..172, [0; 4]);
    doc["buffers"][0]["byteLength"] = json!(bin.len());
    doc["bufferViews"][3]["byteLength"] = json!(132);
    doc["bufferViews"][3]["byteStride"] = json!(68);
    has(&doc, &bin, "inverse_bind_layout");
}

#[test]
fn unused_skin_must_still_have_at_least_one_joint() {
    let (mut doc, bin) = fixture();
    doc["nodes"][0].as_object_mut().unwrap().remove("skin");
    doc["meshes"][0]["primitives"][0]["attributes"] = json!({"POSITION":0});
    doc["skins"] = json!([{"joints":[]}]);
    // gltf-json 1.4.1 accepts the empty array; our validator must reject it.
    has(&doc, &bin, "skin_joints_empty");
}

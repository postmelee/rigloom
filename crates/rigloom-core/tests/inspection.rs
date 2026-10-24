use rigloom_core::inspect_glb;
use serde_json::{Value, json};
fn model() -> Value {
    json!({"asset":{"version":"2.0"},"scene":0,"scenes":[{"nodes":[0]}],"nodes":[{"mesh":0}],"meshes":[{"primitives":[{"attributes":{"POSITION":0}}]}],"buffers":[{"byteLength":36}],"bufferViews":[{"buffer":0,"byteLength":36}],"accessors":[{"bufferView":0,"componentType":5126,"count":3,"type":"VEC3","min":[0,0,0],"max":[1,1,0]}]})
}
fn glb(doc: &Value) -> Vec<u8> {
    let mut json = serde_json::to_vec(doc).unwrap();
    while !json.len().is_multiple_of(4) {
        json.push(b' ');
    }
    let mut out = b"glTF".to_vec();
    out.extend(2u32.to_le_bytes());
    out.extend(((28 + json.len() + 36) as u32).to_le_bytes());
    out.extend((json.len() as u32).to_le_bytes());
    out.extend(0x4e4f534au32.to_le_bytes());
    out.extend(json);
    out.extend(36u32.to_le_bytes());
    out.extend(0x004e4942u32.to_le_bytes());
    for n in [0f32, 0., 0., 1., 0., 0., 0., 1., 0.] {
        out.extend(n.to_le_bytes());
    }
    out
}
fn has(doc: Value, code: &str) {
    let report = inspect_glb(&glb(&doc));
    assert!(!report.preview_allowed, "{report:?}");
    assert!(
        report.diagnostics.iter().any(|d| d.code == code),
        "{report:?}"
    );
}
#[test]
fn surface_preview_is_deterministic_and_does_not_modify_bytes() {
    let bytes = glb(&model());
    let original = bytes.clone();
    let a = inspect_glb(&bytes);
    assert!(a.preview_allowed);
    assert_eq!(a.inventory.vertices, 3);
    assert_eq!(
        serde_json::to_string(&a).unwrap(),
        serde_json::to_string(&inspect_glb(&bytes)).unwrap()
    );
    assert_eq!(bytes, original);
}
#[test]
fn multiple_meshes_are_not_rejected() {
    let mut m = model();
    let second = m["meshes"][0].clone();
    m["meshes"].as_array_mut().unwrap().push(second);
    m["nodes"].as_array_mut().unwrap().push(json!({"mesh":1}));
    m["scenes"][0]["nodes"] = json!([0, 1]);
    let r = inspect_glb(&glb(&m));
    assert!(r.preview_allowed, "{r:?}");
    assert_eq!(r.inventory.mesh_instances, 2);
    assert_eq!(r.inventory.vertices, 6);
}
#[test]
fn rejects_external_and_data_uris() {
    for uri in [
        "https://example.invalid/a.bin",
        "data:application/octet-stream;base64,AAAA",
    ] {
        let mut m = model();
        m["buffers"][0]["uri"] = json!(uri);
        has(m, "resource_uri");
    }
}
#[test]
fn rejects_image_uris() {
    let mut m = model();
    m["images"] = json!([{"uri":"https://example.invalid/image.png"}]);
    has(m, "resource_uri");
}
#[test]
fn detects_extensions_even_without_root_declaration() {
    let mut m = model();
    m["meshes"][0]["primitives"][0]["extensions"] = json!({"KHR_draco_mesh_compression":{}});
    has(m, "unsupported_extension");
}
#[test]
fn rejects_declared_extensions() {
    let mut m = model();
    m["extensionsUsed"] = json!(["KHR_materials_unlit"]);
    has(m, "unsupported_extension");
}
#[test]
fn metadata_is_not_interpreted_as_gltf_extensions() {
    let mut m = model();
    m["extras"] = json!({"extensions":{"notes":"not a glTF extension"}});
    assert!(inspect_glb(&glb(&m)).preview_allowed);
}
#[test]
fn rejects_out_of_bounds_views() {
    let mut m = model();
    m["bufferViews"][0]["byteLength"] = json!(40);
    has(m, "buffer_view_bounds");
}
#[test]
fn rejects_out_of_bounds_accessors() {
    let mut m = model();
    m["accessors"][0]["count"] = json!(4);
    has(m, "accessor_bounds");
}
#[test]
fn rejects_cycles() {
    let mut m = model();
    m["nodes"][0]["children"] = json!([0]);
    has(m, "node_cycle");
}
#[test]
fn rejects_multiple_parents() {
    let mut m = model();
    m["nodes"] = json!([{"children":[2]},{"children":[2]},{"mesh":0}]);
    has(m, "node_multiple_parents");
}
#[test]
fn rejects_invalid_reference() {
    let mut m = model();
    m["nodes"][0]["mesh"] = json!(10);
    has(m, "invalid_gltf");
}
#[test]
fn rejects_nan_positions() {
    let mut b = glb(&model());
    let offset = b.len() - 36;
    b[offset..offset + 4].copy_from_slice(&f32::NAN.to_le_bytes());
    let r = inspect_glb(&b);
    assert!(!r.preview_allowed);
    assert!(
        r.diagnostics
            .iter()
            .any(|d| d.code == "nonfinite_positions")
    );
}
#[test]
fn rejects_unsupported_topology() {
    let mut m = model();
    m["meshes"][0]["primitives"][0]["mode"] = json!(1);
    has(m, "primitive_mode");
}
#[test]
fn truncation_never_panics() {
    let b = glb(&model());
    for end in 0..b.len() {
        assert!(!inspect_glb(&b[..end]).preview_allowed);
    }
}
#[test]
fn malformed_header_and_chunk_lengths_are_diagnosed() {
    let b = glb(&model());
    for offset in [0, 4, 8, 12, 16] {
        let mut bad = b.clone();
        bad[offset..offset + 4].fill(255);
        assert!(!inspect_glb(&bad).preview_allowed);
    }
}

#[test]
fn rejects_zero_count_before_binary_reader() {
    let mut m = model();
    m["accessors"][0]["count"] = json!(0);
    has(m, "accessor_count");
}

#[test]
fn rejects_mismatched_position_layout_before_binary_reader() {
    for (shape, component, normalized) in [
        ("VEC2", 5126, false),
        ("VEC3", 5123, false),
        ("VEC3", 5126, true),
    ] {
        let mut m = model();
        m["accessors"][0]["type"] = json!(shape);
        m["accessors"][0]["componentType"] = json!(component);
        m["accessors"][0]["normalized"] = json!(normalized);
        has(m, "position_layout");
    }
}

#[test]
fn rejects_invalid_index_layout_before_binary_reader() {
    for (shape, component, normalized) in [
        ("SCALAR", 5126, false),
        ("VEC3", 5121, false),
        ("SCALAR", 5122, false),
        ("SCALAR", 5123, true),
    ] {
        let mut m = model();
        m["accessors"].as_array_mut().unwrap().push(json!({"bufferView":0,"componentType":component,"count":3,"type":shape,"normalized":normalized}));
        m["meshes"][0]["primitives"][0]["indices"] = json!(1);
        has(m, "index_layout");
    }
}

#[test]
fn rejects_invalid_position_reference_before_schema_hook() {
    let mut m = model();
    m["meshes"][0]["primitives"][0]["attributes"]["POSITION"] = json!(999);
    has(m, "invalid_gltf");
}

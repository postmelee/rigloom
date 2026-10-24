use rigloom_core::export::{ExportMeta, ExportReport, ExportRequest, VRM_LICENSE_URL, export_vrm};
use rigloom_core::inspect_glb;
use serde_json::{Value, json};

// Original generated geometry and hierarchy. Every joint is under one translated
// root; independently written inverse translations make bind products identity.
fn fixture() -> (Value, Vec<u8>) {
    let mut bin = vec![];
    for number in [0f32, 0., 0., 1., 0., 0., 0., 1., 0.] {
        bin.extend(number.to_le_bytes());
    }
    bin.extend([0; 24]);
    for _ in 0..3 {
        for number in [1f32, 0., 0., 0.] {
            bin.extend(number.to_le_bytes());
        }
    }
    for _ in 0..15 {
        for number in [
            1f32, 0., 0., 0., 0., 1., 0., 0., 0., 0., 1., 0., -2., -3., -4., 1.,
        ] {
            bin.extend(number.to_le_bytes());
        }
    }
    let doc = json!({
        "asset":{"version":"2.0","generator":"Rigloom original export fixture"},
        "scene":0,"scenes":[{"nodes":[0,15]}],
        "nodes":[
            {"name":"hips","translation":[2,3,4],"children":[1,9,12]},
            {"name":"spine","children":[2,3,6]}, {"name":"head"},
            {"name":"leftUpperArm","children":[4]}, {"name":"leftLowerArm","children":[5]}, {"name":"leftHand"},
            {"name":"rightUpperArm","children":[7]}, {"name":"rightLowerArm","children":[8]}, {"name":"rightHand"},
            {"name":"leftUpperLeg","children":[10]}, {"name":"leftLowerLeg","children":[11]}, {"name":"leftFoot"},
            {"name":"rightUpperLeg","children":[13]}, {"name":"rightLowerLeg","children":[14]}, {"name":"rightFoot"},
            {"name":"Mesh","mesh":0,"skin":0,"translation":[7,8,9],"scale":[2,3,4]}
        ],
        "meshes":[{"name":"OriginalTriangle","primitives":[{"attributes":{"POSITION":0,"JOINTS_0":1,"WEIGHTS_0":2},"material":0}]}],
        "materials":[{"name":"OriginalPBR","pbrMetallicRoughness":{"baseColorFactor":[0.3,0.5,0.8,1],"metallicFactor":0.2,"roughnessFactor":0.7},"doubleSided":true}],
        "skins":[{"joints":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14],"skeleton":0,"inverseBindMatrices":3}],
        "buffers":[{"byteLength":bin.len()}],
        "bufferViews":[{"buffer":0,"byteOffset":0,"byteLength":36},{"buffer":0,"byteOffset":36,"byteLength":24},{"buffer":0,"byteOffset":60,"byteLength":48},{"buffer":0,"byteOffset":108,"byteLength":960}],
        "accessors":[
            {"bufferView":0,"componentType":5126,"count":3,"type":"VEC3","min":[0,0,0],"max":[1,1,0]},
            {"bufferView":1,"componentType":5123,"count":3,"type":"VEC4"},
            {"bufferView":2,"componentType":5126,"count":3,"type":"VEC4"},
            {"bufferView":3,"componentType":5126,"count":15,"type":"MAT4"}
        ],"extras":{"sourceNote":"Preserve me","emptyCustomData":[]}
    });
    (doc, bin)
}
fn glb(doc: &Value, binary: &[u8]) -> Vec<u8> {
    let mut json = serde_json::to_vec(doc).unwrap();
    while !json.len().is_multiple_of(4) {
        json.push(b' ');
    }
    let mut binary = binary.to_vec();
    while !binary.len().is_multiple_of(4) {
        binary.push(0);
    }
    let mut bytes = b"glTF".to_vec();
    bytes.extend(2u32.to_le_bytes());
    bytes.extend(((28 + json.len() + binary.len()) as u32).to_le_bytes());
    bytes.extend((json.len() as u32).to_le_bytes());
    bytes.extend(0x4e4f534au32.to_le_bytes());
    bytes.extend(json);
    bytes.extend((binary.len() as u32).to_le_bytes());
    bytes.extend(0x004e4942u32.to_le_bytes());
    bytes.extend(binary);
    bytes
}
fn decode(bytes: &[u8]) -> (Value, &[u8]) {
    assert_eq!(
        bytes.len(),
        u32::from_le_bytes(bytes[8..12].try_into().unwrap()) as usize
    );
    let length = u32::from_le_bytes(bytes[12..16].try_into().unwrap()) as usize;
    assert!(length.is_multiple_of(4));
    (
        serde_json::from_slice(&bytes[20..20 + length]).unwrap(),
        &bytes[20 + length..],
    )
}
fn request() -> ExportRequest {
    let (doc, bin) = fixture();
    let rig = inspect_glb(&glb(&doc, &bin)).rig.unwrap();
    assert!(rig.mapping.valid && rig.binds.valid, "{rig:?}");
    ExportRequest {
        mapping: rig
            .mapping
            .bones
            .into_iter()
            .map(|bone| (bone.bone, bone.node))
            .collect(),
        meta: ExportMeta {
            name: "Original model".into(),
            authors: vec!["Original creator".into()],
            avatar_permission: "onlySeparatelyLicensedPerson".into(),
            commercial_usage: "personalNonProfit".into(),
            credit_notation: "required".into(),
            modification: "prohibited".into(),
            allow_excessively_violent_usage: false,
            allow_excessively_sexual_usage: false,
            allow_political_or_religious_usage: false,
            allow_antisocial_or_hate_usage: false,
            allow_redistribution: false,
            version: Some("draft 1".into()),
            copyright_information: None,
            contact_information: None,
            other_license_url: None,
        },
        source_pose_confirmed: true,
        rights_confirmed: true,
        acknowledge_bind_warning: false,
    }
}
fn has(report: &ExportReport, code: &str) {
    assert!(
        report.diagnostics.iter().any(|d| d.code == code),
        "{report:?}"
    );
}
fn blocked(source: &[u8], request: &ExportRequest, code: &str) {
    let result = export_vrm(source, request);
    assert!(
        result.bytes.is_none() && !result.report.export_allowed,
        "{result:?}"
    );
    assert_eq!(result.report.output_byte_length, 0);
    has(&result.report, code);
}
fn appended_floats(
    doc: &mut Value,
    binary: &mut Vec<u8>,
    shape: &str,
    count: usize,
    floats: &[f32],
) -> usize {
    let offset = binary.len();
    for value in floats {
        binary.extend(value.to_le_bytes());
    }
    let views = doc["bufferViews"].as_array_mut().unwrap();
    let view = views.len();
    views.push(json!({"buffer":0,"byteOffset":offset,"byteLength":binary.len() - offset}));
    let accessors = doc["accessors"].as_array_mut().unwrap();
    let index = accessors.len();
    accessors.push(json!({"bufferView":view,"componentType":5126,"type":shape,"count":count}));
    doc["buffers"][0]["byteLength"] = json!(binary.len());
    index
}

#[test]
fn serializes_real_vrm_with_explicit_permissions_and_preserves_every_source_resource() {
    let (mut doc, bin) = fixture();
    doc["nodes"]
        .as_array_mut()
        .unwrap()
        .push(json!({"mesh":0,"skin":0,"translation":[-11,4,8],"scale":[4,2,3]}));
    doc["scenes"][0]["nodes"] = json!([0, 15, 16]);
    let source = glb(&doc, &bin);
    let original = source.clone();
    let result = export_vrm(&source, &request());
    assert!(result.report.export_allowed, "{result:?}");
    let bytes = result.bytes.unwrap();
    let (output, output_tail) = decode(&bytes);
    assert_eq!(output_tail, decode(&source).1);
    for key in [
        "asset",
        "scenes",
        "nodes",
        "meshes",
        "materials",
        "skins",
        "buffers",
        "bufferViews",
        "accessors",
        "extras",
    ] {
        assert_eq!(output[key], doc[key], "Resource changed: {key}");
    }
    let vrm = &output["extensions"]["VRMC_vrm"];
    assert_eq!(vrm["specVersion"], "1.0");
    assert_eq!(vrm["meta"]["licenseUrl"], VRM_LICENSE_URL);
    assert_eq!(vrm["meta"]["name"], "Original model");
    assert_eq!(vrm["meta"]["authors"], json!(["Original creator"]));
    assert_eq!(
        vrm["meta"]["avatarPermission"],
        "onlySeparatelyLicensedPerson"
    );
    assert_eq!(vrm["meta"]["allowRedistribution"], false);
    assert!(vrm["meta"].get("copyrightInformation").is_none());
    assert_eq!(vrm["humanoid"]["humanBones"].as_object().unwrap().len(), 15);
    assert_eq!(vrm["humanoid"]["humanBones"]["leftHand"]["node"], 5);
    assert_eq!(output["extensionsUsed"], json!(["VRMC_vrm"]));
    assert!(output.get("extensionsRequired").is_none());
    assert!(vrm.get("expressions").is_none() && vrm.get("lookAt").is_none());
    assert_eq!(result.report.humanoid_bones, 15);
    assert_eq!(result.report.source_byte_length, source.len());
    assert_eq!(result.report.output_byte_length, bytes.len());
    assert_eq!(source, original);
    let again = export_vrm(&source, &request());
    assert_eq!(again.bytes.unwrap(), bytes);
    assert_eq!(
        serde_json::to_value(again.report).unwrap(),
        serde_json::to_value(result.report).unwrap()
    );
}

#[test]
fn metadata_and_confirmation_fields_have_no_implicit_permission_defaults() {
    let value = serde_json::to_value(request()).unwrap();
    for field in [
        "avatarPermission",
        "commercialUsage",
        "creditNotation",
        "modification",
        "allowExcessivelyViolentUsage",
        "allowExcessivelySexualUsage",
        "allowPoliticalOrReligiousUsage",
        "allowAntisocialOrHateUsage",
        "allowRedistribution",
    ] {
        let mut missing = value.clone();
        missing["meta"].as_object_mut().unwrap().remove(field);
        assert!(
            serde_json::from_value::<ExportRequest>(missing).is_err(),
            "Missing field {field} was accepted"
        );
    }
    let mut unexpected = value.clone();
    unexpected["meta"]["licenseUrl"] = json!("https://creativecommons.org/publicdomain/zero/1.0/");
    assert!(serde_json::from_value::<ExportRequest>(unexpected).is_err());
    for field in [
        "source_pose_confirmed",
        "rights_confirmed",
        "acknowledge_bind_warning",
    ] {
        let mut missing = value.clone();
        missing.as_object_mut().unwrap().remove(field);
        assert!(serde_json::from_value::<ExportRequest>(missing).is_err());
    }
}

#[test]
fn invalid_attribution_or_permission_blocks_export_with_structured_errors() {
    let (doc, bin) = fixture();
    let source = glb(&doc, &bin);
    let mut choice = request();
    choice.meta.name = " \n ".into();
    choice.meta.authors = vec!["Creator".into(), " ".into()];
    choice.meta.avatar_permission = "CC0".into();
    choice.meta.other_license_url = Some("javascript:alert(1)".into());
    let result = export_vrm(&source, &choice);
    assert!(result.bytes.is_none());
    for code in [
        "meta_name",
        "meta_authors",
        "meta_permission",
        "meta_license_url",
    ] {
        has(&result.report, code);
    }
    for field in 0..4 {
        let mut choice = request();
        match field {
            0 => choice.meta.avatar_permission = String::new(),
            1 => choice.meta.commercial_usage = "everyone".into(),
            2 => choice.meta.credit_notation = "optional".into(),
            _ => choice.meta.modification = "free".into(),
        }
        blocked(&source, &choice, "meta_permission");
    }
}

#[test]
fn source_pose_and_rights_are_independent_explicit_confirmations() {
    let (doc, bin) = fixture();
    let source = glb(&doc, &bin);
    let mut choice = request();
    choice.source_pose_confirmed = false;
    blocked(&source, &choice, "source_pose_confirmation");
    choice.source_pose_confirmed = true;
    choice.rights_confirmed = false;
    blocked(&source, &choice, "rights_confirmation");
}

#[test]
fn export_requires_the_complete_reviewed_mapping_including_null_optional_choices() {
    let (doc, bin) = fixture();
    let source = glb(&doc, &bin);
    let mut choice = request();
    assert_eq!(choice.mapping.len(), 55);
    choice.mapping.remove("leftLittleDistal");
    blocked(&source, &choice, "mapping_confirmation");
    let mut choice = request();
    choice.mapping.insert("hips".into(), None);
    blocked(&source, &choice, "mapping_required");
    let mut choice = request();
    choice.mapping.insert("leftHand".into(), Some(8));
    blocked(&source, &choice, "mapping_duplicate");
    let mut choice = request();
    choice.mapping.insert("unknownBone".into(), None);
    blocked(&source, &choice, "mapping_unknown_bone");
}

#[test]
fn invalid_skin_and_unqualified_extensions_cannot_be_wrapped_in_vrm() {
    let (doc, mut bin) = fixture();
    bin[60..64].copy_from_slice(&f32::NAN.to_le_bytes());
    let result = export_vrm(&glb(&doc, &bin), &request());
    assert!(!result.report.export_allowed && result.bytes.is_none());
    has(&result.report, "rig_not_exportable");
    let (mut doc, bin) = fixture();
    doc["extensionsUsed"] = json!(["VRMC_vrm"]);
    blocked(&glb(&doc, &bin), &request(), "unsupported_extension");
}

#[test]
fn requires_an_existing_skin_on_a_reachable_mesh() {
    let (mut doc, bin) = fixture();
    doc["scenes"][0]["nodes"] = json!([0]);
    blocked(&glb(&doc, &bin), &request(), "existing_skin_required");
}

#[test]
fn bind_rest_difference_requires_acknowledgment_and_preserves_original_bytes() {
    let (doc, mut bin) = fixture();
    bin[108 + 64 + 48..108 + 64 + 52].copy_from_slice(&(-1f32).to_le_bytes());
    let source = glb(&doc, &bin);
    blocked(&source, &request(), "bind_review_confirmation");
    let mut choice = request();
    choice.acknowledge_bind_warning = true;
    let result = export_vrm(&source, &choice);
    assert!(result.report.export_allowed, "{result:?}");
    has(&result.report, "bind_rest_review");
    assert!(
        result
            .report
            .limitations
            .iter()
            .any(|s| s.contains("neutral-surface"))
    );
    assert_eq!(decode(&result.bytes.unwrap()).1, decode(&source).1);
}

#[test]
fn preview_limit_does_not_misclassify_valid_multiple_influence_sets_as_invalid_gltf() {
    let (mut doc, mut bin) = fixture();
    for at in [60, 76, 92] {
        bin[at..at + 4].copy_from_slice(&0.5f32.to_le_bytes());
    }
    // Two legal influence sets, preserving both rather than dropping influences.
    let extra = appended_floats(
        &mut doc,
        &mut bin,
        "VEC4",
        3,
        &[0.5, 0., 0., 0., 0.5, 0., 0., 0., 0.5, 0., 0., 0.],
    );
    let offset = bin.len();
    for _ in 0..3 {
        for joint in [1u16, 0, 0, 0] {
            bin.extend(joint.to_le_bytes());
        }
    }
    let view = doc["bufferViews"].as_array().unwrap().len();
    doc["bufferViews"]
        .as_array_mut()
        .unwrap()
        .push(json!({"buffer":0,"byteOffset":offset,"byteLength":24}));
    let joints = doc["accessors"].as_array().unwrap().len();
    doc["accessors"]
        .as_array_mut()
        .unwrap()
        .push(json!({"bufferView":view,"componentType":5123,"count":3,"type":"VEC4"}));
    doc["buffers"][0]["byteLength"] = json!(bin.len());
    doc["meshes"][0]["primitives"][0]["attributes"]["JOINTS_1"] = json!(joints);
    doc["meshes"][0]["primitives"][0]["attributes"]["WEIGHTS_1"] = json!(extra);
    let source = glb(&doc, &bin);
    let inspection = inspect_glb(&source);
    assert!(!inspection.preview_allowed && inspection.rig.unwrap().binds.valid);
    let result = export_vrm(&source, &request());
    assert!(result.report.export_allowed, "{result:?}");
    has(&result.report, "preview_influence_limit");
    let (output, output_bin) = decode(result.bytes.as_ref().unwrap());
    assert_eq!(output["meshes"], doc["meshes"]);
    assert_eq!(output_bin, decode(&source).1);
}

#[test]
fn retained_animation_and_camera_data_have_explicit_unused_disposition() {
    let (mut doc, mut bin) = fixture();
    let input = appended_floats(&mut doc, &mut bin, "SCALAR", 3, &[0., 1., 2.]);
    doc["accessors"][input]["min"] = json!([0]);
    doc["accessors"][input]["max"] = json!([2]);
    doc["animations"] = json!([{"name":"Original motion","samplers":[{"input":input,"output":0}],"channels":[{"sampler":0,"target":{"node":0,"path":"translation"}}]}]);
    doc["cameras"] = json!([{"type":"perspective","perspective":{"yfov":0.8,"znear":0.1}}]);
    doc["nodes"][15]["camera"] = json!(0);
    let source = glb(&doc, &bin);
    let result = export_vrm(&source, &request());
    assert!(result.report.export_allowed, "{result:?}");
    let (output, output_bin) = decode(result.bytes.as_ref().unwrap());
    assert_eq!(output["animations"], doc["animations"]);
    assert_eq!(output["cameras"], doc["cameras"]);
    assert_eq!(output_bin, decode(&source).1);
    assert!(
        result
            .report
            .preserved
            .iter()
            .any(|s| s.contains("1 glTF animations and 1 cameras") && s.contains("do not use"))
    );
    assert!(
        !result
            .report
            .diagnostics
            .iter()
            .any(|d| d.code == "animations_static")
    );
}

#[test]
fn omits_tangent_references_without_reindexing_accessors_or_changing_bin() {
    let (mut doc, mut bin) = fixture();
    let tangent = appended_floats(
        &mut doc,
        &mut bin,
        "VEC4",
        3,
        &[1., 0., 0., 1., 1., 0., 0., 1., 1., 0., 0., 1.],
    );
    doc["meshes"][0]["primitives"][0]["attributes"]["TANGENT"] = json!(tangent);
    doc["meshes"][0]["primitives"][0]["targets"] = json!([{"POSITION":0,"TANGENT":0}]);
    let source = glb(&doc, &bin);
    let result = export_vrm(&source, &request());
    assert!(result.report.export_allowed, "{result:?}");
    let (output, output_bin) = decode(result.bytes.as_ref().unwrap());
    assert!(
        output["meshes"][0]["primitives"][0]["attributes"]
            .get("TANGENT")
            .is_none()
    );
    assert_eq!(
        output["meshes"][0]["primitives"][0]["targets"],
        json!([{"POSITION":0}])
    );
    assert_eq!(output["accessors"], doc["accessors"]);
    assert_eq!(output_bin, decode(&source).1);
    assert!(
        result
            .report
            .changes
            .iter()
            .any(|s| s.contains("2 mesh/morph TANGENT"))
    );
}

#[test]
fn tangent_only_morph_is_blocked_instead_of_silently_shifting_target_indices() {
    let (mut doc, bin) = fixture();
    doc["meshes"][0]["primitives"][0]["targets"] = json!([{"TANGENT":0}]);
    blocked(&glb(&doc, &bin), &request(), "tangent_only_morph");
}

#[test]
fn malformed_retained_surface_and_morph_layouts_are_blocked() {
    for semantic in ["NORMAL", "TEXCOORD_0", "COLOR_0"] {
        let (mut doc, bin) = fixture();
        doc["meshes"][0]["primitives"][0]["attributes"][semantic] = json!(1);
        blocked(&glb(&doc, &bin), &request(), "surface_accessor_layout");
    }
    let (mut doc, mut bin) = fixture();
    let delta = appended_floats(&mut doc, &mut bin, "VEC3", 2, &[0.; 6]);
    doc["meshes"][0]["primitives"][0]["targets"] = json!([{"NORMAL":delta}]);
    blocked(&glb(&doc, &bin), &request(), "surface_accessor_layout");
    let (mut doc, mut bin) = fixture();
    let uv = appended_floats(
        &mut doc,
        &mut bin,
        "VEC2",
        3,
        &[f32::NAN, 0., 0., 0., 0., 0.],
    );
    doc["meshes"][0]["primitives"][0]["attributes"]["TEXCOORD_0"] = json!(uv);
    blocked(&glb(&doc, &bin), &request(), "surface_nonfinite");
}

#[test]
fn schema_invalid_empty_resource_arrays_are_not_preserved_as_valid_vrm() {
    let (mut doc, bin) = fixture();
    doc["nodes"][2]["children"] = json!([]);
    blocked(&glb(&doc, &bin), &request(), "source_schema");
    let (mut doc, bin) = fixture();
    doc["samplers"] = json!([]);
    blocked(&glb(&doc, &bin), &request(), "source_schema");
}

#[test]
fn truncated_and_non_glb_sources_return_diagnostics_without_output() {
    for source in [b"not a GLB".as_slice(), b"glTF\x02\x00\x00\x00".as_slice()] {
        blocked(source, &request(), "source_not_exportable");
    }
}

#[test]
fn morph_target_indices_require_consistent_counts_and_base_attributes() {
    let (mut doc, bin) = fixture();
    doc["meshes"][0]["primitives"][0]["targets"] = json!([{}]);
    blocked(&glb(&doc, &bin), &request(), "source_schema");
    doc["meshes"][0]["primitives"][0]["targets"] = json!([{"NORMAL":0}]);
    blocked(&glb(&doc, &bin), &request(), "surface_morph_attribute");
    doc["meshes"][0]["primitives"][0]["targets"] = json!([{"POSITION":0}]);
    doc["meshes"][0]["weights"] = json!([0, 0]);
    blocked(&glb(&doc, &bin), &request(), "surface_morph_count");
    doc["meshes"][0]["weights"] = json!([0]);
    doc["nodes"][15]["weights"] = json!([0, 0]);
    blocked(&glb(&doc, &bin), &request(), "surface_morph_count");
    doc["nodes"][15]["weights"] = json!([0]);
    let extra_primitive = json!({"attributes":{"POSITION":0,"JOINTS_0":1,"WEIGHTS_0":2}});
    doc["meshes"][0]["primitives"]
        .as_array_mut()
        .unwrap()
        .push(extra_primitive);
    blocked(&glb(&doc, &bin), &request(), "surface_morph_count");
}

#[test]
fn bin_padding_and_optional_attribution_remain_exact_and_explicit() {
    let (mut doc, mut bin) = fixture();
    bin.extend([21, 22, 23]);
    doc["buffers"][0]["byteLength"] = json!(bin.len());
    let source = glb(&doc, &bin);
    let mut choice = request();
    choice.meta.copyright_information = Some("Copyright Original creator".into());
    choice.meta.contact_information = Some("Artist's portfolio".into());
    choice.meta.other_license_url = Some("https://example.invalid/model-terms".into());
    let result = export_vrm(&source, &choice);
    assert!(result.report.export_allowed, "{result:?}");
    let (output, tail) = decode(result.bytes.as_ref().unwrap());
    assert_eq!(tail, decode(&source).1);
    assert_eq!(tail[tail.len() - 4..], [21, 22, 23, 0]);
    assert_eq!(
        output["extensions"]["VRMC_vrm"]["meta"]["otherLicenseUrl"],
        choice.meta.other_license_url.unwrap()
    );
    assert_eq!(
        output["extensions"]["VRMC_vrm"]["meta"]["copyrightInformation"],
        choice.meta.copyright_information.unwrap()
    );
}

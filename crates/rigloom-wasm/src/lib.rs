use wasm_bindgen::prelude::*;

/// Versioned JSON report; Rust owns interpretation, JS owns presentation.
#[wasm_bindgen]
pub fn inspect_glb(bytes: &[u8]) -> Result<String, JsValue> {
    serde_json::to_string(&rigloom_core::inspect_glb(bytes))
        .map_err(|error| JsValue::from_str(&error.to_string()))
}

/// Manual choices remain data; invalid JSON cannot bypass native validation.
#[wasm_bindgen]
pub fn inspect_glb_with_mapping(bytes: &[u8], mapping_json: &str) -> Result<String, JsValue> {
    let mapping = serde_json::from_str(mapping_json)
        .map_err(|error| JsValue::from_str(&format!("Invalid mapping data: {error}")))?;
    serde_json::to_string(&rigloom_core::inspect_glb_with_mapping(bytes, &mapping))
        .map_err(|error| JsValue::from_str(&error.to_string()))
}

/// Binary bytes stay binary across the bridge; the report is independently serializable.
#[wasm_bindgen]
pub struct VrmExport {
    report: String,
    bytes: Vec<u8>,
}
#[wasm_bindgen]
impl VrmExport {
    pub fn report_json(&self) -> String {
        self.report.clone()
    }
    pub fn vrm_bytes(&self) -> Vec<u8> {
        self.bytes.clone()
    }
}
#[wasm_bindgen]
pub fn export_vrm(bytes: &[u8], request_json: &str) -> Result<VrmExport, JsValue> {
    let request = serde_json::from_str(request_json)
        .map_err(|error| JsValue::from_str(&format!("Invalid export request: {error}")))?;
    let result = rigloom_core::export::export_vrm(bytes, &request);
    let report = serde_json::to_string(&result.report)
        .map_err(|error| JsValue::from_str(&error.to_string()))?;
    Ok(VrmExport {
        report,
        bytes: result.bytes.unwrap_or_default(),
    })
}

#[wasm_bindgen]
pub fn prepare_placement(bytes: &[u8], frame_json: &str) -> Result<String, JsValue> {
    let frame = serde_json::from_str(frame_json)
        .map_err(|e| JsValue::from_str(&format!("Invalid frame: {e}")))?;
    let result =
        rigloom_core::placement::prepare(bytes, &frame).map_err(|e| JsValue::from_str(&e))?;
    serde_json::to_string(&result).map_err(|e| JsValue::from_str(&e.to_string()))
}
#[wasm_bindgen]
pub fn validate_placement(joints_json: &str) -> Result<(), JsValue> {
    let joints: Vec<[f64; 3]> = serde_json::from_str(joints_json)
        .map_err(|e| JsValue::from_str(&format!("Invalid joints: {e}")))?;
    rigloom_core::placement::validate(&joints).map_err(|e| JsValue::from_str(&e))
}

#[wasm_bindgen]
pub fn skin_parts(bytes: &[u8], frame_json: &str) -> Result<String, JsValue> {
    let frame = serde_json::from_str(frame_json)
        .map_err(|e| JsValue::from_str(&format!("Invalid frame: {e}")))?;
    let parts =
        rigloom_core::skinning::list_parts(bytes, &frame).map_err(|e| JsValue::from_str(&e))?;
    serde_json::to_string(&parts).map_err(|e| JsValue::from_str(&e.to_string()))
}
#[wasm_bindgen]
pub fn generate_skin(bytes: &[u8], request_json: &str) -> Result<GeneratedSkin, JsValue> {
    let request = serde_json::from_str(request_json)
        .map_err(|e| JsValue::from_str(&format!("Invalid skin request: {e}")))?;
    let result =
        rigloom_core::skinning::generate(bytes, &request).map_err(|e| JsValue::from_str(&e))?;
    Ok(GeneratedSkin {
        report: serde_json::to_string(&result.report)
            .map_err(|e| JsValue::from_str(&e.to_string()))?,
        bytes: result.bytes,
    })
}

#[wasm_bindgen]
pub struct GeneratedSkin {
    report: String,
    bytes: Vec<u8>,
}
#[wasm_bindgen]
impl GeneratedSkin {
    pub fn report_json(&self) -> String {
        self.report.clone()
    }
    pub fn glb_bytes(&self) -> Vec<u8> {
        self.bytes.clone()
    }
}

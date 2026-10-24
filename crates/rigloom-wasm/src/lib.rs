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

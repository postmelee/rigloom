use wasm_bindgen::prelude::*;

/// Versioned JSON report; Rust owns interpretation, JS owns presentation.
#[wasm_bindgen]
pub fn inspect_glb(bytes: &[u8]) -> Result<String, JsValue> {
    serde_json::to_string(&rigloom_core::inspect_glb(bytes))
        .map_err(|error| JsValue::from_str(&error.to_string()))
}

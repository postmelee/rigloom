//! Local quality harness; not a product importer or shipped binary.
use std::{env, fs};
fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args: Vec<_> = env::args().collect();
    if args.len() != 4 {
        return Err("usage: skin_quality input.glb request.json output.glb".into());
    }
    let bytes = fs::read(&args[1])?;
    let request: rigloom_core::skinning::Request = serde_json::from_slice(&fs::read(&args[2])?)?;
    let started = std::time::Instant::now();
    let out = rigloom_core::skinning::generate(&bytes, &request)?;
    fs::write(&args[3], out.bytes)?;
    let mut report = serde_json::to_value(out.report)?;
    report["elapsed_ms"] = serde_json::json!(started.elapsed().as_secs_f64() * 1000.);
    println!("{}", serde_json::to_string(&report)?);
    Ok(())
}

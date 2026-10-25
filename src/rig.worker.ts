/// <reference lib="webworker" />
import init, {
  prepare_placement,
  validate_placement,
  skin_parts,
  generate_skin,
} from "./wasm/rigloom_wasm";
const ready = init();
self.onmessage = async ({ data }) => {
  try {
    await ready;
    if (data.operation === "skin") {
      self.postMessage({ revision: data.revision, phase: "computing" });
      const result = generate_skin(
        new Uint8Array(data.bytes),
        JSON.stringify(data.request),
      );
      try {
        const report = JSON.parse(result.report_json());
        const bytes = result.glb_bytes().slice().buffer;
        report.output_sha256 = Array.from(
          new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
          (b) => b.toString(16).padStart(2, "0"),
        ).join("");
        self.postMessage(
          { revision: data.revision, report, bytes },
          { transfer: [bytes] },
        );
      } finally {
        result.free();
      }
      return;
    }
    const placement = JSON.parse(
      prepare_placement(new Uint8Array(data.bytes), JSON.stringify(data.frame)),
    );
    placement.defaults = structuredClone(placement.joints);
    if (data.joints) {
      validate_placement(JSON.stringify(data.joints));
      placement.joints = data.joints;
    }
    let parts = [],
      skinError;
    try {
      parts = JSON.parse(
        skin_parts(new Uint8Array(data.bytes), JSON.stringify(data.frame)),
      );
    } catch (error) {
      skinError = String(error);
    }
    self.postMessage({ revision: data.revision, placement, parts, skinError });
  } catch (error) {
    self.postMessage({ revision: data.revision, error: String(error) });
  }
};

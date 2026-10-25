/// <reference lib="webworker" />
import init, {
  prepare_placement,
  validate_placement,
} from "./wasm/rigloom_wasm";
const ready = init();
self.onmessage = async ({ data }) => {
  try {
    await ready;
    const placement = JSON.parse(
      prepare_placement(new Uint8Array(data.bytes), JSON.stringify(data.frame)),
    );
    placement.defaults = structuredClone(placement.joints);
    if (data.joints) {
      validate_placement(JSON.stringify(data.joints));
      placement.joints = data.joints;
    }
    self.postMessage({ revision: data.revision, placement });
  } catch (error) {
    self.postMessage({ revision: data.revision, error: String(error) });
  }
};

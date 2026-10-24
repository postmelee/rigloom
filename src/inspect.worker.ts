/// <reference lib="webworker" />
import init, { inspect_glb } from "./wasm/rigloom_wasm";
import type { WorkerReply } from "./protocol";
const ready = init();
self.onmessage = async ({
  data,
}: {
  data: { revision: number; bytes: ArrayBuffer };
}) => {
  const send = (reply: WorkerReply, transfer: Transferable[] = []) =>
    self.postMessage(reply, transfer);
  try {
    await ready;
    send({ revision: data.revision, phase: "inspecting" });
    const report = JSON.parse(inspect_glb(new Uint8Array(data.bytes)));
    send(
      { revision: data.revision, phase: "done", report, bytes: data.bytes },
      [data.bytes],
    );
  } catch (error) {
    send({ revision: data.revision, phase: "error", message: String(error) });
  }
};

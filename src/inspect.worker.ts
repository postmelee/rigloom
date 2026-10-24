/// <reference lib="webworker" />
import init, { inspect_glb_with_mapping } from "./wasm/rigloom_wasm";
import type { Mapping, WorkerReply } from "./protocol";
const ready = init();
self.onmessage = async ({
  data,
}: {
  data: { revision: number; bytes: ArrayBuffer; mapping?: Mapping };
}) => {
  const send = (reply: WorkerReply, transfer: Transferable[] = []) =>
    self.postMessage(reply, transfer);
  try {
    await ready;
    send({ revision: data.revision, phase: "inspecting" });
    const source_sha256 = Array.from(
      new Uint8Array(await crypto.subtle.digest("SHA-256", data.bytes)),
      (byte) => byte.toString(16).padStart(2, "0"),
    ).join("");
    const report = JSON.parse(
      inspect_glb_with_mapping(
        new Uint8Array(data.bytes),
        JSON.stringify(data.mapping ?? {}),
      ),
    );
    send(
      {
        revision: data.revision,
        phase: "done",
        report,
        bytes: data.bytes,
        source_sha256,
      },
      [data.bytes],
    );
  } catch (error) {
    send({ revision: data.revision, phase: "error", message: String(error) });
  }
};

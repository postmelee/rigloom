/// <reference lib="webworker" />
import init, {
  inspect_glb_with_mapping,
  export_vrm,
} from "./wasm/rigloom_wasm";
import type {
  ExportRequest,
  ExportWorkerReply,
  Mapping,
  WorkerReply,
} from "./protocol";
const ready = init();
const digest = async (bytes: ArrayBuffer) =>
  Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
type Request = { revision: number; bytes: ArrayBuffer } & (
  | { operation?: "inspect"; mapping?: Mapping }
  | { operation: "export"; request: ExportRequest }
);
self.onmessage = async ({ data }: { data: Request }) => {
  const send = (
    reply: WorkerReply | ExportWorkerReply,
    transfer: Transferable[] = [],
  ) => self.postMessage(reply, transfer);
  try {
    await ready;
    if (data.operation === "export") {
      send({ revision: data.revision, phase: "exporting" });
      const source_sha256 = await digest(data.bytes);
      const result = export_vrm(
        new Uint8Array(data.bytes),
        JSON.stringify(data.request),
      );
      let report, bytes: ArrayBuffer | null;
      try {
        report = JSON.parse(result.report_json());
        const output = result.vrm_bytes();
        bytes = report.export_allowed
          ? (output.buffer.slice(
              output.byteOffset,
              output.byteOffset + output.byteLength,
            ) as ArrayBuffer)
          : null;
      } finally {
        result.free();
      }
      const output_sha256 = bytes ? await digest(bytes) : null;
      send(
        {
          revision: data.revision,
          phase: "exported",
          report: { ...report, source_sha256, output_sha256 },
          bytes,
        },
        bytes ? [bytes] : [],
      );
      return;
    }
    send({ revision: data.revision, phase: "inspecting" });
    const source_sha256 = await digest(data.bytes);
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

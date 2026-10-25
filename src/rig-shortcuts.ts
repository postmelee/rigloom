/** Keyboard interaction only; placement edits still use the shared history/mirror path. */
export function bindRigShortcuts(options: {
  root: HTMLElement;
  canvas: HTMLCanvasElement;
  enabled: () => boolean;
  history: (redo: boolean) => void;
  move: (axis: number, amount: number, record: boolean) => void;
  step: () => number;
  select: (direction: number) => void;
}) {
  const held = new Set<string>();
  const endGesture = () => held.clear();
  document.addEventListener("keyup", (event) => held.delete(event.code));
  document.addEventListener("focusout", endGesture);
  document.addEventListener("pointerdown", endGesture);
  document.addEventListener("visibilitychange", endGesture);
  window.addEventListener("blur", endGesture);
  document.addEventListener("keydown", (event) => {
    const target = event.target;
    if (
      event.defaultPrevented ||
      event.isComposing ||
      event.keyCode === 229 ||
      !(target instanceof HTMLElement) ||
      target.isContentEditable ||
      target.closest("input, textarea, select, [role=textbox]") ||
      !options.enabled() ||
      (target !== options.canvas && !options.root.contains(target))
    ) {
      endGesture();
      return;
    }
    const key = event.key.toLowerCase();
    if ((event.metaKey || event.ctrlKey) && !event.altKey) {
      if (
        key === "z" ||
        (key === "y" && event.ctrlKey && !event.metaKey && !event.shiftKey)
      ) {
        event.preventDefault();
        endGesture();
        if (!event.repeat) options.history(key === "y" || event.shiftKey);
      }
      return;
    }
    if (event.metaKey || event.ctrlKey || target !== options.canvas) return;
    let axis: number | undefined;
    let sign = 1;
    if (!event.altKey && (key === "arrowleft" || key === "arrowright")) {
      axis = 0;
      sign = key === "arrowleft" ? -1 : 1;
    } else if (key === "arrowup" || key === "arrowdown") {
      axis = event.altKey ? 2 : 1;
      sign = key === "arrowdown" ? -1 : 1;
    }
    if (axis !== undefined) {
      event.preventDefault();
      const record = held.size === 0;
      held.add(event.code);
      options.move(
        axis,
        sign * options.step() * (event.shiftKey ? 0.1 : 1),
        record,
      );
      return;
    }
    if (event.altKey || event.shiftKey) return;
    if (key === "[" || key === "]") {
      event.preventDefault();
      endGesture();
      if (!event.repeat) options.select(key === "[" ? -1 : 1);
    }
  });
}

export type HapticType = "light" | "success" | "error";

export function triggerHaptic(type: HapticType) {
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;

  const pattern =
    type === "light" ? 8 : type === "success" ? [10, 40, 10] : [20, 30, 20];

  navigator.vibrate(pattern);
}

export function useHaptic() {
  return triggerHaptic;
}

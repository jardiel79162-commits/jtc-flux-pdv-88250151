import { useEffect, useState, useCallback } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// Global state to persist across component mounts
let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;
let globalListenerAttached = false;
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((fn) => fn());
}

if (!globalListenerAttached && typeof window !== "undefined") {
  globalListenerAttached = true;

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    globalDeferredPrompt = e as BeforeInstallPromptEvent;
    notifyListeners();
  });

  window.addEventListener("appinstalled", () => {
    globalDeferredPrompt = null;
    notifyListeners();
  });
}

export function useInstallPrompt() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const rerender = () => setTick((t) => t + 1);
    listeners.add(rerender);
    return () => { listeners.delete(rerender); };
  }, []);

  const isInstalled = typeof window !== "undefined" && window.matchMedia("(display-mode: standalone)").matches;

  const install = useCallback(async () => {
    if (!globalDeferredPrompt) return false;
    globalDeferredPrompt.prompt();
    const { outcome } = await globalDeferredPrompt.userChoice;
    if (outcome === "accepted") {
      globalDeferredPrompt = null;
      notifyListeners();
      return true;
    }
    return false;
  }, []);

  return {
    isInstallable: !!globalDeferredPrompt && !isInstalled,
    isInstalled,
    install,
  };
}

import { useCallback, useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";

/**
 * Keeps an open conversation on the chat page.
 * Android back / corner swipe closes the thread and shows the chat list.
 */
export default function useChatThreadHistory(threadId, closeThread) {
  const threadRef = useRef(threadId);
  const closeRef = useRef(closeThread);
  threadRef.current = threadId;
  closeRef.current = closeThread;

  useEffect(() => {
    if (!threadId) return;
    window.history.pushState({ kridanaChatThread: threadId }, "");
  }, [threadId]);

  useEffect(() => {
    const onPop = () => {
      if (threadRef.current) {
        closeRef.current();
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return undefined;
    let handle;
    const setup = async () => {
      handle = await App.addListener("backButton", () => {
        if (!threadRef.current) return;
        closeRef.current();
      });
    };
    setup();
    return () => handle?.remove();
  }, []);

  const requestCloseThread = useCallback(() => {
    if (!threadRef.current) return;
    if (window.history.state?.kridanaChatThread) {
      window.history.back();
      return;
    }
    closeRef.current();
  }, []);

  return requestCloseThread;
}

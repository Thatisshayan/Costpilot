import { useEffect } from "react";
import { useLocation } from "wouter";

export function useKeyboardShortcuts() {
  const [, navigate] = useLocation();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (true) {
        case e.key === "d" && (e.metaKey || e.ctrlKey):
          e.preventDefault();
          navigate("/");
          break;
        case e.key === "e" && (e.metaKey || e.ctrlKey):
          e.preventDefault();
          navigate("/expenses");
          break;
        case e.key === "s" && (e.metaKey || e.ctrlKey):
          e.preventDefault();
          navigate("/subscriptions");
          break;
        case e.key === "b" && (e.metaKey || e.ctrlKey):
          e.preventDefault();
          navigate("/budgets");
          break;
        case e.key === "/" && (e.metaKey || e.ctrlKey):
          e.preventDefault();
          navigate("/search");
          break;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate]);
}

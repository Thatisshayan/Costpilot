import { createRoot } from "react-dom/client";
import { initSentry } from "@/lib/sentry";
import App from "./App";
import "./index.css";

initSentry();

window.addEventListener("online", () => console.log("[App] Back online"));
window.addEventListener("offline", () => console.log("[App] Offline"));

createRoot(document.getElementById("root")!).render(<App />);

import { copyFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

// GitHub Pages serves 404.html for a direct SPA route; absolute Vite base URLs
// then load the same application at the requested path (including invite queries).
const index = fileURLToPath(new URL("../dist/public/index.html", import.meta.url));
const fallback = fileURLToPath(new URL("../dist/public/404.html", import.meta.url));
if (!existsSync(index)) throw new Error("Missing web build entry");
copyFileSync(index, fallback);

// Local-only harness: serves the real web app with Clerk replaced by a signed-in stub,
// so layout can be checked in a real browser without network access or credentials.
import { defineConfig, mergeConfig } from "vite";
import path from "path";
import base from "../vite.config";

export default mergeConfig(base, defineConfig({
  base: "/",
  resolve: { alias: { "@clerk/react": path.resolve(import.meta.dirname, "clerk-stub.tsx") } },
  define: { "import.meta.env.VITE_CLERK_PUBLISHABLE_KEY": JSON.stringify("pk_test_e2e_stub") },
  server: { port: 4319, strictPort: true, host: "127.0.0.1" },
}));

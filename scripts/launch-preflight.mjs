// Reports names/status only. Never prints configuration values or secrets.
const required = ["DATABASE_URL", "CLERK_SECRET_KEY", "CLERK_WEBHOOK_SIGNING_SECRET",
  "ALLOWED_ORIGINS", "VITE_CLERK_PUBLISHABLE_KEY", "VITE_API_ORIGIN",
  "EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY", "EXPO_PUBLIC_API_ORIGIN", "PRIVACY_CONTACT_EMAIL"];
let failures = 0;
function check(name, valid) { console.log(`${name}: ${valid ? "OK" : "MISSING_OR_INVALID"}`); if (!valid) failures++; }
for (const name of required) check(name, Boolean(process.env[name]) && !/placeholder|replace.me|your[_-]/i.test(process.env[name]));
check("ENCRYPTION_MASTER_KEY", /^[a-f0-9]{64}$/i.test(process.env.KMS_MASTER_KEY || process.env.ENCRYPTION_KEY || ""));
for (const name of ["VITE_API_ORIGIN", "EXPO_PUBLIC_API_ORIGIN"]) {
  try { const url = new URL(process.env[name]); check(`${name}_HTTPS_ORIGIN`, url.protocol === "https:" && url.pathname === "/" && !url.search && !url.username && !url.password); }
  catch { check(`${name}_HTTPS_ORIGIN`, false); }
}
check("PRIVACY_CONTACT_FORMAT", /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(process.env.PRIVACY_CONTACT_EMAIL || ""));
console.log("Live sign-in, restore, monitoring delivery, release policy review and exact-SHA CI evidence are additional release gates.");
process.exitCode = failures ? 1 : 0;

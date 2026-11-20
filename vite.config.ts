import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (key && !key.startsWith("sb_publishable_")) {
    let role = "";
    try {
      role = JSON.parse(
        Buffer.from(key.split(".")[1], "base64url").toString(),
      ).role;
    } catch {
      /* Fail closed below, without printing the key. */
    }
    if (role !== "anon")
      throw Error(
        "Frontend configuration requires a publishable or legacy anon key. Build refused.",
      );
  }
  if (Boolean(env.VITE_SUPABASE_URL) !== Boolean(key))
    throw Error(
      "Set both public Supabase variables, or neither for an offline preview.",
    );
  return {
    plugins: [react()],
    server: { allowedHosts: [".e2b.app"] },
    preview: { allowedHosts: [".e2b.app"] },
  };
});

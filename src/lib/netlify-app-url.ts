import { safeHttpOrigin } from "./http-url";

const PREVIEW_CONTEXTS = new Set(["deploy-preview", "branch-deploy"]);

/**
 * Netlify sets CONTEXT and DEPLOY_PRIME_URL for the build. Preview and branch
 * deploys use that origin as the public app URL. Production keeps
 * NEXT_PUBLIC_APP_URL. The request Host header is never read.
 */
export function netlifyPreviewAppOrigin(
  env: { CONTEXT?: string; DEPLOY_PRIME_URL?: string } | NodeJS.ProcessEnv,
): string | null {
  const source = env as { CONTEXT?: string; DEPLOY_PRIME_URL?: string };
  if (!source.CONTEXT || !PREVIEW_CONTEXTS.has(source.CONTEXT)) return null;
  const origin = safeHttpOrigin(source.DEPLOY_PRIME_URL);
  if (!origin?.startsWith("https://")) return null;
  return origin;
}

type AppUrlEnv = {
  CONTEXT?: string;
  DEPLOY_PRIME_URL?: string;
  NEXT_PUBLIC_APP_URL?: string;
};

function currentAppUrlEnv(): AppUrlEnv {
  return process.env as NodeJS.ProcessEnv & AppUrlEnv;
}

export function applyNetlifyPreviewAppUrl(env: AppUrlEnv = currentAppUrlEnv()): void {
  const origin = netlifyPreviewAppOrigin(env);
  if (origin) env.NEXT_PUBLIC_APP_URL = origin;
}

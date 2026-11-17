export function getBaseUrl(request?: Request): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (envUrl) {
    return envUrl.replace(/\/+$/, "");
  }

  if (request) {
    const forwardedHost = request.headers.get("x-forwarded-host");
    const host = forwardedHost ?? request.headers.get("host");
    const proto = request.headers.get("x-forwarded-proto") ?? "https";
    if (host) {
      return `${proto}://${host}`;
    }
    try {
      return new URL(request.url).origin;
    } catch {
      // Fall through to default
    }
  }

  return "http://localhost:3000";
}

export function buildPasteUrl(id: string, request?: Request): string {
  return `${getBaseUrl(request)}/p/${id}`;
}

import { headers } from "next/headers";

function getFirstHeaderValue(value: string | null) {
  return value?.split(",")[0]?.trim();
}

export async function getRequestOrigin() {
  const headerStore = await headers();
  const protocol = getFirstHeaderValue(
    headerStore.get("x-forwarded-proto"),
  ) ?? "http";
  const host =
    getFirstHeaderValue(headerStore.get("x-forwarded-host")) ??
    getFirstHeaderValue(headerStore.get("host"));

  if (!host) {
    throw new Error("Unable to determine request origin.");
  }

  return `${protocol}://${host}`;
}

export function normalizeNextPath(value: FormDataEntryValue | string | null) {
  const nextPath = typeof value === "string" ? value : value?.toString();

  if (!nextPath || !nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return "/dashboard";
  }

  return nextPath;
}

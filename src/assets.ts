/** Store object paths, not local gateway hosts. Preserve external legacy HTTPS photos. */
export function assetUrl(ref: string): string {
  return ref.startsWith("/storage/v1/object/public/")
    ? `${import.meta.env.VITE_SUPABASE_URL}${ref}`
    : ref;
}
export function assetRef(url: string): string {
  const prefix = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/`;
  return url.startsWith(prefix) ? new URL(url).pathname : url;
}

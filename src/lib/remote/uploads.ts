import type { SupabaseClient } from '@supabase/supabase-js';

import { newId } from '@/lib/validation';

/**
 * Photo, video and document uploads. The app keeps picked files as local
 * URIs; before saving, each one is uploaded once and replaced by its storage
 * path. Paths start with the uploader's user id (or the order id for order
 * photos), which is what the storage rules check.
 */
export type Bucket = 'public-photos' | 'order-photos' | 'documents';
export type Uploader = (bucket: Bucket, path: string, localUri: string) => Promise<void>;

const LOCAL = /^(file:|content:|ph:|blob:|data:|assets-library:)/;
const EXTENSIONS: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
  pdf: 'application/pdf',
};

/** A file's extension from its URI, defaulting to jpg (most picked files are photos). */
export function extensionOf(uri: string): string {
  const match = /\.([a-z0-9]{2,4})(?:[?#].*)?$/i.exec(uri);
  const ext = match?.[1]?.toLowerCase();
  return ext && EXTENSIONS[ext] ? ext : 'jpg';
}

export function contentTypeOf(uri: string): string {
  return EXTENSIONS[extensionOf(uri)];
}

/** The storage path inside a Supabase public or signed URL for one of our buckets, or null. */
export function storagePathFromUrl(url: string, bucket: Bucket): string | null {
  const match = new RegExp(`/storage/v1/object/(?:public|sign)/${bucket}/([^?#]+)`).exec(url);
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Makes sure a file is in storage and returns its path. Local files are
 * uploaded under `folder`; files already in storage keep their path; bundled
 * demo photos and outside links are kept as they are.
 */
export async function ensureUploaded(
  upload: Uploader,
  uri: string | undefined | null,
  bucket: Bucket,
  folder: string,
): Promise<string | null> {
  if (!uri) return null;
  if (uri.startsWith('demo:')) return uri;
  if (/^https?:/.test(uri)) return storagePathFromUrl(uri, bucket) ?? uri;
  if (!LOCAL.test(uri)) return uri;
  const path = `${folder}/${newId('f')}.${extensionOf(uri)}`;
  await upload(bucket, path, uri);
  return path;
}

/** The real uploader: reads the local file and puts it in the bucket. */
export function supabaseUploader(db: SupabaseClient): Uploader {
  return async (bucket, path, localUri) => {
    const file = await fetch(localUri);
    const body = await file.arrayBuffer();
    const { error } = await db.storage.from(bucket).upload(path, body, { contentType: contentTypeOf(localUri), upsert: false });
    if (error) throw new Error(`Upload failed: ${error.message}`);
  };
}

/** A short-lived link to a private file (order photos, documents), or the path itself if signing fails. */
export function privateUrlMaker(db: SupabaseClient, cache: Map<string, string>): (path: string) => string {
  return (path) => cache.get(path) ?? path;
}

/** Signs private paths in bulk so screens can show them; fills `cache`. */
export async function signPrivatePaths(db: SupabaseClient, bucket: Bucket, paths: string[], cache: Map<string, string>) {
  const todo = [...new Set(paths)].filter((p) => p && !cache.has(p) && !/^(https?:|demo:)/.test(p));
  if (!todo.length) return;
  const { data } = await db.storage.from(bucket).createSignedUrls(todo, 60 * 60);
  for (const item of data ?? []) if (item.path && item.signedUrl) cache.set(item.path, item.signedUrl);
}

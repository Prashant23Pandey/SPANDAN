// ============================================================================
// File: src/utils/mediaStorage.ts
// Saves client-side processed images sent as data URLs (base64) to disk.
// ============================================================================

import fs from 'fs/promises';
import path from 'path';

const MAX_BYTES = 5 * 1024 * 1024; // 5MB

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png':  'png',
  'image/webp': 'webp',
};

export interface SaveDataUrlOptions {
  dataUrl: string;
  userId: number;
  kind: 'avatar' | 'signature';
}

export interface SaveDataUrlResult {
  relativePath: string; // served by express static
  mime: string;
  bytes: number;
}

function parseDataUrl(dataUrl: string): { mime: string; buffer: Buffer } {
  const match = /^data:([^;]+);base64,(.+)$/i.exec(dataUrl.trim());
  if (!match) throw new Error('Invalid image payload (expected data URL).');

  const mime = match[1].toLowerCase();
  const base64 = match[2];
  const buffer = Buffer.from(base64, 'base64');
  return { mime, buffer };
}

export async function saveProfileImageDataUrl(opts: SaveDataUrlOptions): Promise<SaveDataUrlResult> {
  const { mime, buffer } = parseDataUrl(opts.dataUrl);

  const ext = MIME_TO_EXT[mime];
  if (!ext) throw new Error('Unsupported image type. Allowed: JPEG, PNG, WebP.');
  if (buffer.byteLength > MAX_BYTES) throw new Error('Image exceeds the 5MB limit.');

  const fileName = `${opts.kind}_${opts.userId}_${Date.now()}.${ext}`;
  const uploadsDir = path.join(__dirname, '../../uploads/profile');
  const absPath = path.join(uploadsDir, fileName);

  await fs.mkdir(uploadsDir, { recursive: true });
  await fs.writeFile(absPath, buffer);

  return {
    relativePath: `/uploads/profile/${fileName}`,
    mime,
    bytes: buffer.byteLength,
  };
}


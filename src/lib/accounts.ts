import { avatarCropDimensions } from './logic';
import { supabase } from './supabase';

export async function cropAvatar(file: File): Promise<Blob> {
  const source = await createImageBitmap(file);
  const crop = avatarCropDimensions(source.width, source.height);
  const canvas = document.createElement('canvas');
  canvas.width = crop.width;
  canvas.height = crop.height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('画像を処理できませんでした。');
  context.drawImage(
    source,
    crop.sourceX,
    crop.sourceY,
    crop.sourceSize,
    crop.sourceSize,
    0,
    0,
    crop.width,
    crop.height
  );
  source.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('画像を処理できませんでした。'))),
      'image/jpeg',
      0.9
    )
  );
}

export function avatarUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return supabase?.storage.from('avatars').getPublicUrl(path).data.publicUrl ?? null;
}

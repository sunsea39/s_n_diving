import { calculateResizeDimensions } from './logic';

export async function resizeToJpeg(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) throw new Error('画像ファイルを選択してください。');
  const source = await createImageBitmap(file);
  const size = calculateResizeDimensions(source.width, source.height);
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  canvas.getContext('2d')?.drawImage(source, 0, 0, size.width, size.height);
  source.close();
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error('画像を変換できませんでした。'))),
      'image/jpeg',
      0.8
    )
  );
  return new File([blob], 'board-image.jpg', { type: 'image/jpeg' });
}

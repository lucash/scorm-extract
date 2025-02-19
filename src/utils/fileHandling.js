export async function readLargeFile(file, onProgress) {
  const chunkSize = 10 * 1024 * 1024; // 10MB Chunks
  const fileSize = file.size;
  let offset = 0;
  const chunks = [];

  while (offset < fileSize) {
    const chunk = file.slice(offset, offset + chunkSize);
    try {
      const buffer = await chunk.arrayBuffer();
      chunks.push(buffer);
      
      offset += chunkSize;
      const progress = Math.min((offset / fileSize) * 100, 100);
      onProgress?.(progress);
      
    } catch (error) {
      throw new Error(`Error reading file at position ${offset}: ${error.message}`);
    }
  }

  return new Blob(chunks, { type: file.type });
} 
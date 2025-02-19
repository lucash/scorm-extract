/**
 * Formats a byte size into a readable form
 * @param {number} bytes - Number of bytes
 * @returns {string} Formatted size (e.g. "1.5 MB")
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Calculates the total size of a SCORM package
 * @param {JSZip} zip - The ZIP object
 * @param {string} packagePath - Path to the SCORM package within the ZIP
 * @returns {string} Formatted total size
 */
export async function calculatePackageSize(zip, packagePath) {
  let totalSize = 0
  
  const files = Object.entries(zip.files).filter(([path, file]) => 
    path.startsWith(packagePath) && !file.dir
  )
  
  // Load all files in parallel
  const sizes = await Promise.all(
    files.map(async ([_, file]) => {
      const content = await file.async('arraybuffer')
      return content.byteLength
    })
  )
  
  totalSize = sizes.reduce((sum, size) => sum + size, 0)
  return formatFileSize(totalSize)
} 
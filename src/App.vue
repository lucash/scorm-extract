<template>
  <v-app>
    <v-main>
      <v-container>
        <h1>SCORM Package Helper</h1>
        
        <FileUpload @file-loaded="handleFile" />

        <v-progress-linear
          v-if="processing"
          indeterminate
          color="primary"
        ></v-progress-linear>

        <v-alert
          v-if="error"
          type="error"
          class="mt-4"
          closable
          @click:close="error = null"
        >
          {{ error }}
        </v-alert>

        <v-alert
          v-if="isValidScormPackage"
          type="success"
          class="mt-4"
        >
          The uploaded ZIP file is already a valid SCORM 1.2 package.
        </v-alert>

        <v-card v-else-if="scormPackages.length > 0" class="mt-4">
          <v-card-title>Found SCORM Packages</v-card-title>
          <v-card-text>
            <v-list>
              <v-list-item
                v-for="(pkg, index) in scormPackages"
                :key="index"
              >
                <template v-slot:prepend>
                  <v-icon :icon="pkg.isZip ? 'mdi-zip-box' : 'mdi-folder'"></v-icon>
                </template>
                
                <v-list-item-title>
                  <div class="d-flex align-center">
                    <span class="text-body-2 text-medium-emphasis">{{ pkg.containerPath }}</span>
                    <v-icon size="small" class="mx-1">mdi-chevron-right</v-icon>
                    <span>{{ pkg.name }}</span>
                  </div>
                </v-list-item-title>

                <v-list-item-subtitle class="d-flex align-center">
                  <span v-if="pkg.warning" class="text-warning">
                    <v-icon color="warning" size="small" class="mr-1">mdi-alert</v-icon>
                    {{ pkg.warning }}
                  </span>
                  <span v-if="pkg.size" :class="{ 'ml-2': pkg.warning }">
                    <v-icon size="small" class="mr-1">mdi-file-outline</v-icon>
                    {{ pkg.size }}
                  </span>
                  <v-btn
                    v-if="!pkg.size"
                    variant="text"
                    size="small"
                    :loading="pkg.calculatingSize"
                    :class="{ 'ml-2': pkg.warning }"
                    @click="calculateSize(pkg)"
                  >
                    Calculate size
                  </v-btn>
                </v-list-item-subtitle>

                <template v-slot:append>
                  <v-btn
                    color="primary"
                    @click="downloadPackage(pkg)"
                  >
                    Download
                  </v-btn>
                </template>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup>
import { ref } from 'vue'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import { validateScormManifest } from './utils/scormValidator'
import { calculatePackageSize } from './utils/fileSize'
import FileUpload from './components/FileUpload.vue'

const processing = ref(false)
const scormPackages = ref([])
const isValidScormPackage = ref(false)
const error = ref(null)

async function handleFile(blob) {
  processing.value = true
  scormPackages.value = []
  isValidScormPackage.value = false
  error.value = null
  
  try {
    const mainZip = await JSZip.loadAsync(blob)
    
    // First check if the main ZIP itself is a valid SCORM package
    const manifestFile = mainZip.file('imsmanifest.xml')
    if (manifestFile) {
      const warning = await validateScormManifest(manifestFile)
      if (!warning) {
        isValidScormPackage.value = true
        return
      }
    }
    
    // If not, search for SCORM packages in the ZIP
    await findScormPackages(mainZip, '', false)
  } catch (err) {
    error.value = `Error processing file: ${err.message}`
    console.error('Processing error:', err)
  } finally {
    processing.value = false
  }
}

async function findScormPackages(zip, basePath, isNestedZip) {
  const files = []
  
  zip.forEach((path, file) => {
    files.push({ path, file })
  })
  
  for (const { path, file } of files) {
    if (path.endsWith('imsmanifest.xml')) {
      const packagePath = path.replace('imsmanifest.xml', '')
      const pathParts = (basePath + packagePath).split('/')
      
      // Use the name of the directory containing the manifest
      const name = pathParts.filter(Boolean).pop() || 'scorm-package'
      pathParts.pop() // Remove the name from path parts
      
      // Container path with slash between ZIP and subdirectories
      const containerPathParts = pathParts.filter(Boolean)
      if (containerPathParts.length > 0) {
        if (isNestedZip) {
          // Find the last ZIP file in the path
          let lastZipIndex = containerPathParts.length - 1
          for (let i = containerPathParts.length - 1; i >= 0; i--) {
            if (containerPathParts[i].endsWith('.zip')) {
              break
            }
            lastZipIndex = i - 1
          }
          
          // Add .zip to the last ZIP file if not already present
          if (lastZipIndex >= 0 && !containerPathParts[lastZipIndex].endsWith('.zip')) {
            containerPathParts[lastZipIndex] = containerPathParts[lastZipIndex] + '.zip'
          }
          
          // Add slash between ZIP and subsequent folders
          if (lastZipIndex >= 0 && lastZipIndex < containerPathParts.length - 1) {
            containerPathParts[lastZipIndex] = containerPathParts[lastZipIndex] + ' / '
          }
        }
      }
      const containerPath = containerPathParts.join('/')
      
      const warning = await validateScormManifest(file)
      
      scormPackages.value.push({
        path: basePath + packagePath,
        zip,
        packagePath,
        name,
        containerPath,
        isZip: isNestedZip,
        warning,
        size: null,
        calculatingSize: false
      })
    }
    
    if (path.endsWith('.zip')) {
      const nestedZip = await JSZip.loadAsync(await file.async('blob'))
      const newBasePath = basePath + path
      await findScormPackages(nestedZip, newBasePath, true)
    }
  }
}

async function downloadPackage(pkg) {
  const newZip = new JSZip()
  
  // Copy all files from the found package path
  pkg.zip.forEach((path, file) => {
    if (path.startsWith(pkg.packagePath)) {
      const newPath = path.replace(pkg.packagePath, '')
      if (newPath) {
        newZip.file(newPath, file.async('blob'))
      }
    }
  })
  
  // Save as new ZIP file
  const content = await newZip.generateAsync({ 
    type: 'blob',
    compression: 'DEFLATE',  // Explicit compression
    compressionOptions: {
      level: 9  // Maximum compression
    }
  })
  saveAs(content, `${pkg.name}.zip`)
}

async function calculateSize(pkg) {
  pkg.calculatingSize = true
  try {
    pkg.size = await calculatePackageSize(pkg.zip, pkg.packagePath)
  } catch (error) {
    console.error('Error calculating size:', error)
  } finally {
    pkg.calculatingSize = false
  }
}
</script>

<style scoped>
.text-medium-emphasis {
  opacity: 0.7;
}

.text-warning {
  color: #FB8C00 !important;
}
</style> 
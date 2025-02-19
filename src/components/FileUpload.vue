<script setup>
import { ref } from 'vue';
import { readLargeFile } from '../utils/fileHandling';

const uploadProgress = ref(0);
const isUploading = ref(false);

// Event-Definition
const emit = defineEmits(['file-loaded']);

async function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  isUploading.value = true;
  uploadProgress.value = 0;

  try {
    const blob = await readLargeFile(file, (progress) => {
      uploadProgress.value = progress;
    });
    
    // Blob an die übergeordnete Komponente senden
    emit('file-loaded', blob);
    
  } catch (error) {
    console.error('Upload error:', error);
    // Error handling here
  } finally {
    isUploading.value = false;
  }
}
</script>

<template>
  <div>
    <input 
      type="file" 
      @change="handleFileUpload"
      :disabled="isUploading"
    >
    <v-progress-linear
      v-if="isUploading"
      :value="uploadProgress"
      color="primary"
    />
  </div>
</template> 
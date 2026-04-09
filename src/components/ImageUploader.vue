<template>
  <div class="bg-navy rounded-2xl p-5 border border-[#4a4a4a]">
    <label class="block text-sm font-semibold text-on-dark mb-3">
      Logo / Pittogramma
    </label>
    <!-- Drop zone (no image yet) -->
    <div
      v-if="!preview"
      @click="fileInput.click()"
      @dragover.prevent="dragging = true"
      @dragleave.prevent="dragging = false"
      @drop.prevent="handleDrop"
      :class="[
        'border-2 border-dashed rounded-xl px-6 py-12 flex flex-col items-center gap-3 cursor-pointer transition-all select-none',
        dragging
          ? 'border-accent bg-accent/10'
          : 'border-[#555] hover:border-accent/50 hover:bg-white/5'
      ]"
    >
      <svg
        class="w-10 h-10 text-ghost"
        xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14
             m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
      </svg>
      <div class="text-center">
        <p class="text-sm font-medium text-on-dark">Trascina il file qui o clicca per sfogliare</p>
        <p class="text-xs text-ghost mt-1">PNG, JPG, SVG — max 10 MB</p>
      </div>
    </div>

    <!-- Preview -->
    <div v-else>
      <!-- Checkered background to show transparency -->
      <div
        class="rounded-xl overflow-hidden flex items-center justify-center"
        style="
          min-height: 180px;
          background-image:
            repeating-conic-gradient(#E0E0D8 0% 25%, #F5F5F0 0% 50%);
          background-size: 16px 16px;
        "
      >
        <img
          :src="preview"
          alt="Anteprima logo"
          class="max-h-56 max-w-full object-contain p-3"
        />
      </div>

      <div class="mt-3 flex items-center gap-3">
        <p class="text-xs text-ghost truncate flex-1">{{ fileName }}</p>
        <button
          @click="fileInput.click()"
          class="text-xs text-on-dark hover:text-accent transition-colors font-medium shrink-0"
        >Sostituisci</button>
        <button
          @click="clear"
          class="text-xs text-accent hover:text-accent-dark transition-colors font-medium shrink-0"
        >Rimuovi</button>
      </div>
    </div>

    <input
      ref="fileInput"
      type="file"
      accept="image/png,image/jpeg,image/jpg,image/svg+xml"
      class="hidden"
      @change="handleFileChange"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'

const emit = defineEmits(['update:image'])

const fileInput = ref(null)
const preview   = ref('')
const fileName  = ref('')
const dragging  = ref(false)

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml']
const MAX_SIZE      = 10 * 1024 * 1024 // 10 MB

function handleDrop(e) {
  dragging.value = false
  const file = e.dataTransfer.files[0]
  if (file) processFile(file)
}

function handleFileChange(e) {
  const file = e.target.files[0]
  if (file) processFile(file)
}

function processFile(file) {
  if (!ALLOWED_TYPES.includes(file.type)) {
    alert('Formato non supportato. Usa PNG, JPG o SVG.')
    return
  }
  if (file.size > MAX_SIZE) {
    alert('Il file supera il limite di 10 MB.')
    return
  }

  fileName.value = file.name

  const reader = new FileReader()
  reader.onload = (e) => {
    preview.value = e.target.result
    emit('update:image', {
      dataUrl:  e.target.result,
      mimeType: file.type,
      name:     file.name,
    })
  }
  reader.readAsDataURL(file)
}

function clear() {
  preview.value  = ''
  fileName.value = ''
  if (fileInput.value) fileInput.value.value = ''
  emit('update:image', null)
}
</script>

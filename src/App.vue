<template>
  <div class="min-h-screen bg-page font-sans">

    <!-- ── Header ─────────────────────────────────────────────────── -->
    <header class="bg-navy border-b border-[#4a4a4a] sticky top-0 z-10">
      <div class="px-6 py-3 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <img src="/logo.svg" alt="Segno" class="h-16" />
        </div>
        <span class="text-xs text-ghost tracking-widest uppercase select-none">
          <img src="/logo_smart.png" alt="SEGNO" class="h-22" />
        </span>
      </div>
    </header>

    <!-- ── Main ───────────────────────────────────────────────────── -->
    <main class="px-4 sm:px-6 py-8">
      <!-- Error banner -->
      <div
        v-if="error"
        class="mb-6 p-4 rounded-xl flex items-start gap-3"
        style="background: color-mix(in srgb, var(--color-accent) 12%, transparent); border: 1px solid var(--color-accent);"
      >
        <span class="text-accent font-bold text-sm leading-none mt-0.5">!</span>
        <span class="text-on-dark text-sm">{{ error }}</span>
        <button
          @click="error = ''"
          class="ml-auto text-ghost hover:text-on-dark transition-colors text-lg leading-none"
        >×</button>
      </div>

      <!-- Two-column grid: 36 / 64 -->
      <div class="grid grid-cols-1 lg:grid-cols-[36fr_64fr] gap-6 items-start">

        <!-- ── Left column (sticky) ────────────────────────────────── -->
        <div class="space-y-5 lg:sticky lg:top-35 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:pr-1">
          <ImageUploader @update:image="handleImage" />

          <!-- Mode toggle -->
          <div class="bg-navy rounded-2xl border border-[#4a4a4a] px-5 py-4">
            <p class="text-xs text-ghost mb-3 font-medium uppercase tracking-wide">Tipo di analisi</p>
            <div class="flex gap-2">
              <button
                v-for="m in ['logo', 'pittogramma']" :key="m"
                @click="analysisMode = m"
                class="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all text-center capitalize"
                :class="analysisMode === m
                  ? 'bg-accent text-white'
                  : 'bg-[#2a2a2a] text-ghost border border-[#4a4a4a] hover:text-on-dark'"
              >{{ m }}</button>
            </div>
          </div>

          <ReviewOptions v-model="selectedCriteria" />

          <!-- Context textarea -->
          <div class="bg-navy rounded-2xl border border-[#4a4a4a]">
            <button
              @click="contextOpen = !contextOpen"
              class="w-full px-5 py-4 flex items-center justify-between cursor-pointer"
            >
              <div class="flex items-center gap-2">
                <span class="text-sm font-semibold text-on-dark">Contesto del progetto</span>
                <span class="font-normal text-ghost text-xs">(opzionale)</span>
              </div>
              <svg
                class="w-4 h-4 text-ghost transition-transform duration-200"
                :class="{ 'rotate-180': contextOpen }"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/>
              </svg>
            </button>
            <div v-show="contextOpen" class="px-5 pb-5">
              <p class="text-xs text-ghost mb-3">
                Brief dello studente: azienda, settore, pubblico, obiettivo comunicativo.
              </p>
              <textarea
                v-model="projectContext"
                rows="4"
                placeholder="Es. Logo per uno studio di architettura minimalista rivolto a clienti premium…"
                class="w-full resize-none rounded-xl px-4 py-3 text-sm text-on-dark bg-[#2a2a2a] border border-[#4a4a4a] placeholder-ghost/40
                       focus:outline-none focus:border-accent transition-colors"
              ></textarea>
            </div>
          </div>

          <!-- Analyze button -->
          <button
            @click="analyze"
            :disabled="loading || !imageData || selectedCriteria.length === 0"
            class="w-full py-4 rounded-2xl text-sm font-semibold tracking-widest uppercase
                   bg-accent text-white transition-all
                   hover:bg-accent-dark
                   disabled:opacity-40 disabled:cursor-not-allowed
                   flex items-center justify-center gap-2"
          >
            <template v-if="loading">
              <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
              Analisi in corso…
            </template>
            <template v-else>
              Analizza
            </template>
          </button>

          <!-- Inline validation hints -->
          <ul v-if="!loading && (!imageData || selectedCriteria.length === 0)" class="space-y-1">
            <li v-if="!imageData" class="text-xs text-ghost flex items-center gap-1.5">
              <span class="text-accent">↑</span> Carica un'immagine per procedere
            </li>
            <li v-if="selectedCriteria.length === 0" class="text-xs text-ghost flex items-center gap-1.5">
              <span class="text-accent">↑</span> Seleziona almeno un criterio di revisione
            </li>
          </ul>
        </div>

        <!-- ── Right column ────────────────────────────────────────── -->
        <div>
          <FeedbackOutput
            :feedback="feedback"
            :loading="loading"
            :image-data="imageData"
            :criteria="selectedCriteria"
            :context="projectContext"
            :review-date="reviewDate"
            :mode="analysisMode"
          />
        </div>

      </div>
    </main>

    <!-- ── API Key (bottom-left, subtle) ─────────────────────────── -->
    <ApiKeyInput v-model="apiKey" />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import ApiKeyInput    from './components/ApiKeyInput.vue'
import ImageUploader  from './components/ImageUploader.vue'
import ReviewOptions  from './components/ReviewOptions.vue'
import FeedbackOutput from './components/FeedbackOutput.vue'
import { analyzeImage } from './utils/anthropic.js'

const apiKey          = ref(localStorage.getItem('anthropic_api_key') || '')
const imageData       = ref(null)
const selectedCriteria = ref([
  'Leggibilità e chiarezza del segno',
  'Bilanciamento visivo e proporzioni',
  'Originalità e coerenza concettuale',
  'Uso del colore',
  'Scalabilità e versatilità',
])
const projectContext  = ref('')
const feedback        = ref('')
const loading         = ref(false)
const error           = ref('')
const reviewDate      = ref(null)
const contextOpen     = ref(false)
const analysisMode    = ref('logo')

function handleImage(data) {
  imageData.value  = data
  feedback.value   = ''
  error.value      = ''
  reviewDate.value = null
}

async function analyze() {
  if (!apiKey.value.trim()) {
    error.value = 'Inserisci la tua API key Anthropic per procedere.'
    return
  }
  if (!imageData.value) {
    error.value = "Carica un'immagine prima di procedere."
    return
  }
  if (selectedCriteria.value.length === 0) {
    error.value = 'Seleziona almeno un criterio di revisione.'
    return
  }

  loading.value = true
  error.value   = ''
  feedback.value = ''

  try {
    feedback.value   = await analyzeImage({
      apiKey:       apiKey.value.trim(),
      imageDataUrl: imageData.value.dataUrl,
      criteria:     selectedCriteria.value,
      context:      projectContext.value,
      mode:         analysisMode.value,
    })
    reviewDate.value = new Date()
  } catch (err) {
    error.value = err.message || "Si è verificato un errore durante l'analisi. Riprova."
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="bg-navy rounded-2xl border border-[#4a4a4a] flex flex-col" style="min-height: 520px;">

    <!-- Panel header -->
    <div class="px-5 py-4 border-b border-[#4a4a4a] flex items-center justify-between shrink-0">
      <h2 class="text-sm font-semibold text-on-dark">Revisione</h2>
      <span v-if="reviewDate" class="text-xs text-ghost">
        {{ reviewDate.toLocaleDateString('it-IT', { day:'2-digit', month:'long', year:'numeric' }) }}
        &nbsp;—&nbsp;
        {{ reviewDate.toLocaleTimeString('it-IT', { hour:'2-digit', minute:'2-digit' }) }}
      </span>
    </div>

    <!-- ── Empty state ───────────────────────────────────────────── -->
    <div v-if="!loading && !feedback" class="flex-1 flex items-center justify-center p-10">
      <div class="text-center max-w-xs">
        <svg
          class="w-12 h-12 mx-auto mb-4 text-ghost/40"
          xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.2"
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586
               a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
        </svg>
        <p class="text-sm text-ghost leading-relaxed">
          Carica un logo, seleziona i criteri<br>e clicca
          <strong class="text-on-dark font-semibold">Analizza</strong>
          per ricevere il feedback.
        </p>
      </div>
    </div>
    <!-- ── Loading state ─────────────────────────────────────────── -->
    <div v-else-if="loading" class="flex-1 flex items-center justify-center p-10">
      <div class="text-center">
        <svg
          class="animate-spin h-8 w-8 text-accent mx-auto mb-4"
          xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
        >
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
          <path class="opacity-75" fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
        </svg>
        <p class="text-sm font-medium text-on-dark">Analisi in corso…</p>
        <p class="text-xs text-ghost mt-1">Claude sta esaminando il tuo logo</p>
      </div>
    </div>

    <!-- ── Feedback content ──────────────────────────────────────── -->
    <div v-else class="flex-1 overflow-y-auto px-5 py-5">
      <div
        class="feedback-body text-sm leading-relaxed"
        v-html="rendered"
      ></div>
    </div>

    <!-- ── PDF button ────────────────────────────────────────────── -->
    <div v-if="feedback && !loading" class="px-5 py-4 border-t border-[#4a4a4a] shrink-0">
      <button
        @click="handleExportPdf"
        :disabled="exporting"
        class="w-full py-3 rounded-xl text-sm font-semibold tracking-wide uppercase
               border-2 border-accent text-accent
               hover:bg-accent hover:text-white
               disabled:opacity-50 disabled:cursor-not-allowed
               transition-all flex items-center justify-center gap-2"
      >
        <svg
          v-if="!exporting"
          class="h-4 w-4"
          xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586
               a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
        </svg>
        <svg
          v-else
          class="animate-spin h-4 w-4"
          fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"
        >
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
          <path class="opacity-75" fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
        </svg>
        {{ exporting ? 'Generazione PDF…' : 'Scarica revisione PDF' }}
      </button>
    </div>

  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { exportReviewPdf } from '../utils/exportPdf.js'

const props = defineProps({
  feedback:   { type: String,  default: '' },
  loading:    { type: Boolean, default: false },
  imageData:  { type: Object,  default: null },
  criteria:   { type: Array,   default: () => [] },
  context:    { type: String,  default: '' },
  reviewDate: { type: Date,    default: null },
  mode:       { type: String,  default: 'logo' },
})

const exporting = ref(false)

// ── Simple Markdown renderer (safe: HTML is escaped first) ────────
function esc(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function applyInline(s) {
  // **bold**, *italic*
  return s
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*\n]+?)\*/g, '<em>$1</em>')
}

function renderMarkdown(text) {
  const lines = text.split('\n')
  let html = ''
  let inList = false

  for (const line of lines) {
    const trimmed = line.trim()

    // Close list block when non-bullet line encountered
    if (inList && !trimmed.match(/^[-*•]\s/)) {
      html += '</ul>'
      inList = false
    }

    if (trimmed.startsWith('## ')) {
      html += `<h2 class="fb-h2">${applyInline(esc(trimmed.slice(3)))}</h2>`
    } else if (trimmed.startsWith('### ')) {
      const text = trimmed.slice(4)
      const lower = text.toLowerCase()
      let cls = 'fb-h3'
      if (lower.includes('forza') || lower.includes('positiv') || lower.includes('funziona') || lower.includes('efficac')) {
        cls = 'fb-h3 fb-h3--strength'
      } else if (lower.includes('miglior') || lower.includes('critic') || lower.includes('attenzione') || lower.includes('debolezz')) {
        cls = 'fb-h3 fb-h3--improve'
      }
      html += `<h3 class="${cls}">${applyInline(esc(text))}</h3>`
    } else if (trimmed.startsWith('# ')) {
      html += `<h1 class="fb-h1">${applyInline(esc(trimmed.slice(2)))}</h1>`
    } else if (trimmed.match(/^[-*•]\s/)) {
      if (!inList) { html += '<ul class="fb-list">'; inList = true }
      html += `<li class="fb-li"><span class="fb-bullet">▸</span><span>${applyInline(esc(trimmed.slice(2)))}</span></li>`
    } else if (trimmed === '') {
      // skip empty lines (spacing handled by margins)
    } else {
      html += `<p class="fb-p">${applyInline(esc(trimmed))}</p>`
    }
  }

  if (inList) html += '</ul>'
  return html
}

const rendered = computed(() => props.feedback ? renderMarkdown(props.feedback) : '')

async function handleExportPdf() {
  exporting.value = true
  try {
    await exportReviewPdf({
      imageDataUrl: props.imageData?.dataUrl ?? null,
      criteria:     props.criteria,
      context:      props.context,
      feedback:     props.feedback,
      reviewDate:   props.reviewDate,
      mode:         props.mode,
    })
  } finally {
    exporting.value = false
  }
}
</script>

<style scoped>
/* ── Feedback typography hierarchy ─────────────────────────────── */

.feedback-body :deep(.fb-h1) {
  font-size: 38px;
  font-weight: 600;
  color: var(--color-accent);
  margin-top: 40px;
  margin-bottom: 16px;
  line-height: 1.05;
}

.feedback-body :deep(.fb-h2) {
  font-size: 26px;
  font-weight: 600;
  text-transform: uppercase;
  color: #4F4862;
  margin-top: 36px;
  margin-bottom: 12px;
  padding-bottom: 10px;
}

.feedback-body :deep(.fb-h3) {
  font-size: 20px;
  font-weight: 600;
  color: #F5F5F0;
  margin-top: 24px;
  margin-bottom: 8px;
  line-height: 1.25;
  display: flex;
  align-items: center;
  gap: 10px;
}

.feedback-body :deep(.fb-h3--strength) {
  color: #4ADE80;
}

.feedback-body :deep(.fb-h3--strength)::before {
  content: '';
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  display: block;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%234ADE80' stroke='none'%3E%3Cpath d='M12 1.5l2.94 5.96 6.58.96-4.76 4.64 1.12 6.56L12 16.27l-5.88 3.39 1.12-6.56L2.48 8.42l6.58-.96L12 1.5z'/%3E%3C/svg%3E") no-repeat center / contain;
}

.feedback-body :deep(.fb-h3--improve) {
  color: var(--color-accent);
}

.feedback-body :deep(.fb-h3--improve)::before {
  content: '';
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  display: block;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23FF5D04' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='10'/%3E%3Ccircle cx='12' cy='12' r='6'/%3E%3Ccircle cx='12' cy='12' r='2'/%3E%3C/svg%3E") no-repeat center / contain;
}

.feedback-body :deep(.fb-p) {
  font-size: 16px;
  line-height: 1.8;
  color: #c8c8c8;
  margin-bottom: 8px;
  font-weight: 400;
}

.feedback-body :deep(.fb-p strong) {
  color: #F5F5F0;
  font-weight: 500;
}

.feedback-body :deep(.fb-p em) {
  color: #a0a0a0;
  font-style: italic;
}

.feedback-body :deep(.fb-list) {
  margin: 12px 0;
  padding: 0 0 0 4px;
  list-style: none;
}

.feedback-body :deep(.fb-li) {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  font-size: 16px;
  line-height: 1.75;
  color: #c8c8c8;
  font-weight: 400;
  margin-bottom: 8px;
}

.feedback-body :deep(.fb-li strong) {
  color: #F5F5F0;
  font-weight: 500;
}

.feedback-body :deep(.fb-bullet) {
  color: var(--color-accent);
  font-weight: 500;
  font-size: 18px;
  flex-shrink: 0;
  line-height: 1.55;
}

.feedback-body :deep(.fb-gap) {
  height: 12px;
}

/* First h2 needs less top margin */
.feedback-body :deep(.fb-h2:first-child) {
  margin-top: 0;
}
</style>

<template>
  <div class="fixed bottom-4 left-4 z-20">
    <!-- Collapsed: small key icon -->
    <button
      v-if="!open"
      @click="open = true"
      class="flex items-center gap-2 bg-navy/90 backdrop-blur-sm text-on-dark
             rounded-full px-3 py-2 text-xs shadow-lg
             hover:bg-navy transition-colors"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/>
      </svg>
      <span v-if="hasKey" class="w-1.5 h-1.5 rounded-full bg-green-400"></span>
      <span v-else class="text-ghost">API Key</span>
    </button>

    <!-- Expanded: input panel -->
    <div
      v-else
      class="bg-navy/95 backdrop-blur-sm rounded-xl shadow-xl p-3 w-80 border border-[#4a4a4a]"
    >
      <div class="flex items-center justify-between mb-2">
        <label class="text-xs font-medium text-on-dark/70">API Key Anthropic</label>
        <div class="flex items-center gap-2">
          <a
            href="https://console.anthropic.com/settings/keys"
            target="_blank"
            rel="noopener noreferrer"
            class="text-[10px] text-accent hover:text-accent-dark transition-colors"
          >Ottieni ↗</a>
          <button
            @click="open = false"
            class="text-ghost hover:text-on-dark transition-colors text-sm leading-none"
          >×</button>
        </div>
      </div>

      <div class="relative">
        <input
          :type="visible ? 'text' : 'password'"
          :value="modelValue"
          @input="handleInput"
          placeholder="sk-ant-api03-…"
          autocomplete="off"
          spellcheck="false"
          class="w-full bg-[#2a2a2a] text-on-dark placeholder-ghost/40 border border-[#4a4a4a] rounded-lg
                 px-3 py-2 pr-9 text-xs font-mono
                 focus:outline-none focus:border-accent transition-colors"
        />
        <button
          type="button"
          @click="visible = !visible"
          :aria-label="visible ? 'Nascondi chiave' : 'Mostra chiave'"
          class="absolute right-2.5 top-1/2 -translate-y-1/2 text-ghost hover:text-on-dark transition-colors"
        >
          <svg v-if="visible" xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7
                 a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243
                 M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29
                 M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7
                 a10.025 10.025 0 01-4.132 4.411m0 0L21 21"/>
          </svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7
                 -1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
          </svg>
        </button>
      </div>

      <p v-if="hasKey" class="mt-1.5 text-[10px] text-green-400 flex items-center gap-1">
        <span class="w-1.5 h-1.5 rounded-full bg-green-400 inline-block"></span>
        Chiave salvata
      </p>
      <p v-else class="mt-1.5 text-[10px] text-ghost">Solo localStorage, nessun server.</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '' }
})
const emit = defineEmits(['update:modelValue'])

const visible = ref(false)
const open    = ref(!props.modelValue)
const hasKey  = computed(() => !!props.modelValue && props.modelValue.startsWith('sk-ant'))

function handleInput(e) {
  const val = e.target.value
  emit('update:modelValue', val)
  localStorage.setItem('anthropic_api_key', val)
}
</script>

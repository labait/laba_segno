<template>
  <div class="bg-navy rounded-2xl border border-[#4a4a4a]">
    <!-- Collapsible header -->
    <button
      @click="open = !open"
      class="w-full px-5 py-4 flex items-center justify-between cursor-pointer"
    >
      <div class="flex items-center gap-2">
        <h3 class="text-sm font-semibold text-on-dark">Criteri di revisione</h3>
        <span v-if="selected.length > 0 && !open" class="text-[10px] font-semibold bg-accent text-white rounded-full px-1.5 py-0.5 leading-none">
          {{ selected.length }}
        </span>
      </div>
      <svg
        class="w-4 h-4 text-ghost transition-transform duration-200"
        :class="{ 'rotate-180': open }"
        fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/>
      </svg>
    </button>
    <!-- Collapsible body -->
    <div v-show="open" class="px-5 pb-5">
      <div class="flex items-center justify-end mb-3">
        <button
          @click="toggleAll"
          class="text-xs font-medium text-accent hover:text-accent-dark transition-colors"
        >
          {{ allSelected ? 'Deseleziona tutti' : 'Seleziona tutti' }}
        </button>
      </div>

    <div class="space-y-3">
      <label
        v-for="c in CRITERIA"
        :key="c.value"
        class="flex items-start gap-3 cursor-pointer group"
      >
        <!-- Custom checkbox -->
        <div
          class="w-4 h-4 mt-0.5 rounded border-2 shrink-0 flex items-center justify-center transition-all"
          :class="selected.includes(c.value)
            ? 'bg-accent border-accent'
            : 'bg-[#2a2a2a] border-[#555] group-hover:border-accent/50'"
        >
          <svg
            v-if="selected.includes(c.value)"
            class="w-2.5 h-2.5 text-white"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3.5"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
          </svg>
        </div>

        <!-- Hidden real checkbox for accessibility -->
        <input
          type="checkbox"
          :value="c.value"
          v-model="selected"
          class="sr-only"
        />

        <div>
          <p
            class="text-sm font-medium transition-colors leading-tight"
            :class="selected.includes(c.value) ? 'text-on-dark' : 'text-on-dark/70 group-hover:text-on-dark'"
          >{{ c.label }}</p>
          <p class="text-xs text-ghost mt-0.5">{{ c.description }}</p>
        </div>
      </label>
    </div>

    <!-- Count badge -->
    <div class="mt-4 pt-4 border-t border-[#4a4a4a] flex items-center justify-between">
      <span class="text-xs text-ghost">
        {{ selected.length }} {{ selected.length === 1 ? 'criterio selezionato' : 'criteri selezionati' }}
      </span>
      <span
        v-if="selected.length > 0"
        class="text-xs font-semibold text-accent"
      >✓</span>
    </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  modelValue: { type: Array, default: () => [] }
})
const emit = defineEmits(['update:modelValue'])

const open = ref(false)

const CRITERIA = [
  {
    value:       'Leggibilità e chiarezza del segno',
    label:       'Leggibilità e chiarezza',
    description: 'Quanto è riconoscibile e comprensibile il segno a diverse distanze',
  },
  {
    value:       'Bilanciamento visivo e proporzioni',
    label:       'Bilanciamento e proporzioni',
    description: 'Equilibrio tra le componenti e armonia delle relazioni spaziali',
  },
  {
    value:       'Originalità e coerenza concettuale',
    label:       'Originalità e concept',
    description: 'Unicità del segno e coerenza con il brief e il settore',
  },
  {
    value:       'Uso del colore',
    label:       'Uso del colore',
    description: 'Scelta cromatica, armonia e funzionalità del colore nel segno',
  },
  {
    value:       'Scalabilità e versatilità',
    label:       'Scalabilità e versatilità',
    description: 'Efficacia su formati differenti e applicazioni su vari supporti',
  },
]

const selected = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

const allSelected = computed(() => selected.value.length === CRITERIA.length)

function toggleAll() {
  emit('update:modelValue', allSelected.value ? [] : CRITERIA.map((c) => c.value))
}
</script>

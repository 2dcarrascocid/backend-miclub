<!--
  Vue 3 Component Template — FPlayChile MiClub
  ADF Layer: specialists:frontend

  INSTRUCCIONES:
  1. Renombrar archivo a {ComponentName}.vue (PascalCase)
  2. Reemplazar {ComponentName} con el nombre del componente
  3. Reemplazar {description} con la descripción del propósito
  4. Reemplazar {api-method-name} con el método del API client
  5. Ajustar props, emits, y lógica según necesidad
  6. Ejecutar /validators:code después de implementar
-->

<template>
  <div class="{component-name}">
    <!-- Estado: Cargando -->
    <div v-if="loading" class="loading-state">
      Cargando...
    </div>

    <!-- Estado: Error -->
    <div v-else-if="error" class="error-state">
      <p>{{ error }}</p>
      <button @click="loadData">Reintentar</button>
    </div>

    <!-- Estado: Contenido principal -->
    <template v-else>
      <!-- TODO: Agregar el contenido del componente aquí -->

      <!-- Ejemplo: lista de items -->
      <!-- <ul v-if="data && data.length > 0">
        <li v-for="item in data" :key="item.id">
          {{ item.nombre }}
        </li>
      </ul>
      <p v-else>No hay datos disponibles.</p> -->
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth.js'
// import { useClubStore } from '@/stores/club.js'
// import { apiMethodName } from '@/api/index.js'
// import { IconName } from 'lucide-vue-next'

// ─── Props ────────────────────────────────────────────────────────────────────
const props = defineProps({
  // propName: {
  //   type: String,
  //   required: true
  // },
  // optionalProp: {
  //   type: Number,
  //   default: 0
  // }
})

// ─── Emits ────────────────────────────────────────────────────────────────────
// const emit = defineEmits(['item-selected', 'refresh'])

// ─── Stores ───────────────────────────────────────────────────────────────────
const authStore = useAuthStore()
// const clubStore = useClubStore()

// ─── Estado Reactivo ──────────────────────────────────────────────────────────
const loading = ref(false)
const error = ref(null)
const data = ref(null)

// ─── Computed ─────────────────────────────────────────────────────────────────
const hasPermission = computed(() => {
  // Ajustar según los permisos requeridos
  return authStore.user !== null
})

const isEmpty = computed(() => {
  return !loading.value && !error.value && (!data.value || data.value.length === 0)
})

// ─── Métodos ──────────────────────────────────────────────────────────────────

/**
 * Carga los datos principales del componente
 */
async function loadData() {
  if (!hasPermission.value) {
    error.value = 'Sin permisos para ver este contenido'
    return
  }

  loading.value = true
  error.value = null

  try {
    // const response = await apiMethodName()
    // data.value = response.data
  } catch (err) {
    error.value = err.response?.data?.error || err.response?.data?.message || 'Error al cargar datos'
    console.error('[{ComponentName}] loadData error:', err)
  } finally {
    loading.value = false
  }
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────
onMounted(loadData)
</script>

<!--
  NOTAS PARA EL DEVELOPER:
  - No usar Options API (data(), methods:, computed:)
  - Todos los estados de carga y error DEBEN estar contemplados
  - Usar Axios solo de @/api/index.js
  - Usar Lucide Vue Next para iconos: import { Icon } from 'lucide-vue-next'
  - Verificar permisos con authStore antes de mostrar acciones sensibles
  - Lazy load esta vista en el router si es una página completa
-->

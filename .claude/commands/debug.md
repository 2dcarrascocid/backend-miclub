Ayuda a diagnosticar y resolver un bug de forma sistemática.

## Problema a Debuggear
$ARGUMENTS

---

## Proceso de Debugging

### Paso 1: Entender el Problema
- ¿Qué debería pasar? ¿Qué está pasando en realidad?
- ¿Es reproducible siempre o de forma intermitente?
- ¿Cuándo empezó a ocurrir? ¿Hubo algún cambio reciente?
- ¿Hay un mensaje de error, stack trace, o log disponible?

### Paso 2: Leer el Código Relevante
Antes de sugerir cualquier solución:
- Leer el archivo donde ocurre el error
- Leer los archivos que el código problemático importa o llama
- Entender el flujo de datos hasta el punto de falla

### Paso 3: Formular Hipótesis
Listar las causas más probables del problema, ordenadas por probabilidad.

### Paso 4: Verificar Hipótesis
Para cada hipótesis, identificar:
- Qué evidencia confirmaría o descartaría esta hipótesis
- Qué logs o valores habría que revisar

### Paso 5: Proponer Solución
- Una sola solución clara y específica
- Explicar por qué esta es la causa raíz
- Mostrar el cambio exacto a aplicar (diff)

---

## Contexto de Stack

### Backend (Node.js / Lambda / Supabase)
Errores comunes:
- `Cannot use import statement` → archivo no tiene `"type": "module"` o falta extensión `.js` en import
- `supabase is not defined` → no se importó `supabase` de `services/db.js`
- `401 Unauthorized` → API Key o JWT inválido/ausente
- `500` sin mensaje → error no capturado en `try/catch`, revisar con `console.error`
- Query Supabase retorna `null` → falta `.single()` o el `club_id` no coincide
- `duplicate key value` en upsert → falta `{ onConflict: 'columna' }` en el upsert

### Frontend (Vue 3 / Axios)
Errores comunes:
- `Cannot read properties of undefined` → dato llegó null antes de renderizar, falta `v-if`
- `401` en todas las requests → token expirado, revisar refresh logic en `src/api/index.js`
- Store no reactivo → se usó `store.value` incorrectamente (Pinia)
- Menú no aparece → `authStore.permissions` está vacío, el menú es estático en `Navbar.vue`
- Componente no actualiza → olvidó `ref()` o `reactive()` para el estado

### Supabase
- Verificar que `club_id` está siendo pasado correctamente
- Revisar que el usuario tiene permisos RLS en la tabla
- Error `PGRST116` → `.single()` retornó 0 o múltiples filas

---

## Output Esperado

1. **Diagnóstico**: causa raíz identificada con evidencia del código
2. **Solución**: cambio específico a aplicar (mostrar el código antes y después)
3. **Verificación**: cómo confirmar que el fix funcionó

Refactoriza código mejorando su calidad sin cambiar su comportamiento.

## Código a Refactorizar
$ARGUMENTS

---

## Principio Fundamental

**Un refactor no cambia el comportamiento observable.** Si el código hace algo diferente después del refactor, no es un refactor — es un cambio funcional.

Antes de empezar: leer el código actual completo.

---

## Cuándo Refactorizar

### SÍ refactorizar cuando:
- Funciones > 80 líneas con múltiples responsabilidades
- Código duplicado en 3+ lugares
- Nombres de variables/funciones que no describen lo que hacen
- Lógica anidada de > 4 niveles de profundidad
- Código que tardas más de 30 segundos en entender

### NO refactorizar cuando:
- El código "podría ser mejor" pero funciona y es legible
- Hay un bug activo — primero arreglar, luego refactorizar
- No hay tiempo para validar que no se rompió nada
- El cambio es solo preferencia de estilo personal

---

## Tipos de Refactor

### Extraer función
```javascript
// Antes: lógica anidada difícil de seguir
export const procesar = async (event) => {
  // ...50 líneas de lógica mezclada...
}

// Después: responsabilidades separadas
export const procesar = async (event) => {
  const input = parsearInput(event)
  const contexto = await obtenerContexto(input.userId)
  const resultado = await ejecutarLogica(input, contexto)
  return formatearRespuesta(resultado)
}
```

### Eliminar duplicación
```javascript
// Antes: misma validación en 3 handlers
// Después: función utilitaria en utils/validators.js
export const validarCamposObligatorios = (body, campos) => { ... }
```

### Mejorar nombres
```javascript
// Antes
const d = await supabase.from('t').select('*').eq('c', id)

// Después
const { data: jugadores, error } = await supabase
  .from('jugadores')
  .select('id, nombre, apellido, categoria_id')
  .eq('club_id', clubId)
```

---

## Proceso

1. **Leer** el código actual completo
2. **Identificar** qué problemas específicos tiene (no "todo es malo")
3. **Planificar** el refactor con cambios atómicos
4. **Aplicar** un cambio a la vez
5. **Verificar** que el comportamiento no cambió después de cada paso
6. **Validar** con `/validators:code`

---

## Checklist Post-Refactor

- [ ] El comportamiento observable es idéntico al original
- [ ] Los nombres son más descriptivos que antes
- [ ] No hay lógica duplicada que quedó igual
- [ ] Las funciones tienen responsabilidad única
- [ ] El código es más fácil de leer que antes
- [ ] No se introdujeron nuevas dependencies innecesarias
- [ ] `/validators:code` pasa sin nuevos issues

Flujo rápido y seguro para corregir bugs críticos en producción.

## Bug a Corregir
$ARGUMENTS

---

## Principio del Hotfix

Un hotfix es un fix mínimo para un problema crítico. No es el momento de refactorizar ni mejorar nada más allá del bug específico.

**Regla**: El cambio debe ser lo más pequeño posible para resolver el problema.

---

## Proceso Hotfix

### Paso 1: Diagnóstico Rápido
- Leer el código afectado
- Identificar la causa raíz exacta (no síntomas)
- Confirmar que entendemos el problema antes de cambiar algo

### Paso 2: Fix Mínimo
- Cambiar solo lo necesario para corregir el bug
- No aprovechar para "mejorar cosas mientras estamos aquí"
- Si la solución requiere más de 20 líneas de cambio, es probable que no sea un hotfix

### Paso 3: Validación Rápida
Ejecutar solo los validators relevantes al bug:
- Si toca auth o pagos → `/validators:security` OBLIGATORIO
- Si toca endpoints → `/validators:api`
- Siempre → `/validators:code`

### Paso 4: Commit y Deploy
- Commit con prefijo `fix:` y descripción clara
- Verificar en producción que el bug está resuelto

---

## Checklist Hotfix

- [ ] Causa raíz identificada (no solo síntoma)
- [ ] Cambio mínimo que resuelve el bug
- [ ] No se tocó código no relacionado
- [ ] Tests mentales: ¿este cambio puede romper algo más?
- [ ] Validators relevantes ejecutados
- [ ] Commit con mensaje descriptivo (`fix(scope): descripción`)
- [ ] Verificado en producción post-deploy

---

## Qué NO hacer en un Hotfix

- No refactorizar código "mientras estamos aquí"
- No agregar features que "ya que estamos"
- No cambiar arquitectura o estructura de datos
- No deployar sin validar primero

---

## Formato de Commit para Hotfix

```
fix(scope): descripción corta del bug corregido

Causa: {causa raíz}
Impacto: {qué fallaba y para quién}
Fix: {qué cambió exactamente}
```

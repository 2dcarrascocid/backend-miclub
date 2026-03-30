Realiza una revisión de código profesional del área especificada.

## Área a Revisar
$ARGUMENTS

## Proceso

1. Lee todos los archivos relevantes antes de opinar
2. Evalúa cada dimensión del checklist
3. Entrega el reporte con severidades claras

---

## Checklist de Revisión

### Corrección Funcional
- [ ] La lógica hace lo que dice que hace
- [ ] Los edge cases están contemplados (null, undefined, array vacío, etc.)
- [ ] Los errores se manejan correctamente
- [ ] No hay condiciones de carrera obvias

### Seguridad
- [ ] No hay secrets hardcodeados
- [ ] Inputs validados antes de usar
- [ ] No hay SQL/Command injection posible
- [ ] Datos sensibles no expuestos en responses ni logs
- [ ] Auth verificada donde corresponde

### Calidad de Código
- [ ] Nombres descriptivos (variables, funciones, archivos)
- [ ] Funciones con responsabilidad única
- [ ] No hay código duplicado innecesario
- [ ] No hay código muerto o comentado sin razón
- [ ] Complejidad manejable (no funciones de 100+ líneas)

### Mantenibilidad
- [ ] El código es legible sin documentación adicional
- [ ] Las decisiones no obvias tienen comentario explicando el *por qué*
- [ ] No hay magia: números mágicos, strings hardcodeados sin contexto
- [ ] La estructura de carpetas y nombres de archivo es coherente

### Performance (cuando aplica)
- [ ] No hay queries N+1 en loops
- [ ] No hay operaciones costosas innecesarias en el hot path
- [ ] Datos grandes se pagina o limita

---

## Severidades

| Nivel | Descripción |
|-------|-------------|
| 🔴 **BLOQUEANTE** | Bug real, vulnerabilidad de seguridad, lógica incorrecta |
| 🟡 **IMPORTANTE** | Deuda técnica significativa, difícil de mantener |
| 🟢 **SUGERENCIA** | Mejora de calidad, buena práctica, preferencia de estilo |

---

## Formato de Output

```
## Code Review: {archivo o área}

### Resumen
{1-2 oraciones del estado general}

### 🔴 Bloqueantes
- **[archivo:línea]** Descripción del problema + corrección sugerida

### 🟡 Importantes
- **[archivo:línea]** Descripción + sugerencia

### 🟢 Sugerencias
- **[archivo:línea]** Mejora opcional

### Veredicto
APROBADO / APROBADO CON CAMBIOS / RECHAZADO
```

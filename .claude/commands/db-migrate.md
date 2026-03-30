Crea o revisa migraciones de base de datos Supabase de forma segura.

## Migración a Crear o Revisar
$ARGUMENTS

---

## Proceso

1. Leer los archivos SQL en `sql/` para entender el schema actual
2. Entender qué cambio de datos o estructura se necesita
3. Crear la migración SQL segura
4. Verificar backward compatibility

---

## Reglas de Migraciones Seguras

### Siempre Seguro (puedes hacer en cualquier momento)
- Agregar columnas con `DEFAULT` o `NULL`
- Crear nuevas tablas
- Agregar índices (`CREATE INDEX IF NOT EXISTS`)
- Agregar columnas NOT NULL con `DEFAULT` definido
- Crear nuevas funciones/vistas

### Requiere Cuidado (hacerlo en mantenimiento o con plan)
- Eliminar columnas (verificar que no hay código que las use)
- Renombrar columnas (necesita deploy coordinado frontend+backend)
- Cambiar tipo de columna (puede fallar si hay datos incompatibles)
- Agregar `NOT NULL` sin `DEFAULT` a tabla con datos

### Peligroso (evitar o tener rollback claro)
- `DROP TABLE` con datos
- Truncar tablas
- Cambiar claves primarias

---

## Template de Migración

```sql
-- ============================================================
-- Migration: add_{descripcion}.sql
-- Description: {qué cambia y por qué}
-- Date: {fecha}
-- Backward compatible: YES / NO
-- ============================================================

-- ── UP: Aplicar migración ────────────────────────────────────

ALTER TABLE nombre_tabla
  ADD COLUMN IF NOT EXISTS nueva_columna TEXT,
  ADD COLUMN IF NOT EXISTS otra_columna BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_tabla_columna
  ON nombre_tabla(nueva_columna)
  WHERE nueva_columna IS NOT NULL;

-- ── DOWN: Revertir migración (documentar siempre) ────────────
-- ALTER TABLE nombre_tabla DROP COLUMN nueva_columna;
-- DROP INDEX idx_tabla_columna;
```

---

## Checklist de Migración

- [ ] Guardado en `sql/` con nombre descriptivo
- [ ] Nueva tabla tiene `club_id` con FK (si es tabla de negocio)
- [ ] Índice creado en `club_id` si es tabla nueva
- [ ] Backward compatible verificado
- [ ] Sección DOWN documentada para rollback
- [ ] `ADD COLUMN IF NOT EXISTS` para idempotencia

---

## Orden de Deploy con Migración

1. Ejecutar migración en Supabase primero
2. Deployar el backend
3. Deployar el frontend

**Nunca** deployar código que usa columnas nuevas antes de ejecutar la migración.

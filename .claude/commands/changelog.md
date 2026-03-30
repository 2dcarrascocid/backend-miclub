Genera un changelog profesional basado en los commits recientes.

## Rango o Contexto
$ARGUMENTS

---

## Proceso

1. Ejecutar `git log` para ver los commits recientes
2. Agrupar por tipo (feat, fix, refactor, etc.)
3. Generar el changelog en formato estándar

---

## Formato de Output

```markdown
# Changelog

## [versión] — YYYY-MM-DD

### Nuevas Funcionalidades
- **jugadores**: permite buscar jugadores por nombre y RUT
- **pagos**: integra Webpay Plus para cobro de membresías

### Correcciones
- **auth**: corrige expiración de JWT en refresh token
- **finanzas**: soluciona cálculo incorrecto de saldo total

### Mejoras
- **db**: agrega índice en club_id para mejorar performance de queries
- **api**: estandariza mensajes de error en todos los endpoints

### Cambios Internos
- Actualiza transbank-sdk a v6.1.1
- Refactoriza middleware de autenticación
```

---

## Reglas para el Changelog

- **Audiencia**: el changelog es para developers y stakeholders, no solo técnicos
- **Lenguaje**: español, claro y directo
- **Granularidad**: agrupar cambios pequeños del mismo tema
- **No incluir**: commits de formato, typos, o merges automáticos
- **Sí incluir**: cualquier cambio que afecte comportamiento, APIs, o datos

## Niveles de Versión (SemVer)

| Cambio | Versión |
|--------|---------|
| Breaking change, cambio de API | MAJOR (X.0.0) |
| Nueva funcionalidad backward-compatible | MINOR (0.X.0) |
| Bug fix, mejora menor | PATCH (0.0.X) |

## Comandos Git Útiles

```bash
# Commits desde el último tag
git log $(git describe --tags --abbrev=0)..HEAD --oneline

# Commits de los últimos 7 días
git log --since="7 days ago" --oneline

# Commits entre dos tags
git log v1.0.0..v1.1.0 --oneline
```

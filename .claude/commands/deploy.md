Checklist de pre-deploy para asegurar que todo está listo para producción.

## Target de Deploy
$ARGUMENTS

---

## Checklist de Pre-Deploy

### Código
- [ ] No hay `console.log` en código de producción (solo `console.error`)
- [ ] No hay credenciales hardcodeadas en el código
- [ ] No hay `TODO` críticos sin resolver
- [ ] No hay archivos de debug o temporales commiteados
- [ ] Todos los `import` apuntan a rutas correctas con extensión `.js`

### Configuración
- [ ] Variables de entorno del stage destino están configuradas en AWS
- [ ] `serverless.yml` apunta al stage correcto
- [ ] No hay referencias a `localhost` o URLs de desarrollo en el código

### Base de Datos
- [ ] Las migraciones SQL en `sql/` pendientes están listas para ejecutar
- [ ] Los cambios de schema son backward compatible (o hay plan de rollback)
- [ ] No hay queries con `club_id` hardcodeado

### Seguridad
- [ ] API Keys de producción son diferentes a las de desarrollo
- [ ] `ACCESS_TOKEN_SECRET` de producción es diferente al de desarrollo
- [ ] Transbank configurado en modo producción (no integración)

### Funcionalidad
- [ ] El flujo de login/registro/verificación funciona
- [ ] El flujo de recuperación de contraseña funciona
- [ ] El flujo de pagos Transbank funciona
- [ ] Los endpoints nuevos responden correctamente
- [ ] La funcionalidad existente no fue rota

### Git
- [ ] Todo el código a deployar está commiteado
- [ ] Estás en el branch correcto
- [ ] No hay cambios locales sin commitear

---

## Proceso

1. **Revisar** el checklist anterior leyendo el código relevante
2. **Identificar** items pendientes o riesgosos
3. **Reportar** estado de cada categoría
4. **Recomendar** si proceder con el deploy o resolver issues primero

---

## Comando de Deploy (Backend)

```bash
serverless deploy --stage prod
```

## Post-Deploy

- [ ] Verificar que los endpoints responden en producción
- [ ] Revisar logs de CloudWatch por errores inmediatos
- [ ] Confirmar que el frontend conecta con el backend correcto

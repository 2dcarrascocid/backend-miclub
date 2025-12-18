"En el proyecto backend-miclub, necesito crear una serie de servicios para creacion de eventos y administracion de eventos  para el  relacionado a un club, 

debe tener la funcionalidad de: 
paso 1 : cear el regitro: con los siguientes datos:
body:
{
  "club_id": "uuid",
  "titulo": "Asado fin de año",
  "descripcion": "Evento social del club",
  "tipo_evento": "social",
  "fecha_evento": "2025-12-20",
  "fecha_limite_pago": "2025-12-18",
  "costo_unitario": 10000
}

Crea registro en el_dep_club_eventos
estado = 'borrador'
No crea jugadores
Retorna evento_id

paso 2 : Actualizar evento (seguir editando borrador)
Body (parcial)
{
  "titulo": "Asado fin de año (actualizado)",
  "descripcion": "Incluye bebidas",
  "fecha_limite_pago": "2025-12-17",
  "costo_unitario": 12000
}
Reglas
Permitido solo si estado = 'borrador' o abierto
Prohibido si estado = 'cerrado'

paso 3 :Abrir evento

UPDATE el_dep_club_eventos
SET estado = 'abierto'
WHERE id = :evento_id;

paso 4 : Agregar jugadores al evento
Body:
{
  "jugador_id": "uuid",
  "numero_jugador": 9
}

Comportamiento

Inserta en el_dep_club_evento_jugadores

estado_pago = 'pendiente'

Copia monto y fecha_limite_pago desde el evento (trigger)

paso 5: Quitar jugador del evento (opcional)
Regla
Permitido solo si el evento NO está cerrado


paso 6 : Listar evento (detalle completo)
respuesta esperado :
Respuesta (ejemplo)
{
  "id": "uuid",
  "titulo": "Asado fin de año",
  "estado": "abierto",
  "costo_unitario": 10000,
  "resumen": {
    "total_pagado": 30000,
    "total_pendiente": 20000
  },
  "jugadores": [
    {
      "jugador_id": "uuid",
      "nombre": "Juan Pérez",
      "numero_jugador": 9,
      "estado_pago": "pagado",
      "estado_cumplimiento": "a_tiempo"
    }
  ]
}

paso 7 : Registrar pago de jugador
{
  "fecha_pago": "2025-12-19T18:30:00Z"
}

Comportamiento
Actualiza estado_pago = 'pagado'
Si el evento está cerrado, crea movimiento financiero automáticamente
Marca estado_cumplimiento

paso 8: Cerrar evento (consolidar)
Comportamiento
Calcula total pagado
Inserta 1 registro en el_dep_movimientos_financieros
Cambia estado a cerrado
No se puede revertir

paso 9: Listar eventos por club
Filtros útiles

estado=borrador|abierto|cerrado

desde, hasta

🔐 Reglas de negocio (backend)

❌ No se puede editar evento cerrado

❌ No se pueden eliminar jugadores de evento cerrado

✔ Se puede pagar evento cerrado (genera ingreso tardío)

✔ Un jugador no es moroso si estado_pago = pagado

🧠 Endpoints mínimos (resumen)

POST /eventos

PUT /eventos/{id}

POST /eventos/{id}/jugadores

POST /eventos/{id}/jugadores/{jugador_id}/pagar

POST /eventos/{id}/cerrar

GET /eventos/{id}


Usa el stack: Node.js 20, Serverless Framework v4 y Supabase.
Crea la definición en 
serverless.yml
routes/eventos
serverlessEventos.yml

Implementa la lógica en el handler utilizando la misma logica enterior de los demas endpoints.

actualiza el archivo  serverless.yml si es necesario


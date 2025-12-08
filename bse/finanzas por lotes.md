"En el proyecto backend, necesito crear el servicio para ingresar movimientos financieros por lotes, debe poder ingresar  una lista de ingresos o egresos, 
debe tener la funcionalidad de: 
ingresar listas de ingresos o egresos con las siguientes caracteristicas en la tabla el_dep_movimientos_financieros: campos 
club_id: 
tipo,
categoria,
monto,
descripcion,
fecha_movimiento,
registrado_por,
jugador_id,

debe validar e ingresar todos los datos, en el caso que un dato no este correctamente ingresado debe ingresar el campo en null y debolver en la respuesta los datos que no se ingresaron correctamente y cual quedo null para que sea corregido con posterioridad.

Usa el stack: Node.js 20, Serverless Framework v4 y Supabase.
Crea la definición en 
serverless.yml
routes/finanzas

Implementa la lógica en el handler utilizando la misma logica enterior de los demas endpoints.

actualiza el archivo  serverless.yml si es necesario


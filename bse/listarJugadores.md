"En el proyecto backend-miclub, necesito modificar el siguiente endpoint:
listarJugadores: 
GET  | http://localhost:3000/clubes/{clubId}/jugadores


El endpoint debe tener la funcionalidad de:
de traer el nombre club al que pertenece cada jugador
nombre_club : string


agragar o mantener la paginacion inicial de 10 registros y retorna el total de registros y next encriptado para paginar el limit y offset
actualizar archivo correspondiente 
Usa el stack: Node.js 20, Serverless Framework v4 y Supabase.
Implementa la lógica en el handler utilizando la misma logica enterior de los demas endpoints.


"En el proyecto backend, necesito modificar el siguiente endpoint:
listarMovimientos: 
GET : http://localhost:3000/clubes/20daf933-d0dd-4f96-a0c8-85cf793141d0/finanzas/movimiento

Debe tener la funcionalidad de:
agraga la paginacion inicial de 10 registros y retorna el total de registros y next encriptado para paginar el limit y offset
retorno esperado :
{
    data:[]
    total_registros:10,
    next:""
}

Usa el stack: Node.js 20, Serverless Framework v4 y Supabase.

Implementa la lógica en el handler utilizando la misma logica enterior de los demas endpoints.


actualizar archivo correspondiente 



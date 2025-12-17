"En el proyecto backend-miclub, necesito modificar el siguiente endpoint:
listarClubes
get : http://localhost:3000/clubes?owner_id=0e05d871-9780-43c6-95b4-02f3d3db7444

Usa el stack: Node.js 20, Serverless Framework v4 y Supabase.

Implementa la lógica en el handler utilizando la misma logica enterior de los demas endpoints.

Nueva funcionalidad:
- Retorna la cantidad de jugadores activos que tiene el club obtenlos de la tabla jugadores. con el id_club.

response:
{
    {
        "id": "0017c061-4f9b-439a-90d7-2afe19f2cda3",
        "nombre": "estrella verde",
        "descripcion": null,
        "admin_id": "0e05d871-9780-43c6-95b4-02f3d3db7444",
        "created_at": "2025-12-04T01:00:47.479151+00:00",
        "updated_at": "2025-12-04T01:00:47.479151+00:00",
        "path_foto": null:
        "cantidad_jugadores: 20
    },
 
}

actualizar archivo correspondiente 



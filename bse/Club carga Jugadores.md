En el proyecto backend-miclub, necesito crear el crud de servicio para la tabla el_dep_categorias
debe tener la funcionalidad de: 
insertar, actualizar, eliminar, listar las categorias de jugadores que pertenecen a un club

insertar = INSERT INTO el_dep_categorias (
    id_club,
    nombre,
    descripcion,
    edad_desde,
    edad_hasta
) VALUES (
    :id_club,
    :nombre,
    :descripcion,
    :edad_desde,
    :edad_hasta
)
RETURNING *;

obtener las categorias = 
SELECT *
FROM el_dep_categorias
WHERE id_club = :id_club
ORDER BY edad_desde ASC;

actulizar :
UPDATE el_dep_categorias
SET
    nombre = :nombre,
    descripcion = :descripcion,
    edad_desde = :edad_desde,
    edad_hasta = :edad_hasta,
    updated_at = NOW()
WHERE id = :id
RETURNING *;

eliminar = DELETE FROM  el_dep_categorias
WHERE id = :id
RETURNING *;


Usa el stack: Node.js 20, Serverless Framework v4 y Supabase.
Crea la definición y los archivos correspondientes
routes/categorias
serverlessCAtegorias.yml

Implementa la lógica en el handler utilizando la misma logica enterior de los demas endpoints.
actualiza el archivo  serverless.yml si es necesario


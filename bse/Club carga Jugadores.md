En el proyecto backend-miclub necesito crear un servicio que cargue un excel con jugadores 
y los inserte en la tabla el_dep_jugadores

debe tener la funcionalidad de: 
poder descargar un excel con el formato necesario para la descarga
subir el archivo y poder insertar los jugadores en la tabla el_dep_jugadores
crear un informe de los jugadores insertados y los que no se pudieron insertar y el error correspondiente
todos los jugadors deben pertener a un club especifico
generar un archivo en pdf con el informe de los jugadores insertados y los que no se pudieron insertar y el error correspondiente

estos son los datos basico necesarios


            "club_id": "20daf933-d0dd-4f96-a0c8-85cf793141d0",
            "nombre_completo": "sssss",
            "rut": "1234567-8",
            "email": "jugadoer@gmail.com",
            "telefono": "99999999",
            "fecha_nacimiento": "1966-01-01",
            "activo": true,
            "created_at": "2025-12-17T02:18:23.543837+00:00",
            "folio": 99


Usa el stack: Node.js 20, Serverless Framework v4 y Supabase.
Crea la definición y los archivos correspondientes
routes/categorias
serverlessCAtegorias.yml

Implementa la lógica en el handler utilizando la misma logica enterior de los demas endpoints.
actualiza el archivo  serverless.yml si es necesario


ademas crea las funionalidad en frontend-miclub para poder subir el archivo y poder ver el informe de los jugadores insertados y los que no se pudieron insertar y el error correspondiente
# Backend Serverless - FPLAYCHILE

Este proyecto es un backend construido con **Node.js 20**, **Serverless Framework 4.x**, y desplegado en **AWS Lambda**. Permite manejar usuarios, login y gestión de partidos de fútbol.

---

## Tecnologías y librerías usadas

- **Node.js 20**: runtime principal.
- **Serverless Framework 4.x**: para despliegue en AWS Lambda.
- **dotenv**: gestión de variables de entorno.
- **@supabase/supabase-js**: cliente para conectarse a la base de datos Supabase/PostgreSQL.
- **serverless-offline**: para pruebas locales de las funciones Lambda.
- **Swagger / OpenAPI**: documentación de los endpoints en `/api/docs`.
- **ES Modules**: se utiliza `"type": "module"` en `package.json`.

---

## Estructura del proyecto
backend-sls/
│
├─ routes/                 # Endpoints agrupados por funcionalidad (usuarios, login, partidos, clubes)
├─ services/               # Servicios de conexión a DB y utilidades
├─ node_modules/
├─ .env                    # Variables de entorno
├─ .gitignore
├─ serverless.yml          # Configuración de Serverless Framework
├─ package.json
└─ README.md

---

## Endpoints Principales

### Clubes
- **GET /clubes**: Listar clubes (filtro opcional por owner_id).
- **POST /clubes**: Crear un nuevo club.
- **PUT /clubes/{id}**: Editar un club existente (nombre, descripción, foto).
- **DELETE /clubes/{id}**: Eliminar un club.

### Auth
- **POST /auth/login**: Iniciar sesión.
- **POST /auth/register**: Registrar usuario.
- **POST /auth/refresh**: Refrescar token.

### Partidos
- **GET /matches**: Listar partidos.
- **POST /matches**: Crear partido.



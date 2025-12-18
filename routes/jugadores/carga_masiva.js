import { supabase } from '../../services/db.js';
import jwt from 'jsonwebtoken';
import { validateApiKey } from '../../utils/apiKeyMiddleware.js';
import * as XLSX from 'xlsx';

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || "access-secret";

const getUserIdFromToken = (event) => {
    const authHeader = event.headers.Authorization || event.headers.authorization;
    if (!authHeader) throw new Error('No token provided');

    const token = authHeader.replace('Bearer ', '');
    try {
        const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET);
        return decoded.sub;
    } catch (err) {
        throw new Error('Invalid token');
    }
};

const verifyClubOwnership = async (clubId, userId) => {
    const { data, error } = await supabase
        .from('el_dep_clubes')
        .select('id')
        .eq('id', clubId)
        .eq('admin_id', userId)
        .single();

    if (error || !data) return false;
    return true;
};

const parseDate = (dateValue) => {
    if (!dateValue) return null;

    // Si es un número (formato serial de Excel)
    if (typeof dateValue === 'number') {
        // Excel serial date to JS Date: (value - 25569) * 86400 * 1000
        const date = new Date((dateValue - 25569) * 86400 * 1000);
        return date.toISOString().split('T')[0];
    }

    // Si es string DD/MM/YYYY
    if (typeof dateValue === 'string') {
        const parts = dateValue.split('/');
        if (parts.length === 3) {
            const [day, month, year] = parts;
            // Asegurar que sean números válidos y formato correcto
            if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
                return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            }
        }
        
        // Intentar parsear si viene en otro formato string (e.g. YYYY-MM-DD)
        const date = new Date(dateValue);
        if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0];
        }
    }

    return null; // Si no se pudo parsear
};

export const descargarPlantilla = async (event) => {
    try {
        const apiKeyValidation = validateApiKey(event);
        if (!apiKeyValidation.valid) {
            return apiKeyValidation.response;
        }

        const headers = [
            ['nombre_completo', 'rut', 'email', 'telefono', 'fecha_nacimiento', 'folio', 'activo']
        ];
        
        // Ejemplo de datos
        const data = [
            ['Juan Perez', '12345678-9', 'juan@example.com', '987654321', '1990-01-01', 1, 'TRUE']
        ];

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet([...headers, ...data]);
        XLSX.utils.book_append_sheet(wb, ws, 'Plantilla Jugadores');

        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        const base64File = buffer.toString('base64');

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                file_name: 'plantilla_jugadores.xlsx',
                file_base64: base64File
            })
        };

    } catch (error) {
        console.error('Error generando plantilla:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: error.message })
        };
    }
};

export const procesarCargaMasiva = async (event) => {
    try {
        const apiKeyValidation = validateApiKey(event);
        if (!apiKeyValidation.valid) {
            return apiKeyValidation.response;
        }

        const userId = getUserIdFromToken(event);
        const { clubId } = event.pathParameters;
        
        // Verificar permisos
        const isOwner = await verifyClubOwnership(clubId, userId);
        if (!isOwner) {
            return {
                statusCode: 403,
                body: JSON.stringify({ message: 'No tienes permisos para administrar este club' })
            };
        }

        const body = JSON.parse(event.body);
        if (!body.file_base64) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Se requiere file_base64 en el body' })
            };
        }

        // Leer Excel
        const buffer = Buffer.from(body.file_base64, 'base64');
        const wb = XLSX.read(buffer, { type: 'buffer' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws);

        const resultados = {
            insertados: [],
            errores: []
        };

        // Procesar en lotes paralelos para mejorar velocidad
        const BATCH_SIZE = 10;
        for (let i = 0; i < rows.length; i += BATCH_SIZE) {
            const batch = rows.slice(i, i + BATCH_SIZE);
            
            await Promise.all(batch.map(async (row, batchIndex) => {
                const index = i + batchIndex;
                try {
                    // Validaciones básicas
                    if (!row.nombre_completo || !row.rut) {
                        throw new Error('Faltan datos obligatorios (nombre_completo, rut)');
                    }

                    // Normalizar datos
                    const jugador = {
                        club_id: clubId,
                        nombre_completo: row.nombre_completo,
                        rut: row.rut,
                        email: row.email || null,
                        telefono: row.telefono ? String(row.telefono) : null,
                        fecha_nacimiento: parseDate(row.fecha_nacimiento),
                        folio: row.folio ? parseInt(row.folio) : null,
                        activo: String(row.activo).toLowerCase() === 'true',
                        usuario_id: null, // Opcional, no viene en excel
                        es_socio: false, // Default
                        es_jugador: true // Asumimos son jugadores
                    };

                    // Insertar en Supabase
                    const { data, error } = await supabase
                        .from('el_dep_jugadores')
                        .insert([jugador])
                        .select()
                        .single();

                    if (error) throw error;

                    resultados.insertados.push({
                        fila: index + 2, // +2 por header y 0-index
                        nombre: jugador.nombre_completo,
                        rut: jugador.rut
                    });

                } catch (err) {
                    resultados.errores.push({
                        fila: index + 2,
                        nombre: row.nombre_completo || 'Desconocido',
                        error: err.message || JSON.stringify(err)
                    });
                }
            }));
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Carga masiva procesada',
                resumen: {
                    total_procesados: rows.length,
                    total_insertados: resultados.insertados.length,
                    total_errores: resultados.errores.length
                },
                detalles: resultados
            })
        };

    } catch (error) {
        console.error('Error carga masiva:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: error.message })
        };
    }
};

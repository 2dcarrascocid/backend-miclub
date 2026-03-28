/**
 * handler.js — Lambda Monolítica Consolidada
 *
 * Entry point único para todas las rutas HTTP del backend.
 * El router interno despacha cada request al handler correcto
 * sin modificar ningún handler existente.
 *
 * Ventajas de este patrón:
 * - 1 sola Lambda → menor costo, menor cold start agregado
 * - Todos los módulos se cargan UNA VEZ en el container (warm reuse)
 * - Zero cambios en la lógica de negocio existente
 * - Supabase client inicializado a nivel de módulo (fuera del handler)
 */

import { createRouter } from './utils/router.js'

// ─── Auth / Login ─────────────────────────────────────────────────────────────
import {
  register,
  login,
  logout,
  getProfile,
  updateProfile,
  verifyAccount,
  forgotPassword,
  resetPassword,
} from './routes/login/loginBasic.js'

import { login as googleLogin } from './routes/login/loginGoogle.js'

// ─── Clubes ───────────────────────────────────────────────────────────────────
import {
  crear  as crearClub,
  listar as listarClubes,
  editar as editarClub,
} from './routes/clubes/clubes.js'

// ─── Jugadores ────────────────────────────────────────────────────────────────
import {
  crear          as crearJugador,
  listar         as listarJugadores,
  buscarJugadores,
  actualizar     as actualizarJugador,
} from './routes/jugadores/jugadores.js'

import {
  descargarPlantilla,
  procesarCargaMasiva,
} from './routes/jugadores/carga_masiva.js'

// ─── Finanzas ─────────────────────────────────────────────────────────────────
import {
  crearMovimiento,
  listarMovimientos,
  cerrarMes,
  ingresarMovimientosPorLote,
} from './routes/finanzas/finanzas.js'

import { resumenFinanciero } from './routes/finanzas/dashboard_finanzas.js'

// ─── Dashboard ────────────────────────────────────────────────────────────────
import { obtenerResumen } from './routes/dashboard/dashboard.js'

// ─── Categorías ───────────────────────────────────────────────────────────────
import {
  crear    as crearCategoria,
  listar   as listarCategorias,
  actualizar as actualizarCategoria,
  eliminar as eliminarCategoria,
} from './routes/categorias/categorias.js'

// ─── Eventos ──────────────────────────────────────────────────────────────────
import {
  crear          as crearEvento,
  actualizar     as actualizarEvento,
  listar         as listarEventos,
  obtener        as obtenerEvento,
  agregarJugador,
  quitarJugador,
  registrarPago  as registrarPagoEvento,
  cerrar         as cerrarEvento,
} from './routes/eventos/eventos.js'

// ─── Notifications ────────────────────────────────────────────────────────────
import { sendNotification } from './routes/notifications/notificationHandler.js'

// ─── Membresía / Planes / Suscripciones ───────────────────────────────────────
import {
  listarPlanes,
  obtenerPlan,
  obtenerSuscripcionClub,
  historialSuscripcion,
  solicitarCambioPlan,
  activarSuscripcion,
  cancelarSuscripcion,
  obtenerFeatures,
  jobMarcarVencidas,
  jobNotificarVencimiento,
  checkout,
  webhookPagos,
} from './routes/membresia/membresiaHandler.js'

// ─── Pagos / Webpay ───────────────────────────────────────────────────────────
import {
  create as createPago,
  commit as commitPago,
  status as statusPago,
  refund as refundPago,
} from './routes/pagos/pagos.js'

// ─── Router ───────────────────────────────────────────────────────────────────
// IMPORTANTE: el orden importa — las rutas literales deben ir ANTES
// que las rutas paramétricas del mismo método y profundidad.

export const handler = createRouter([

  // ── Auth ──────────────────────────────────────────────────────────────────
  { method: 'POST', path: '/auth/register', handler: register        },
  { method: 'POST', path: '/auth/login',    handler: login           },
  { method: 'POST', path: '/auth/google',   handler: googleLogin     },
  { method: 'POST', path: '/auth/logout',   handler: logout          },
  { method: 'GET',  path: '/auth/profile',  handler: getProfile      },
  { method: 'PUT',  path: '/auth/profile',  handler: updateProfile   },
  { method: 'GET',  path: '/auth/verify',          handler: verifyAccount  },
  { method: 'POST', path: '/auth/forgot-password', handler: forgotPassword },
  { method: 'POST', path: '/auth/reset-password',  handler: resetPassword  },

  // ── Clubes ────────────────────────────────────────────────────────────────
  { method: 'POST', path: '/clubes',          handler: crearClub    },
  { method: 'GET',  path: '/clubes',          handler: listarClubes },
  { method: 'PUT',  path: '/clubes/{clubId}', handler: editarClub   },

  // ── Jugadores — literales antes de paramétricos ───────────────────────────
  { method: 'GET',  path: '/clubes/{clubId}/jugadores/buscar',       handler: buscarJugadores     },
  { method: 'GET',  path: '/clubes/{clubId}/jugadores/plantilla',    handler: descargarPlantilla  },
  { method: 'POST', path: '/clubes/{clubId}/jugadores/carga-masiva', handler: procesarCargaMasiva },
  { method: 'POST', path: '/clubes/{clubId}/jugadores',              handler: crearJugador        },
  { method: 'GET',  path: '/clubes/{clubId}/jugadores',              handler: listarJugadores     },
  { method: 'PUT',  path: '/clubes/{clubId}/jugadores/{id}',         handler: actualizarJugador   },

  // ── Finanzas — /lote antes de /movimientos para evitar conflicto ──────────
  { method: 'POST', path: '/clubes/{clubId}/finanzas/movimientos/lote', handler: ingresarMovimientosPorLote },
  { method: 'POST', path: '/clubes/{clubId}/finanzas/movimientos',      handler: crearMovimiento            },
  { method: 'GET',  path: '/clubes/{clubId}/finanzas/movimientos',      handler: listarMovimientos          },
  { method: 'POST', path: '/clubes/{clubId}/finanzas/cierre',           handler: cerrarMes                  },
  { method: 'GET',  path: '/clubes/{clubId}/finanzas/resumen',          handler: resumenFinanciero          },

  // ── Dashboard ─────────────────────────────────────────────────────────────
  { method: 'GET', path: '/clubes/{clubId}/dashboard/resumen', handler: obtenerResumen },

  // ── Categorías ────────────────────────────────────────────────────────────
  { method: 'POST',   path: '/clubes/{clubId}/categorias',      handler: crearCategoria    },
  { method: 'GET',    path: '/clubes/{clubId}/categorias',      handler: listarCategorias  },
  { method: 'PUT',    path: '/clubes/{clubId}/categorias/{id}', handler: actualizarCategoria },
  { method: 'DELETE', path: '/clubes/{clubId}/categorias/{id}', handler: eliminarCategoria  },

  // ── Eventos — literales (/cerrar) antes de paramétricos (/{jugadorId}) ────
  { method: 'POST',   path: '/clubes/{clubId}/eventos',                                   handler: crearEvento         },
  { method: 'GET',    path: '/clubes/{clubId}/eventos',                                   handler: listarEventos       },
  { method: 'GET',    path: '/clubes/{clubId}/eventos/{id}',                              handler: obtenerEvento       },
  { method: 'PUT',    path: '/clubes/{clubId}/eventos/{id}',                              handler: actualizarEvento    },
  { method: 'POST',   path: '/clubes/{clubId}/eventos/{id}/cerrar',                       handler: cerrarEvento        },
  { method: 'POST',   path: '/clubes/{clubId}/eventos/{id}/jugadores',                    handler: agregarJugador      },
  { method: 'DELETE', path: '/clubes/{clubId}/eventos/{id}/jugadores/{jugadorId}',        handler: quitarJugador       },
  { method: 'POST',   path: '/clubes/{clubId}/eventos/{id}/jugadores/{jugadorId}/pagar',  handler: registrarPagoEvento },

  // ── Notifications ─────────────────────────────────────────────────────────
  { method: 'POST', path: '/notifications/send', handler: sendNotification },

  // ── Membresía / Suscripciones — /historial antes de raíz ─────────────────
  { method: 'GET',  path: '/planes',                                        handler: listarPlanes            },
  { method: 'GET',  path: '/planes/{codigo}',                               handler: obtenerPlan             },
  { method: 'GET',  path: '/clubes/{club_id}/suscripcion/historial',        handler: historialSuscripcion    },
  { method: 'GET',  path: '/clubes/{club_id}/suscripcion',                  handler: obtenerSuscripcionClub  },
  { method: 'POST', path: '/clubes/{club_id}/suscripcion/solicitar-cambio', handler: solicitarCambioPlan     },
  { method: 'POST', path: '/clubes/{club_id}/suscripcion/activar',          handler: activarSuscripcion      },
  { method: 'POST', path: '/clubes/{club_id}/suscripcion/cancelar',         handler: cancelarSuscripcion     },
  { method: 'GET',  path: '/clubes/{club_id}/features',                     handler: obtenerFeatures         },
  { method: 'POST', path: '/suscripciones/marcar-vencidas',                 handler: jobMarcarVencidas       },
  { method: 'GET',  path: '/suscripciones/por-vencer',                      handler: jobNotificarVencimiento },
  { method: 'POST', path: '/clubes/{club_id}/pagos/checkout',               handler: checkout                },
  { method: 'POST', path: '/pagos/webhook/{proveedor}',                     handler: webhookPagos            },

  // ── Pagos Webpay — /return acepta GET y POST (redirect de Transbank) ──────
  { method: 'POST', path: '/pagos/webpay-plus/create',         handler: createPago },
  { method: 'POST', path: '/pagos/webpay-plus/return',         handler: commitPago },
  { method: 'GET',  path: '/pagos/webpay-plus/return',         handler: commitPago },
  { method: 'GET',  path: '/pagos/webpay-plus/status/{token}', handler: statusPago },
  { method: 'POST', path: '/pagos/webpay-plus/refund',         handler: refundPago },
])

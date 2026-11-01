// Motor de seguimiento de tratamientos multisesión. Lógica pura, sin red:
// no envía mensajes reales ni toca calendarios reales. Todo es simulación.
// Spec: docs/SPEC-tratamientos.md
import { HORA } from './engine.js';

export const DIA = 24 * HORA;
export const POST_CUIDADO = 24 * HORA; // "¿cómo sigues?" después de cada sesión (diseño)
export const DIAS_SIN_CITA = 7;        // días sin próxima sesión agendada: recordatorio al paciente (diseño)
export const DIAS_RIESGO = 14;         // días sin próxima sesión: riesgo de abandono (diseño)
export const EST = { ACTIVO: 'Activo', SIN_CITA: 'Sin próxima cita', RIESGO: 'En riesgo de abandono', COMPLETADO: 'Completado' };

export function crearSeguimiento() {
  const tratamientos = new Map(); // id -> tratamiento
  const salidas = [];             // mensajes programados
  const bandeja = [];             // mensajes simulados enviados y recibidos
  const avisos = [];              // avisos para la asistente
  // Contadores para métricas (prototipo: datos ficticios ilustrativos)
  let riesgosTotal = 0, rescates = 0, agendaOportuna = 0, agendaTardia = 0;
  let seq = 0;

  const primerNombre = (t) => t.paciente.split(' ')[0];
  const aviso = (tid, tipo, texto, now) => {
    if (avisos.some((a) => a.tratamientoId === tid && a.tipo === tipo && a.activo)) return;
    avisos.push({ id: ++seq, tratamientoId: tid, tipo, texto, activo: true, creado: now });
  };
  const cerrarAvisos = (tid, tipos) => avisos.forEach((a) => {
    if (a.tratamientoId === tid && (!tipos || tipos.includes(a.tipo))) a.activo = false;
  });
  // Sin duplicados: la clave identifica el mensaje; repetir la operación no lo crea dos veces.
  const programarSalida = (clave, t, tipo, salida, texto) => {
    if (salidas.some((s) => s.clave === clave) || bandeja.some((b) => b.clave === clave)) return;
    salidas.push({ clave, tratamientoId: t.id, tipo, salida, texto });
  };

  // Alta de un tratamiento. Repetir el alta con el mismo id no cambia nada.
  function alta({ id, paciente, telefono, tipo, totalSesiones }, now) {
    if (tratamientos.has(id)) return tratamientos.get(id);
    const t = { id, paciente, telefono, tipo, totalSesiones, sesiones: [], estado: EST.ACTIVO, proximaCita: null, pendienteAgenda: false, creado: now };
    tratamientos.set(id, t);
    return t;
  }

  // Registra una sesión realizada. La fecha identifica la sesión: repetirla no cuenta dos veces.
  function sesion(id, fecha) {
    const t = tratamientos.get(id);
    if (!t || t.estado === EST.COMPLETADO || t.sesiones.includes(fecha)) return;
    t.sesiones.push(fecha);
    t.proximaCita = null; // la sesión agendada ya ocurrió
    cerrarAvisos(id, ['sin_proxima_cita', 'riesgo_abandono']);
    const n = t.sesiones.length;
    if (n >= t.totalSesiones) {
      t.estado = EST.COMPLETADO;
      t.pendienteAgenda = false;
      programarSalida(`${id}|fin|${n}`, t, 'felicitacion', fecha + POST_CUIDADO,
        `Hola ${primerNombre(t)}, terminaste tu ${t.tipo}. Cualquier molestia en los próximos días, responde a este mensaje.`);
      aviso(id, 'completado', `${t.paciente} terminó su ${t.tipo} (${t.totalSesiones} sesiones).`, fecha);
    } else {
      t.estado = EST.ACTIVO;
      t.pendienteAgenda = true; // falta agendar la siguiente sesión
      programarSalida(`${id}|post|${n}`, t, 'post_cuidado', fecha + POST_CUIDADO,
        `Hola ${primerNombre(t)}, ¿cómo sigues después de tu sesión de ${t.tipo}? Si tienes alguna molestia, responde a este mensaje.`);
    }
  }

  // Vincula la próxima cita (agendada en el calendario). Devuelve el tratamiento a Activo.
  function vincularCita(id, citaId, inicio) {
    const t = tratamientos.get(id);
    if (!t || t.estado === EST.COMPLETADO) return;
    if (t.estado === EST.RIESGO) rescates++;
    if (t.pendienteAgenda) { agendaOportuna++; t.pendienteAgenda = false; }
    t.proximaCita = { citaId, inicio };
    t.estado = EST.ACTIVO;
    cerrarAvisos(id, ['sin_proxima_cita', 'riesgo_abandono']);
  }

  // Respuesta del paciente a un mensaje de seguimiento. No equivale a agendar:
  // se registra, se muestra a la asistente y ella agenda en el calendario.
  function responder(id, texto, now) {
    const t = tratamientos.get(id);
    if (!t) return 'ignorada';
    bandeja.push({ id: ++seq, tratamientoId: id, para: t.telefono, hora: now, direccion: 'entrante', texto });
    aviso(id, 'respuesta_seguimiento', `${t.paciente} respondió al seguimiento de ${t.tipo}: "${texto}". Revisa si necesita algo.`, now);
    return 'registrada';
  }

  // Avanza el reloj: actualiza estados por tiempo y envía lo que ya llegó a su hora.
  function avanzar(now) {
    for (const t of tratamientos.values()) {
      if (t.estado === EST.COMPLETADO || !t.sesiones.length || t.proximaCita) continue;
      const dias = (now - t.sesiones[t.sesiones.length - 1]) / DIA;
      if (dias >= DIAS_RIESGO) {
        if (t.estado !== EST.RIESGO) {
          t.estado = EST.RIESGO;
          riesgosTotal++;
          aviso(t.id, 'riesgo_abandono', `${t.paciente} lleva ${DIAS_RIESGO} días sin agendar la próxima sesión de ${t.tipo}. Conviene llamarle.`, now);
        }
      } else if (dias >= DIAS_SIN_CITA && t.estado === EST.ACTIVO) {
        t.estado = EST.SIN_CITA;
        if (t.pendienteAgenda) { agendaTardia++; t.pendienteAgenda = false; }
        programarSalida(`${t.id}|agenda|${t.sesiones.length}`, t, 'recordatorio_agenda', now,
          `Hola ${primerNombre(t)}, para seguir con tu ${t.tipo} falta agendar tu próxima sesión. Responde a este mensaje y te ayudamos.`);
        aviso(t.id, 'sin_proxima_cita', `${t.paciente} lleva ${DIAS_SIN_CITA} días sin agendar la próxima sesión de ${t.tipo}; se le envió un recordatorio.`, now);
      }
    }
    for (const s of salidas) {
      if (s.enviada || s.salida > now) continue;
      const t = tratamientos.get(s.tratamientoId);
      if (!t) continue;
      s.enviada = s.salida;
      bandeja.push({ id: ++seq, clave: s.clave, tratamientoId: t.id, para: t.telefono, tipo: s.tipo, hora: s.salida, direccion: 'saliente', texto: s.texto });
    }
  }

  return {
    alta, sesion, vincularCita, responder, avanzar,
    tratamientos: () => [...tratamientos.values()],
    programados: () => salidas.filter((s) => !s.enviada),
    bandeja: () => bandeja.slice(),
    avisos: () => avisos.filter((a) => a.activo),
    // Contadores para el panel de métricas (datos del prototipo, ilustrativos).
    metricas: () => {
      const ts = [...tratamientos.values()];
      const agendamientos = agendaOportuna + agendaTardia;
      return {
        total: ts.length,
        completados: ts.filter((t) => t.estado === EST.COMPLETADO).length,
        sinCita: ts.filter((t) => t.estado === EST.SIN_CITA).length,
        enRiesgo: ts.filter((t) => t.estado === EST.RIESGO).length,
        conProximaCita: ts.filter((t) => t.sesiones.length && t.proximaCita).length,
        agendaOportuna, agendaTardia,
        pctAgendaOportuna: agendamientos ? Math.round((agendaOportuna / agendamientos) * 100) : null,
        pctFinalizacion: ts.length ? Math.round((ts.filter((t) => t.estado === EST.COMPLETADO).length / ts.length) * 100) : null,
        pctRescate: riesgosTotal ? Math.round((rescates / riesgosTotal) * 100) : null,
        seguimientosEnviados: bandeja.filter((b) => b.direccion === 'saliente').length,
      };
    },
  };
}

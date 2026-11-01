// Motor de recordatorios y confirmación de citas. Lógica pura, sin red:
// no envía mensajes reales ni toca calendarios reales. Todo es simulación.
export const MIN = 60_000;
export const HORA = 60 * MIN;
export const ESTADO = { SIN_CONFIRMAR: 'Sin confirmar', CONFIRMADA: 'Confirmada', CANCELADA: 'Cancelada', EN_RIESGO: 'En riesgo' };
export const REC = { PROGRAMADO: 'Programado', ENVIADO: 'Enviado', ANULADO: 'Anulado' };
export const TIPOS = { H48: { id: '48h', antes: 48 * HORA }, H2: { id: '2h', antes: 2 * HORA } };
export const PLAZO_RIESGO = 30 * MIN; // propuesta: tiempo tras el recordatorio de 2 h para declarar "En riesgo"

export function crearMotor() {
  const citas = new Map();      // id -> cita
  const recordatorios = [];     // todos, con estado
  const bandeja = [];           // mensajes simulados ya enviados (WhatsApp simulado)
  const avisos = [];            // avisos para la asistente
  const registro = [];          // respuestas ignoradas o notas
  let seq = 0;

  const aviso = (citaId, tipo, texto, now) => {
    if (avisos.some((a) => a.citaId === citaId && a.tipo === tipo && a.activo)) return;
    avisos.push({ id: ++seq, citaId, tipo, texto, activo: true, creado: now });
  };
  const cerrarAvisos = (citaId, tipos) => avisos.forEach((a) => { if (a.citaId === citaId && (!tipos || tipos.includes(a.tipo))) a.activo = false; });

  function programar(cita, now) {
    for (const t of Object.values(TIPOS)) {
      const salida = cita.inicio - t.antes;
      const clave = `${cita.id}|${t.id}|${cita.inicio}`;
      if (salida <= now) continue;                       // ya pasó: no se programa ni se envía de golpe
      if (recordatorios.some((r) => r.clave === clave)) continue; // sin duplicados
      recordatorios.push({ clave, citaId: cita.id, tipo: t.id, salida, estado: REC.PROGRAMADO });
    }
    if (cita.inicio - now < TIPOS.H2.antes && cita.inicio > now) {
      aviso(cita.id, 'sin_recordatorio', `${cita.paciente}: la cita es en menos de 2 horas y no hay recordatorio automático. Contacta al paciente.`, now);
    }
  }
  const anularPendientes = (citaId, motivo) => recordatorios.forEach((r) => {
    if (r.citaId === citaId && r.estado === REC.PROGRAMADO) { r.estado = REC.ANULADO; r.motivo = motivo; }
  });

  // Sincroniza con el calendario (simulado). Repetir la misma lista no cambia nada.
  function sincronizar(eventos, now) {
    for (const ev of eventos) {
      const previa = citas.get(ev.id);
      if (!previa) {
        const cita = { id: ev.id, paciente: ev.paciente, telefono: ev.telefono, inicio: ev.inicio, estado: ESTADO.SIN_CONFIRMAR, espacioDisponible: false };
        if (ev.cancelada) { cita.estado = ESTADO.CANCELADA; cita.espacioDisponible = true; citas.set(cita.id, cita); continue; }
        citas.set(cita.id, cita);
        programar(cita, now);
      } else if (ev.cancelada && previa.estado !== ESTADO.CANCELADA) {
        previa.estado = ESTADO.CANCELADA; previa.espacioDisponible = true;
        anularPendientes(previa.id, 'cancelada'); cerrarAvisos(previa.id);
      } else if (!ev.cancelada && previa.estado !== ESTADO.CANCELADA && ev.inicio !== previa.inicio) {
        anularPendientes(previa.id, 'reprogramación');
        cerrarAvisos(previa.id);
        previa.inicio = ev.inicio; previa.estado = ESTADO.SIN_CONFIRMAR;
        programar(previa, now);
      }
    }
  }

  // Avanza el reloj: envía lo que ya llegó a su hora y marca citas en riesgo.
  function avanzar(now) {
    for (const r of recordatorios) {
      if (r.estado !== REC.PROGRAMADO || r.salida > now) continue;
      const cita = citas.get(r.citaId);
      if (!cita || cita.estado === ESTADO.CANCELADA) { r.estado = REC.ANULADO; r.motivo = 'cancelada'; continue; }
      r.estado = REC.ENVIADO; r.enviado = r.salida;
      bandeja.push({ id: ++seq, clave: r.clave, citaId: cita.id, para: cita.telefono, tipo: r.tipo, hora: r.salida, direccion: 'saliente',
        texto: `Hola ${cita.paciente.split(' ')[0]}, te recordamos tu cita en el consultorio de la Dra. Laura. Responde 1 para confirmar o 2 para cancelar.` });
    }
    for (const cita of citas.values()) {
      if (cita.estado !== ESTADO.SIN_CONFIRMAR) continue;
      const r2 = recordatorios.find((r) => r.citaId === cita.id && r.tipo === '2h' && r.estado === REC.ENVIADO && r.clave.endsWith(`|${cita.inicio}`));
      if (r2 && now >= r2.enviado + PLAZO_RIESGO && now < cita.inicio) {
        cita.estado = ESTADO.EN_RIESGO;
        aviso(cita.id, 'en_riesgo', `${cita.paciente} no ha respondido al recordatorio de 2 horas. La cita sigue activa.`, now);
      }
    }
  }

  // Respuesta del paciente por WhatsApp (simulada).
  function responder(telefono, texto, now) {
    const enviados = bandeja.filter((m) => m.para === telefono && m.direccion === 'saliente');
    const ultimo = enviados[enviados.length - 1];
    if (!ultimo) { registro.push({ hora: now, telefono, texto, nota: 'sin recordatorio previo; ignorada' }); return 'ignorada'; }
    const cita = citas.get(ultimo.citaId);
    const op = String(texto).trim();
    bandeja.push({ id: ++seq, citaId: cita.id, para: telefono, hora: now, direccion: 'entrante', texto });
    if (cita.estado === ESTADO.CANCELADA) { registro.push({ hora: now, telefono, texto, nota: 'cita cancelada; no se reactiva' }); return 'ignorada'; }
    if (op === '1') {
      if (cita.estado !== ESTADO.CONFIRMADA) { cita.estado = ESTADO.CONFIRMADA; cerrarAvisos(cita.id, ['en_riesgo']); }
      return 'confirmada';
    }
    if (op === '2') {
      cita.estado = ESTADO.CANCELADA; cita.espacioDisponible = true;
      anularPendientes(cita.id, 'cancelada'); cerrarAvisos(cita.id, ['en_riesgo', 'sin_recordatorio']);
      aviso(cita.id, 'cancelada', `${cita.paciente} canceló. El espacio puede ofrecerse a otro paciente.`, now);
      return 'cancelada';
    }
    const ya = bandeja.some((m) => m.citaId === cita.id && m.tipo === 'aclaracion');
    if (!ya) bandeja.push({ id: ++seq, citaId: cita.id, para: telefono, hora: now, direccion: 'saliente', tipo: 'aclaracion', texto: 'No entendí tu respuesta. Responde 1 para confirmar o 2 para cancelar.' });
    aviso(cita.id, 'respuesta_confusa', `${cita.paciente} respondió "${op}", que no se entiende. Revisa el caso.`, now);
    return 'aclaracion';
  }

  return {
    sincronizar, avanzar, responder,
    citas: () => [...citas.values()].sort((a, b) => a.inicio - b.inicio),
    recordatorios: () => recordatorios.slice(),
    programados: () => recordatorios.filter((r) => r.estado === REC.PROGRAMADO),
    bandeja: () => bandeja.slice(),
    avisos: () => avisos.filter((a) => a.activo),
    registro: () => registro.slice(),
  };
}

// Lógica pura del prototipo. Todo es ficticio y simulado: no hay calendarios, WhatsApp ni servicios reales.
export const H = 3600_000;
export const D = 24 * H;
export const BASE = Date.UTC(2026, 10, 2, 12, 30); // lunes 2 nov 2026, 7:30 a. m. hora de Bogotá (ficticio)
export const SEGUIMIENTO_DIAS = 7; // recordar al paciente su siguiente sesión
export const ABANDONO_DIAS = 14; // alertar al consultorio

export type Status = 'pendiente' | 'confirmada' | 'cancelada';
export type Reminder = { kind: '48h' | '2h'; at: number; sent: boolean };
export type Appt = { id: number; patient: string; start: number; status: Status; reminders: Reminder[]; noConfirmAlerted: boolean; email?: string };
export type Msg = { id: number; at: number; to: string; text: string; kind: '48h' | '2h' | 'seguimiento' | 'email'; apptId?: number; canReply: boolean; reply?: 'confirmar' | 'cancelar' };
export type Alert = { id: number; at: number; kind: 'cancelacion' | 'sin-confirmar' | 'abandono' | 'info'; text: string; done: boolean };
export type Treatment = { id: number; patient: string; name: string; total: number; done: number; lastAt: number; followSent: boolean; alerted: boolean };
export type State = { now: number; seq: number; appts: Appt[]; msgs: Msg[]; alerts: Alert[]; treatments: Treatment[] };

const fmtHour = (t: number) => new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/Bogota' }).format(t);
export const fmt = fmtHour;
export const fmtShort = (t: number) => new Intl.DateTimeFormat('es-CO', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/Bogota' }).format(t);
export const fmtTime = (t: number) => new Intl.DateTimeFormat('es-CO', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/Bogota' }).format(t);
export const dayKey = (t: number) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(t);

function next(s: State): [State, number] { return [{ ...s, seq: s.seq + 1 }, s.seq]; }

/** Simula el evento nuevo de Google Calendar: crea la cita ya confirmada y programa los recordatorios que aún están en el futuro. Con correo opcional, muestra también el email de confirmación simulado. */
export function createAppt(s: State, patient: string, start: number, email?: string, status: Status = 'confirmada'): State {
  let [s2, id] = next(s);
  const reminders: Reminder[] = ([['48h', 48 * H], ['2h', 2 * H]] as const)
    .map(([kind, off]) => ({ kind, at: start - off, sent: false }))
    .filter((r) => r.at > s.now);
  const appt: Appt = { id, patient, start, status, reminders, noConfirmAlerted: false, ...(email ? { email } : {}) };
  s2 = { ...s2, appts: [...s2.appts, appt].sort((a, b) => a.start - b.start) };
  if (email) {
    const [s3, mid] = next(s2);
    s2 = { ...s3, msgs: [...s3.msgs, { id: mid, at: s.now, to: email, kind: 'email', canReply: false,
      text: `Asunto: Confirmación de tu cita - Consultorio de la Dra. Laura\n\nHola ${patient.split(' ')[0]}, tu cita quedó confirmada para ${fmt(start)} Estado: Confirmada. En un sistema real te llegarían recordatorios por WhatsApp 48 h y 2 h antes; en esta demo eso también es simulado.` }] };
  }
  return s2;
}

const nextAppt = (s: State, patient: string) => s.appts.find((a) => a.patient === patient && a.status !== 'cancelada' && a.start > s.now);

/** Tareas automáticas: envía lo que ya toca (simulado) y genera alertas. Es idempotente. */
export function runJobs(s: State): State {
  let st = s;
  const addMsg = (m: Omit<Msg, 'id'>) => { const [s2, id] = next(st); st = { ...s2, msgs: [...s2.msgs, { ...m, id }] }; };
  const addAlert = (a: Omit<Alert, 'id' | 'done'>) => { const [s2, id] = next(st); st = { ...s2, alerts: [...s2.alerts, { ...a, id, done: false }] }; };

  for (const a of s.appts) {
    if (a.status === 'cancelada') continue;
    for (const r of a.reminders) {
      const cur = st.appts.find((x) => x.id === a.id)!;
      const rem = cur.reminders.find((x) => x.kind === r.kind)!;
      if (!rem.sent && rem.at <= st.now && cur.start > st.now) {
        addMsg({ at: rem.at, to: cur.patient, kind: r.kind, apptId: cur.id, canReply: true,
          text: cur.status === 'confirmada'
            ? `Hola ${cur.patient.split(' ')[0]}, te recordamos tu cita confirmada en el consultorio de la Dra. Laura: ${fmt(cur.start)} Si necesitas cancelarla, responde 2.`
            : `Hola ${cur.patient.split(' ')[0]}, te recordamos tu cita en el consultorio de la Dra. Laura: ${fmt(cur.start)} Responde 1 para confirmar o 2 para cancelar.` });
        st = { ...st, appts: st.appts.map((x) => x.id === cur.id ? { ...x, reminders: x.reminders.map((y) => y.kind === r.kind ? { ...y, sent: true } : y) } : x) };
      }
    }
    const cur = st.appts.find((x) => x.id === a.id)!;
    if (cur.status === 'pendiente' && !cur.noConfirmAlerted && cur.start - st.now <= 1 * H && cur.start > st.now && cur.reminders.length > 0) {
      addAlert({ at: st.now, kind: 'sin-confirmar', text: `${cur.patient} no ha confirmado su cita de ${fmtTime(cur.start)} (falta 1 hora o menos). Llamar o ofrecer el espacio a otro paciente.` });
      st = { ...st, appts: st.appts.map((x) => x.id === cur.id ? { ...x, noConfirmAlerted: true } : x) };
    }
  }

  for (const t of s.treatments) {
    const cur = st.treatments.find((x) => x.id === t.id)!;
    if (cur.done >= cur.total) continue;
    if (nextAppt(st, cur.patient)) continue;
    const days = (st.now - cur.lastAt) / D;
    if (!cur.followSent && days >= SEGUIMIENTO_DIAS) {
      addMsg({ at: st.now, to: cur.patient, kind: 'seguimiento', canReply: false,
        text: `Hola ${cur.patient.split(' ')[0]}, te escribe el consultorio de la Dra. Laura. Aún te falta la sesión ${cur.done + 1} de ${cur.total} de tu tratamiento de ${cur.name.toLowerCase()}. ¿Quieres que te agendemos?` });
      st = { ...st, treatments: st.treatments.map((x) => x.id === cur.id ? { ...x, followSent: true } : x) };
    }
    if (!cur.alerted && days >= ABANDONO_DIAS) {
      addAlert({ at: st.now, kind: 'abandono', text: `${cur.patient} lleva ${Math.floor(days)} días sin agendar la sesión ${cur.done + 1} de ${cur.total} (${cur.name.toLowerCase()}). Contactar para retomar.` });
      st = { ...st, treatments: st.treatments.map((x) => x.id === cur.id ? { ...x, alerted: true } : x) };
    }
  }
  return st;
}

export function advance(s: State, ms: number): State { return runJobs({ ...s, now: s.now + ms }); }

/** Simula la respuesta del paciente (1 = confirmar, 2 = cancelar). */
export function reply(s: State, msgId: number, answer: 'confirmar' | 'cancelar'): State {
  const m = s.msgs.find((x) => x.id === msgId);
  if (!m || !m.canReply || m.reply || m.apptId == null) return s;
  const a = s.appts.find((x) => x.id === m.apptId)!;
  const [s2, id] = next(s);
  const text = answer === 'confirmar'
    ? `${a.patient} confirmó su cita de ${fmtShort(a.start)}.`
    : `${a.patient} canceló su cita de ${fmtShort(a.start)}. El espacio queda libre: ofrecerlo a otro paciente.`;
  return {
    ...s2,
    msgs: s2.msgs.map((x) => x.id === msgId ? { ...x, reply: answer } : x),
    appts: s2.appts.map((x) => x.id === a.id ? { ...x, status: answer === 'confirmar' ? 'confirmada' : 'cancelada' } : x),
    alerts: [...s2.alerts, { id, at: s.now, kind: answer === 'confirmar' ? 'info' : 'cancelacion', text, done: answer === 'confirmar' }],
  };
}

/** La asistente registra que el paciente asistió a una sesión del plan. */
export function registerSession(s: State, tid: number): State {
  return runJobs({ ...s, treatments: s.treatments.map((t) => t.id === tid && t.done < t.total ? { ...t, done: t.done + 1, lastAt: s.now, followSent: false, alerted: false } : t) });
}

export function seed(): State {
  let s: State = { now: BASE, seq: 1, appts: [], msgs: [], alerts: [], treatments: [
    { id: 1001, patient: 'Rosa Vargas', name: 'Endodoncia', total: 3, done: 1, lastAt: BASE - 21 * D, followSent: false, alerted: false },
    { id: 1002, patient: 'Pedro Silva', name: 'Endodoncia', total: 3, done: 2, lastAt: BASE - 9 * D, followSent: false, alerted: false },
    { id: 1003, patient: 'Luisa Gómez', name: 'Ortodoncia (controles)', total: 8, done: 4, lastAt: BASE - 28 * D, followSent: false, alerted: false },
  ] };
  const at = (day: number, h: number, m = 0) => BASE - 7.5 * H + day * D + h * H + m * 60_000; // h en hora de Bogotá
  s = createAppt(s, 'Marta Rojas', at(0, 9));
  s = createAppt(s, 'Carlos Peña', at(0, 10), undefined, 'pendiente');
  s = createAppt(s, 'Luisa Gómez', at(0, 11, 30), undefined, 'pendiente');
  s = createAppt(s, 'Andrés Mora', at(1, 15), undefined, 'pendiente');
  s = createAppt(s, 'Sofía Díaz', at(2, 10), undefined, 'pendiente');
  return runJobs(s);
}

export type Check = { name: string; ok: boolean; detail: string };
export function selfTests(): Check[] {
  const out: Check[] = [];
  // 1. Recordatorios se programan al crear una cita y se envían (simulados) cuando llega su hora.
  let s = seed();
  const start = s.now + 3 * D + 2 * H;
  const before = s.msgs.length;
  s = createAppt(s, 'Paciente de prueba', start, undefined, 'pendiente');
  const a = s.appts.find((x) => x.patient === 'Paciente de prueba')!;
  const okSched = a.reminders.length === 2 && a.reminders[0].at === start - 48 * H && a.reminders[1].at === start - 2 * H && s.msgs.length === before;
  s = advance(s, 1 * D + 4 * H);
  const m48 = s.msgs.find((m) => m.apptId === a.id && m.kind === '48h');
  out.push({ name: '1. Al crear la cita se programan los recordatorios de 48 h y 2 h', ok: okSched && !!m48 && !s.msgs.some((m) => m.apptId === a.id && m.kind === '2h'),
    detail: okSched ? 'Quedaron 2 recordatorios programados; el de 48 h llegó a la bandeja simulada al avanzar el reloj y el de 2 h sigue pendiente.' : 'Falló la programación.' });
  // 2. Confirmar y cancelar actualizan el estado y avisan a la asistente.
  const rc = reply(s, m48!.id, 'confirmar');
  const confirmed = rc.appts.find((x) => x.id === a.id)!.status === 'confirmada';
  s = advance(s, 44 * H + 30 * 60_000);
  const m2 = s.msgs.find((m) => m.apptId === a.id && m.kind === '2h');
  const rx = m2 ? reply(s, m2.id, 'cancelar') : s;
  const cancelled = !!m2 && rx.appts.find((x) => x.id === a.id)!.status === 'cancelada' && rx.alerts.some((al) => al.kind === 'cancelacion' && al.text.includes('Paciente de prueba'));
  out.push({ name: '2. Una respuesta de confirmar o cancelar cambia el estado y avisa a la asistente', ok: confirmed && cancelled,
    detail: confirmed && cancelled ? 'Confirmar dejó la cita en "confirmada"; cancelar la dejó en "cancelada" y creó la alerta de espacio libre.' : 'Falló la actualización.' });
  // 3. Tratamiento abandonado genera alerta de seguimiento.
  const s0 = seed();
  const ab = s0.alerts.some((al) => al.kind === 'abandono' && al.text.includes('Rosa Vargas')) && s0.msgs.some((m) => m.kind === 'seguimiento' && m.to === 'Rosa Vargas');
  const s5 = advance(s0, 6 * D);
  const ab2 = s5.alerts.some((al) => al.kind === 'abandono' && al.text.includes('Pedro Silva'));
  const noClin = !s0.alerts.some((al) => al.text.includes('Luisa Gómez') && al.kind === 'abandono');
  out.push({ name: '3. Un tratamiento abandonado genera su alerta de seguimiento', ok: ab && ab2 && noClin,
    detail: ab && ab2 ? 'Rosa (21 días sin volver) recibió el recordatorio y generó alerta al inicio; Pedro la generó al pasar 14 días. Luisa, que sí tiene cita agendada, no genera alerta.' : 'Falló el seguimiento.' });
  // 4. Con correo opcional aparece el email de confirmación simulado; sin correo, no.
  let s4 = seed();
  s4 = createAppt(s4, 'Con Correo', s4.now + 2 * D, 'paciente@example.com');
  const emailsTrasCon = s4.msgs.filter((m) => m.kind === 'email').length;
  s4 = createAppt(s4, 'Sin Correo', s4.now + 2 * D);
  const emailsFinal = s4.msgs.filter((m) => m.kind === 'email').length;
  const mailOk = emailsTrasCon === 1 && emailsFinal === 1 && s4.msgs.some((m) => m.kind === 'email' && m.to === 'paciente@example.com');
  out.push({ name: '4. Con correo opcional se muestra el email de confirmación simulado; sin correo, no',
    ok: mailOk,
    detail: mailOk ? 'Al crear la cita con correo apareció un solo email simulado dirigido a esa dirección; la cita sin correo no generó ninguno.' : 'Falló la simulación del correo.' });
  return out;
}

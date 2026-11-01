import test from 'node:test';
import assert from 'node:assert/strict';
import { crearSeguimiento, DIA, EST } from '../src/treatments.js';

const T0 = Date.UTC(2026, 10, 2, 13, 0); // 2 nov 2026, 8:00 a. m. Colombia
const tr = (id, totalSesiones = 3) => ({ id, paciente: 'Paciente Prueba', telefono: '+570000000' + id, tipo: 'endodoncia', totalSesiones });

test('T1 cada sesión programa su mensaje de cuidado una sola vez y sale a las 24 h, no antes', () => {
  const s = crearSeguimiento();
  s.alta(tr('1'), T0);
  s.sesion('1', T0); s.sesion('1', T0); // repetir la misma sesión no cuenta dos veces
  assert.equal(s.tratamientos()[0].sesiones.length, 1);
  assert.equal(s.programados().length, 1);
  s.avanzar(T0 + 23 * 60 * 60 * 1000);
  assert.equal(s.bandeja().length, 0); // todavía no sale
  s.avanzar(T0 + 24 * 60 * 60 * 1000); s.avanzar(T0 + 24 * 60 * 60 * 1000);
  assert.equal(s.bandeja().filter((b) => b.tipo === 'post_cuidado').length, 1); // una sola vez
  assert.match(s.bandeja()[0].texto, /¿cómo sigues/);
});

test('T2 la última sesión completa el tratamiento, felicita y no genera más recordatorios ni alertas', () => {
  const s = crearSeguimiento();
  s.alta(tr('1', 2), T0);
  s.sesion('1', T0); s.sesion('1', T0 + DIA);
  assert.equal(s.tratamientos()[0].estado, EST.COMPLETADO);
  s.avanzar(T0 + 2 * DIA);
  assert.equal(s.bandeja().filter((b) => b.tipo === 'felicitacion').length, 1);
  assert.ok(s.avisos().some((a) => a.tipo === 'completado'));
  s.avanzar(T0 + 30 * DIA); // ni a los 30 días hay recordatorios ni alertas de abandono
  assert.equal(s.bandeja().filter((b) => b.tipo === 'recordatorio_agenda').length, 0);
  assert.ok(!s.avisos().some((a) => a.tipo === 'riesgo_abandono' || a.tipo === 'sin_proxima_cita'));
});

test('T3 siete días sin próxima cita: recordatorio al paciente y aviso; agendar vuelve a Activo', () => {
  const s = crearSeguimiento();
  s.alta(tr('1'), T0);
  s.sesion('1', T0);
  s.avanzar(T0 + 7 * DIA);
  const t = s.tratamientos()[0];
  assert.equal(t.estado, EST.SIN_CITA);
  assert.equal(s.bandeja().filter((b) => b.tipo === 'recordatorio_agenda').length, 1);
  assert.ok(s.avisos().some((a) => a.tipo === 'sin_proxima_cita'));
  s.vincularCita('1', 'cita-9', T0 + 9 * DIA);
  assert.equal(s.tratamientos()[0].estado, EST.ACTIVO);
  assert.ok(!s.avisos().some((a) => a.tipo === 'sin_proxima_cita'));
});

test('T4 catorce días sin cita: En riesgo de abandono con aviso; nunca se da por abandonado solo', () => {
  const s = crearSeguimiento();
  s.alta(tr('1'), T0);
  s.sesion('1', T0);
  s.avanzar(T0 + 13 * DIA);
  assert.equal(s.tratamientos()[0].estado, EST.SIN_CITA); // aún no
  s.avanzar(T0 + 14 * DIA);
  assert.equal(s.tratamientos()[0].estado, EST.RIESGO);
  assert.ok(s.avisos().some((a) => a.tipo === 'riesgo_abandono'));
  s.avanzar(T0 + 60 * DIA); // el tiempo nunca lo marca como abandonado
  assert.equal(s.tratamientos()[0].estado, EST.RIESGO);
  s.vincularCita('1', 'cita-9', T0 + 61 * DIA); // agendar lo reactiva
  assert.equal(s.tratamientos()[0].estado, EST.ACTIVO);
  assert.ok(!s.avisos().length);
});

test('T5 sin duplicados al avanzar de nuevo y la respuesta del paciente avisa a la asistente sin agendar', () => {
  const s = crearSeguimiento();
  s.alta(tr('1'), T0);
  s.sesion('1', T0);
  s.avanzar(T0 + 7 * DIA); s.avanzar(T0 + 7 * DIA); s.avanzar(T0 + 7 * DIA);
  assert.equal(s.bandeja().filter((b) => b.tipo === 'recordatorio_agenda').length, 1);
  assert.equal(s.avisos().filter((a) => a.tipo === 'sin_proxima_cita').length, 1);
  assert.equal(s.responder('1', 'me duele un poco', T0 + 7 * DIA), 'registrada');
  assert.ok(s.avisos().some((a) => a.tipo === 'respuesta_seguimiento'));
  assert.equal(s.tratamientos()[0].estado, EST.SIN_CITA); // responder no agenda
  assert.equal(s.responder('9', 'hola', T0), 'ignorada'); // tratamiento inexistente
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { crearMotor, HORA, MIN, ESTADO, REC } from '../src/engine.js';

const T0 = Date.UTC(2026, 10, 2, 13, 0); // 2 nov 2026, 8:00 a. m. Colombia
const ev = (id, inicio, extra = {}) => ({ id, paciente: 'Paciente Prueba', telefono: '+570000000' + id, inicio, ...extra });

test('C1 programación: dos recordatorios Programados, ninguno Enviado; luego salen una sola vez', () => {
  const m = crearMotor(); const inicio = T0 + 72 * HORA;
  m.sincronizar([ev('1', inicio)], T0);
  assert.equal(m.programados().length, 2);
  assert.equal(m.recordatorios().filter((r) => r.estado === REC.ENVIADO).length, 0);
  assert.equal(m.bandeja().length, 0);
  m.avanzar(inicio - 48 * HORA); m.avanzar(inicio - 48 * HORA);
  assert.equal(m.bandeja().filter((b) => b.tipo === '48h').length, 1);
  m.avanzar(inicio - 2 * HORA);
  assert.equal(m.bandeja().filter((b) => b.tipo === '2h').length, 1);
  assert.equal(m.programados().length, 0);
});

test('C2 responder 1 confirma; responder 2 cancela, avisa, libera y suprime pendientes', () => {
  const m = crearMotor(); const inicio = T0 + 72 * HORA;
  m.sincronizar([ev('1', inicio), ev('2', inicio + HORA)], T0);
  m.avanzar(inicio - 47 * HORA);
  assert.equal(m.responder('+5700000001', '1', inicio - 47 * HORA), 'confirmada');
  assert.equal(m.citas()[0].estado, ESTADO.CONFIRMADA);
  assert.equal(m.responder('+5700000002', '2', inicio - 47 * HORA), 'cancelada');
  const c2 = m.citas().find((c) => c.id === '2');
  assert.equal(c2.estado, ESTADO.CANCELADA); assert.equal(c2.espacioDisponible, true);
  assert.ok(m.avisos().some((a) => a.citaId === '2' && a.tipo === 'cancelada'));
  assert.ok(m.recordatorios().filter((r) => r.citaId === '2' && r.tipo === '2h').every((r) => r.estado === REC.ANULADO));
  m.avanzar(inicio - 1 * HORA);
  assert.equal(m.bandeja().filter((b) => b.citaId === '2' && b.direccion === 'saliente' && b.tipo === '2h').length, 0);
});

test('C3 silencio: En riesgo a los 30 min del recordatorio de 2 h; no cancela ni libera', () => {
  const m = crearMotor(); const inicio = T0 + 72 * HORA;
  m.sincronizar([ev('1', inicio)], T0);
  m.avanzar(inicio - 2 * HORA + 29 * MIN);
  assert.equal(m.citas()[0].estado, ESTADO.SIN_CONFIRMAR);
  m.avanzar(inicio - 2 * HORA + 30 * MIN);
  const c = m.citas()[0];
  assert.equal(c.estado, ESTADO.EN_RIESGO); assert.equal(c.espacioDisponible, false);
  assert.ok(m.avisos().some((a) => a.tipo === 'en_riesgo'));
  assert.equal(m.recordatorios().filter((r) => r.estado === REC.ANULADO).length, 0);
  m.avanzar(inicio - 1 * MIN); assert.equal(m.citas()[0].estado, ESTADO.EN_RIESGO);
  // respuesta tardía 1 sí confirma
  m.responder('+5700000001', '1', inicio - 10 * MIN);
  assert.equal(m.citas()[0].estado, ESTADO.CONFIRMADA);
});

test('C4 reprogramación: anula pendientes, crea nuevos, vuelve a Sin confirmar, conserva lo enviado', () => {
  const m = crearMotor(); const inicio = T0 + 72 * HORA;
  m.sincronizar([ev('1', inicio)], T0);
  m.avanzar(inicio - 48 * HORA);
  m.responder('+5700000001', '1', inicio - 48 * HORA + MIN);
  const nuevo = inicio + 24 * HORA;
  m.sincronizar([ev('1', nuevo)], inicio - 47 * HORA);
  const c = m.citas()[0];
  assert.equal(c.estado, ESTADO.SIN_CONFIRMAR);
  const rs = m.recordatorios();
  assert.equal(rs.filter((r) => r.motivo === 'reprogramación').length, 1);        // el 2 h antiguo
  assert.equal(rs.filter((r) => r.estado === REC.ENVIADO).length, 1);              // el 48 h enviado queda
  assert.equal(rs.filter((r) => r.estado === REC.PROGRAMADO).length, 2);           // 48 h y 2 h nuevos
  assert.ok(rs.filter((r) => r.estado === REC.PROGRAMADO).every((r) => r.clave.endsWith(`|${nuevo}`)));
  assert.equal(m.bandeja().length, 2); // saliente 48h + entrante "1", intactos
});

test('C5 poco margen y duplicados', () => {
  const m = crearMotor();
  m.sincronizar([ev('1', T0 + 10 * HORA)], T0);              // <48 h: solo 2 h
  assert.deepEqual(m.programados().map((r) => r.tipo), ['2h']);
  m.sincronizar([ev('2', T0 + 1 * HORA)], T0);               // <2 h: ninguno + aviso
  assert.equal(m.programados().filter((r) => r.citaId === '2').length, 0);
  assert.ok(m.avisos().some((a) => a.citaId === '2' && a.tipo === 'sin_recordatorio'));
  assert.equal(m.bandeja().length, 0);                       // nada sale de golpe
  const lista = [ev('1', T0 + 10 * HORA), ev('2', T0 + HORA)];
  m.sincronizar(lista, T0); m.sincronizar(lista, T0);        // sincronizar de nuevo
  assert.equal(m.recordatorios().length, 1); assert.equal(m.avisos().length, 1);
  m.avanzar(T0 + 8 * HORA);
  m.responder('+5700000001', '1', T0 + 8 * HORA + MIN); m.responder('+5700000001', '1', T0 + 8 * HORA + 2 * MIN);
  assert.equal(m.citas().find((c) => c.id === '1').estado, ESTADO.CONFIRMADA);
});

test('respuesta ambigua: aclaración una vez y aviso; respuesta tras cancelar no reactiva', () => {
  const m = crearMotor(); const inicio = T0 + 72 * HORA;
  m.sincronizar([ev('1', inicio)], T0); m.avanzar(inicio - 48 * HORA);
  m.responder('+5700000001', 'tal vez', inicio - 47 * HORA); m.responder('+5700000001', 'no sé', inicio - 46 * HORA);
  assert.equal(m.bandeja().filter((b) => b.tipo === 'aclaracion').length, 1);
  assert.ok(m.avisos().some((a) => a.tipo === 'respuesta_confusa'));
  m.responder('+5700000001', '2', inicio - 45 * HORA);
  assert.equal(m.responder('+5700000001', '1', inicio - 44 * HORA), 'ignorada');
  assert.equal(m.citas()[0].estado, ESTADO.CANCELADA);
});

test('cancelación hecha en el calendario suprime recordatorios y libera el espacio', () => {
  const m = crearMotor(); const inicio = T0 + 72 * HORA;
  m.sincronizar([ev('1', inicio)], T0);
  m.sincronizar([ev('1', inicio, { cancelada: true })], T0 + HORA);
  assert.equal(m.programados().length, 0); assert.equal(m.citas()[0].espacioDisponible, true);
});

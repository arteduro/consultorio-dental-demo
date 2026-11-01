import { crearMotor, HORA, MIN, ESTADO } from './engine.js';
import { crearSeguimiento, DIA, EST } from './treatments.js';

const motor = crearMotor();          // recordatorios de citas (clase 2)
const seg = crearSeguimiento();      // seguimiento de tratamientos (clase 3)
let ahora = Date.UTC(2026, 10, 2, 13, 0); // 2 nov 2026, 8:00 a. m. Colombia (ficticio)
let pestana = 'programados';
let seccion = 'citas';
const calendario = [
  { id: 'a1', paciente: 'María Pérez', telefono: '+57 3XX XXX 0101', inicio: ahora + 72 * HORA },
  { id: 'a2', paciente: 'Carlos Rojas', telefono: '+57 3XX XXX 0102', inicio: ahora + 30 * HORA },
  { id: 'a3', paciente: 'Ana Duarte', telefono: '+57 3XX XXX 0103', inicio: ahora + 6 * HORA },
];
const fmt = new Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota', weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
const $ = (id) => document.getElementById(id);
const nombre = (id) => (motor.citas().find((c) => c.id === id) || {}).paciente || id;
let n = 3, nt = 3;

function tick(t) { motor.avanzar(t); seg.avanzar(t); }
function sincronizar() { motor.sincronizar(calendario, ahora); tick(ahora); }

// Datos ficticios iniciales de tratamientos
seg.alta({ id: 't1', paciente: 'María Pérez', telefono: '+57 3XX XXX 0101', tipo: 'endodoncia', totalSesiones: 3 }, ahora - 20 * DIA);
seg.sesion('t1', ahora - 2 * DIA);
seg.vincularCita('t1', 'a1', ahora + 72 * HORA); // su próxima sesión ya está en el calendario
seg.alta({ id: 't2', paciente: 'Carlos Rojas', telefono: '+57 3XX XXX 0102', tipo: 'ortodoncia', totalSesiones: 4 }, ahora - 40 * DIA);
seg.sesion('t2', ahora - 30 * DIA); seg.sesion('t2', ahora - 8 * DIA); // lleva 8 días sin agendar
seg.alta({ id: 't3', paciente: 'Ana Duarte', telefono: '+57 3XX XXX 0103', tipo: 'limpieza', totalSesiones: 2 }, ahora - 5 * DIA);

function pintarHoy() {
  const citas = motor.citas();
  const sinConf = citas.filter((c) => c.estado === ESTADO.SIN_CONFIRMAR).length;
  const riesgo = citas.filter((c) => c.estado === ESTADO.EN_RIESGO).length;
  const m = seg.metricas();
  const atencion = riesgo + m.enRiesgo + m.sinCita;
  $('hoy').innerHTML = '';
  const chips = [
    [`<b>${citas.length}</b> citas en agenda`, ''],
    [`<b>${sinConf}</b> sin confirmar`, sinConf ? 'atencion' : 'ok'],
    [`<b>${riesgo}</b> citas en riesgo`, riesgo ? 'atencion' : 'ok'],
    [`<b>${m.sinCita + m.enRiesgo}</b> tratamientos por atender`, atencion ? 'atencion' : 'ok'],
  ];
  for (const [html, cls] of chips) { const d = document.createElement('span'); d.className = 'chip ' + cls; d.innerHTML = html; $('hoy').append(d); }
}

function pintarCitas() {
  const el = $('citas'); el.textContent = '';
  const citas = motor.citas();
  if (!citas.length) el.innerHTML = '<p class="vacio">No hay citas.</p>';
  for (const c of citas) {
    const d = document.createElement('div'); d.className = 'cita';
    d.innerHTML = `<div class="fila"><span class="nombre"></span><span><span class="badge" data-e="${c.estado}">${c.estado}</span>${c.espacioDisponible ? '<span class="libre">Espacio disponible para ofrecer</span>' : ''}</span></div><div class="meta"></div><div class="acciones"></div>`;
    d.querySelector('.nombre').textContent = c.paciente;
    d.querySelector('.meta').textContent = `${fmt.format(c.inicio)} · ${c.telefono}`;
    const ac = d.querySelector('.acciones');
    const btn = (t, f) => { const b = document.createElement('button'); b.textContent = t; b.onclick = f; ac.append(b); };
    if (c.estado !== ESTADO.CANCELADA) {
      btn('Paciente responde 1', () => { motor.responder(c.telefono, '1', ahora); pintar(); });
      btn('Paciente responde 2', () => { motor.responder(c.telefono, '2', ahora); pintar(); });
      btn('Responde "tal vez"', () => { motor.responder(c.telefono, 'tal vez', ahora); pintar(); });
      btn('Reprogramar +1 día', () => { const e = calendario.find((x) => x.id === c.id); e.inicio += 24 * HORA; sincronizar(); pintar(); });
      btn('Cancelar en calendario', () => { calendario.find((x) => x.id === c.id).cancelada = true; sincronizar(); pintar(); });
    }
    el.append(d);
  }
}

function pintarAvisos() {
  const av = $('avisos'); av.textContent = '';
  const lista = [...motor.avisos(), ...seg.avisos()].sort((a, b) => a.creado - b.creado);
  if (!lista.length) av.innerHTML = '<p class="vacio">Sin avisos por ahora.</p>';
  for (const a of lista) { const d = document.createElement('div'); d.className = 'alerta' + (a.tipo === 'cancelada' || a.tipo === 'riesgo_abandono' ? ' cancelada' : ''); d.textContent = a.texto; av.append(d); }
}

function pintarBandeja() {
  $('t-prog').setAttribute('aria-pressed', pestana === 'programados'); $('t-env').setAttribute('aria-pressed', pestana === 'enviados');
  const bj = $('bandeja'); bj.textContent = '';
  const items = pestana === 'programados'
    ? [...motor.programados().map((r) => ({ salida: r.salida, top: `Sale ${fmt.format(r.salida)} (${r.tipo} antes) · ${nombre(r.citaId)}`, texto: 'Recordatorio de cita programado, aún no enviado' })),
       ...seg.programados().map((s) => { const t = seg.tratamientos().find((x) => x.id === s.tratamientoId) || {}; return { salida: s.salida, top: `Sale ${fmt.format(s.salida)} · ${t.paciente || ''}`, texto: `Seguimiento de ${t.tipo || 'tratamiento'} programado, aún no enviado` }; })]
      .sort((a, b) => a.salida - b.salida)
    : [...motor.bandeja(), ...seg.bandeja()].sort((a, b) => a.hora - b.hora)
      .map((m2) => { const tt = m2.tratamientoId ? (seg.tratamientos().find((x) => x.id === m2.tratamientoId) || {}).paciente : (motor.citas().find((c) => c.id === m2.citaId) || {}).paciente; return { cls: m2.direccion, top: `${m2.direccion === 'entrante' ? 'Respuesta de' : 'Enviado a'} ${tt || m2.para} · ${fmt.format(m2.hora)}`, texto: m2.texto }; });
  if (!items.length) bj.innerHTML = `<p class="vacio">${pestana === 'programados' ? 'Nada programado.' : 'Todavía no se ha enviado nada.'}</p>`;
  for (const i of items) { const d = document.createElement('div'); d.className = 'msg ' + (i.cls || ''); d.innerHTML = '<small></small><span></span>'; d.querySelector('small').textContent = i.top; d.querySelector('span').textContent = i.texto; bj.append(d); }
}

function pintarTratamientos() {
  const el = $('tratamientos'); el.textContent = '';
  const ts = seg.tratamientos();
  if (!ts.length) el.innerHTML = '<p class="vacio">No hay tratamientos registrados.</p>';
  for (const t of ts) {
    const d = document.createElement('div'); d.className = 'trat-card';
    const hechas = t.sesiones.length, pct = Math.round((hechas / t.totalSesiones) * 100);
    d.innerHTML = `<div class="fila"><span class="nombre"></span><span class="badge" data-e="${t.estado}">${t.estado}</span></div>
      <div class="tipo"></div><div class="meta"></div>
      <div class="progreso"><div class="barra"><i style="width:${pct}%"></i></div><small>Sesión ${hechas} de ${t.totalSesiones}</small></div>
      <div class="acciones"></div>`;
    d.querySelector('.nombre').textContent = t.paciente;
    d.querySelector('.tipo').textContent = t.tipo;
    d.querySelector('.meta').textContent = t.proximaCita ? `Próxima sesión: ${fmt.format(t.proximaCita.inicio)}` : (t.estado === EST.COMPLETADO ? 'Tratamiento terminado' : 'Sin próxima sesión agendada');
    const ac = d.querySelector('.acciones');
    const btn = (tx, f) => { const b = document.createElement('button'); b.textContent = tx; b.onclick = f; ac.append(b); };
    if (t.estado !== EST.COMPLETADO) {
      btn('Sesión realizada', () => { seg.sesion(t.id, ahora); tick(ahora); pintar(); });
      if (!t.proximaCita) btn('Agendar próxima sesión', () => { const inicio = ahora + 3 * DIA; calendario.push({ id: 'a' + (++n), paciente: t.paciente, telefono: t.telefono, inicio }); seg.vincularCita(t.id, 'a' + n, inicio); sincronizar(); pintar(); });
      btn('Paciente responde "me duele"', () => { seg.responder(t.id, 'me duele un poco', ahora); pintar(); });
    }
    el.append(d);
  }
  const bt = $('bandeja-trat'); bt.textContent = '';
  const msgs = seg.bandeja();
  if (!msgs.length) bt.innerHTML = '<p class="vacio">Todavía no hay mensajes de seguimiento.</p>';
  for (const m2 of msgs) { const t = seg.tratamientos().find((x) => x.id === m2.tratamientoId) || {}; const d = document.createElement('div'); d.className = 'msg ' + m2.direccion; d.innerHTML = '<small></small><span></span>'; d.querySelector('small').textContent = `${m2.direccion === 'entrante' ? 'Respuesta de' : 'Enviado a'} ${t.paciente || m2.para} · ${fmt.format(m2.hora)}`; d.querySelector('span').textContent = m2.texto; bt.append(d); }
}

function pintarMetricas() {
  const m = seg.metricas();
  const el = $('metricas'); el.innerHTML = '';
  const cards = [
    { v: m.pctFinalizacion === null ? '—' : m.pctFinalizacion + '%', n: 'Finalización de tratamientos', d: `${m.completados} de ${m.total} completados. Meta: reducir el abandono a la mitad.` },
    { v: m.pctAgendaOportuna === null ? '—' : m.pctAgendaOportuna + '%', n: 'Agendamiento oportuno', d: `${m.agendaOportuna} a tiempo y ${m.agendaTardia} tarde. Meta: 80% agendan en 7 días o menos.` },
    { v: m.pctRescate === null ? '—' : m.pctRescate + '%', n: 'Rescate de tratamientos en riesgo', d: 'Vuelven a Activo tras el contacto. Meta: 50%.' },
    { v: String(m.seguimientosEnviados), n: 'Seguimientos enviados solos', d: 'Mensajes que la asistente no tuvo que escribir a mano.' },
  ];
  for (const c of cards) { const d = document.createElement('div'); d.className = 'metrica'; d.innerHTML = '<div class="valor"></div><div class="nombre"></div><div class="meta-m"></div>'; d.querySelector('.valor').textContent = c.v; d.querySelector('.nombre').textContent = c.n; d.querySelector('.meta-m').textContent = c.d; el.append(d); }
}

function pintar() {
  $('reloj').textContent = fmt.format(ahora);
  pintarHoy(); pintarCitas(); pintarAvisos(); pintarBandeja(); pintarTratamientos(); pintarMetricas();
}

function mostrar(s) {
  seccion = s;
  for (const [id, btn] of [['citas', 'p-citas'], ['trat', 'p-trat'], ['met', 'p-met']]) {
    $('panel-' + id).hidden = s !== id;
    $(btn).setAttribute('aria-pressed', s === id);
  }
}
$('p-citas').onclick = () => mostrar('citas');
$('p-trat').onclick = () => mostrar('trat');
$('p-met').onclick = () => mostrar('met');

document.querySelectorAll('[data-avance]').forEach((b) => b.onclick = () => {
  const fin = ahora + Number(b.dataset.avance) * MIN;
  for (let t = ahora + 5 * MIN; t <= fin; t += 5 * MIN) { ahora = t; tick(ahora); }
  ahora = fin; tick(ahora); pintar();
});
$('t-prog').onclick = () => { pestana = 'programados'; pintar(); };
$('t-env').onclick = () => { pestana = 'enviados'; pintar(); };
$('nueva').onsubmit = (e) => {
  e.preventDefault(); const f = new FormData(e.target);
  calendario.push({ id: 'a' + (++n), paciente: f.get('paciente'), telefono: f.get('telefono'), inicio: ahora + Number(f.get('en')) * MIN });
  sincronizar(); pintar();
};
$('nuevo-trat').onsubmit = (e) => {
  e.preventDefault(); const f = new FormData(e.target);
  seg.alta({ id: 't' + (++nt), paciente: f.get('paciente'), telefono: f.get('telefono'), tipo: f.get('tipo'), totalSesiones: Number(f.get('total')) }, ahora);
  pintar();
};
function avanzarA(min) { const fin = base + min * MIN; for (let t = ahora + 5 * MIN; t <= fin; t += 5 * MIN) { ahora = t; tick(ahora); } ahora = fin; tick(ahora); }
const base = ahora;
sincronizar();
if (location.hash.includes('demo')) { // recorrido de ejemplo: una cancelada, una confirmada, una en riesgo y un tratamiento en riesgo
  avanzarA(240); motor.responder('+57 3XX XXX 0103', '2', ahora);
  avanzarA(1440); motor.responder('+57 3XX XXX 0101', '1', ahora);
  avanzarA(1710); pestana = 'enviados';
  avanzarA(1710 + 9 * 1440); // 9 días más: Carlos llega a riesgo de abandono y María termina su endodoncia
  seg.sesion('t1', ahora - 2 * DIA); seg.sesion('t1', ahora - DIA); tick(ahora);
}
if (location.hash.includes('tratamientos')) mostrar('trat');
if (location.hash.includes('metricas')) mostrar('met');
pintar();
window.__motor = motor; window.__seg = seg;

import React, { useMemo, useState } from 'react';
import './style.css';
import hero from './photos/dental.jpg';
import { ABANDONO_DIAS, D, H, SEGUIMIENTO_DIAS, State, advance, createAppt, dayKey, fmt, fmtShort, fmtTime, registerSession, reply, seed, selfTests } from './logic';

type Props = { s: State; set: (f: (s: State) => State) => void; onCreated?: (name: string, start: number, email: string) => void; banner?: React.ReactNode };

const STATUS: Record<string, string> = { pendiente: 'Sin confirmar', confirmada: 'Confirmada', cancelada: 'Cancelada' };

/* Componentes básicos que reemplazan el sistema de diseño del hospedaje anterior. */
function Btn({ variant = 'primary', compact, className = '', ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost'; compact?: boolean }) {
    return <button className={`btn btn-${variant}${compact ? ' compact' : ''} ${className}`} {...rest} />;
}

function Callout({ title, tone, children }: { title: string; tone: 'note' | 'warning' | 'success'; children: React.ReactNode }) {
    return <aside className={'callout c-' + tone}><strong>{title}</strong><p>{children}</p></aside>;
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
    return <section className="group"><h2>{label}</h2>{children}</section>;
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
    return <label className="field"><span>{label}</span><input value={value} onChange={(e) => onChange(e.target.value)} /></label>;
}

function Facts({ items }: { items: { label: string; value: string }[] }) {
    return <dl className="facts">{items.map((i) => <div key={i.label}><dt>{i.label}</dt><dd>{i.value}</dd></div>)}</dl>;
}

function Clock({ s, set }: Props) {
    return <section className="sim" aria-label="Reloj simulado">
        <div className="sim-now"><span className="sim-tag">Reloj simulado</span><strong>{fmt(s.now)}</strong></div>
        <div className="sim-btns">
            <Btn compact variant="secondary" onClick={() => set((x) => advance(x, 30 * 60_000))}>+30 min</Btn>
            <Btn compact variant="secondary" onClick={() => set((x) => advance(x, 2 * H))}>+2 h</Btn>
            <Btn compact variant="secondary" onClick={() => set((x) => advance(x, D))}>+1 día</Btn>
            <Btn compact variant="secondary" onClick={() => set((x) => advance(x, 7 * D))}>+7 días</Btn>
            <Btn compact variant="ghost" onClick={() => set(() => seed())}>Reiniciar datos</Btn>
        </div>
    </section>;
}

function CreatedBanner({ appt, onDismiss }: { appt: { name: string; start: number; email: string }; onDismiss: () => void }) {
    return <section className="owner-test" aria-label="Cita recién creada">
        <div role="status"><Callout title="Cita confirmada" tone="success">
            {`La cita de ${appt.name} quedó confirmada para el ${fmtShort(appt.start)} Búscala en "Próximos días" (sección Hoy) con sus recordatorios simulados de 48 h y 2 h.` + (appt.email ? ` Como diste un correo, en "Mensajes" verás el email de confirmación simulado dirigido a ${appt.email}.` : '')}
        </Callout></div>
        <div><Btn compact variant="ghost" onClick={onDismiss}>Descartar aviso</Btn></div>
    </section>;
}

function Today({ s, set, onCreated, banner }: Props) {
    const today = dayKey(s.now);
    const todays = s.appts.filter((a) => dayKey(a.start) === today);
    const later = s.appts.filter((a) => dayKey(a.start) > today);
    const open = s.alerts.filter((a) => !a.done);
    const [patient, setPatient] = useState('');
    const [email, setEmail] = useState('');
    const [day, setDay] = useState('3');
    const [hour, setHour] = useState('9');
    const create = () => {
        const name = patient.trim();
        if (!name) return;
        const mail = email.trim();
        const bogotaMidnight = Date.parse(today + 'T00:00:00-05:00');
        const start = bogotaMidnight + Number(day) * D + Number(hour) * H;
        set((x) => createAppt(x, name, start, mail || undefined));
        setPatient('');
        setEmail('');
        onCreated?.(name, start, mail);
    };
    const row = (a: State['appts'][number]) => <li key={a.id} className={'appt is-' + a.status}>
        <div className="appt-main"><strong>{fmtTime(a.start)}</strong> <span>{a.patient}</span></div>
        <div className="appt-side"><span className={'pill p-' + a.status}>{STATUS[a.status]}</span></div>
        {a.reminders.length > 0 && a.status !== 'cancelada' && <div className="appt-rem">Recordatorios: {a.reminders.map((r) => `${r.kind} ${r.sent ? '(enviado)' : '(programado ' + fmtShort(r.at) + ')'}`).join(' · ')}</div>}
    </li>;
    return <>
        <Group label="Alertas para la asistente">
            {open.length === 0 ? <p>No hay alertas abiertas.</p> :
                <ul className="alerts">{open.map((a) => <li key={a.id} className={'alert k-' + a.kind}>
                    <div><span className="alert-kind">{{ cancelacion: 'Cancelación', 'sin-confirmar': 'Sin confirmar', abandono: 'Seguimiento', info: 'Aviso' }[a.kind]}</span> {a.text}</div>
                    <Btn compact variant="ghost" onClick={() => set((x) => ({ ...x, alerts: x.alerts.map((y) => y.id === a.id ? { ...y, done: true } : y) }))}>Atendida</Btn>
                </li>)}</ul>}
        </Group>
        <Group label="Citas de hoy">
            {todays.length === 0 ? <p>Sin citas hoy.</p> : <ul className="appts">{todays.map(row)}</ul>}
        </Group>
        <Group label="Próximos días">
            {later.length === 0 ? <p>Sin citas próximas.</p> : <ul className="appts">{later.map((a) => <React.Fragment key={a.id}><li className="day-label">{fmtShort(a.start).split(',')[0]}</li>{row(a)}</React.Fragment>)}</ul>}
        </Group>
        <Group label="Simular una cita nueva de Google Calendar">
            <p>En un consultorio real, la cita nace en Google Calendar. Aquí la creas a mano para ver que se programan sus recordatorios.</p>
            <div className="form">
                <TextField label="Paciente (ficticio)" value={patient} onChange={setPatient} />
                <TextField label="Correo del paciente (opcional, ficticio)" value={email} onChange={setEmail} />
                <label className="sel">Día<select value={day} onChange={(e) => setDay(e.target.value)}>
                    {[0, 1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n === 0 ? 'Hoy' : n === 1 ? 'Mañana' : `En ${n} días`}</option>)}</select></label>
                <label className="sel">Hora<select value={hour} onChange={(e) => setHour(e.target.value)}>
                    {[8, 9, 10, 11, 14, 15, 16, 17].map((n) => <option key={n} value={n}>{n > 12 ? n - 12 : n}:00 {n >= 12 ? 'p. m.' : 'a. m.'}</option>)}</select></label>
            </div>
            <Btn onClick={create} disabled={!patient.trim()}>Crear cita de prueba</Btn>
            {banner}
        </Group>
    </>;
}

function Outbox({ s, set }: Props) {
    const msgs = [...s.msgs].sort((a, b) => b.at - a.at);
    return <Group label="Bandeja de salida simulada">
        <Callout title="Bandeja simulada: esto no sale de verdad" tone="warning">Estos mensajes de WhatsApp y correos son solo muestra de lo que el sistema enviaría. El envío real de correos está pendiente: falta configurar EmailJS, así que por ahora ningún correo sale de esta página.</Callout>
        {msgs.length === 0 ? <p>Aún no hay mensajes. Avanza el reloj para que lleguen las horas de recordatorio.</p> :
            <ul className="chat">{msgs.map((m) => <li key={m.id}>
                <div className="chat-meta">Para {m.to} · {fmtShort(m.at)} · {m.kind === 'seguimiento' ? 'seguimiento de tratamiento' : m.kind === 'email' ? 'correo de confirmación (simulado)' : `recordatorio ${m.kind}`}</div>
                <div className="bubble out">{m.text}</div>
                {m.reply && <div className="bubble in">{m.reply === 'confirmar' ? '1 (confirmo)' : '2 (cancelo)'}</div>}
                {m.canReply && !m.reply && <div className="chat-btns">
                    {s.appts.find((a) => a.id === m.apptId)?.status !== 'confirmada' &&
                        <Btn compact variant="secondary" onClick={() => set((x) => reply(x, m.id, 'confirmar'))}>Paciente responde 1</Btn>}
                    <Btn compact variant="secondary" onClick={() => set((x) => reply(x, m.id, 'cancelar'))}>Paciente responde 2</Btn>
                </div>}
            </li>)}</ul>}
    </Group>;
}

function Treatments({ s, set }: Props) {
    return <Group label="Tratamientos de varias sesiones">
        <Callout title="Solo citas y contacto" tone="note">Este registro guarda el nombre del tratamiento, cuántas sesiones van y cuándo fue la última. No guarda diagnósticos, radiografías, notas clínicas ni cobros.</Callout>
        <ul className="treat">{s.treatments.map((t) => {
            const na = s.appts.find((a) => a.patient === t.patient && a.status !== 'cancelada' && a.start > s.now);
            const days = Math.floor((s.now - t.lastAt) / D);
            const finished = t.done >= t.total;
            const state = finished ? 'Terminado' : na ? 'Con cita agendada' : days >= ABANDONO_DIAS ? 'Sin continuar: alerta' : days >= SEGUIMIENTO_DIAS ? 'Recordatorio enviado' : 'En espera';
            const cls = finished ? 'p-confirmada' : na ? 'p-confirmada' : days >= ABANDONO_DIAS ? 'p-cancelada' : 'p-pendiente';
            return <li key={t.id}>
                <div className="t-head"><strong>{t.patient}</strong><span className={'pill ' + cls}>{state}</span></div>
                <div>{t.name}: sesión {Math.min(t.done + 1, t.total)} de {t.total} {finished ? '(completo)' : 'pendiente'}</div>
                <progress max={t.total} value={t.done} aria-label={`${t.done} de ${t.total} sesiones hechas`} />
                <div className="t-meta">Última sesión hace {days} días · {na ? `próxima cita: ${fmtShort(na.start)}` : 'sin próxima cita'}</div>
                {!finished && <Btn compact variant="secondary" onClick={() => set((x) => registerSession(x, t.id))}>Registrar sesión hecha hoy</Btn>}
            </li>;
        })}</ul>
        <p>Reglas de ejemplo (propuestas, ajustables): recordar al paciente a los {SEGUIMIENTO_DIAS} días sin cita agendada y alertar al consultorio a los {ABANDONO_DIAS} días.</p>
    </Group>;
}

function Verify() {
    const checks = useMemo(() => selfTests(), []);
    return <>
        <Group label="Comprobaciones con datos de prueba">
            <p>Estas cuatro pruebas corren aquí mismo sobre datos ficticios, siguiendo la verificación pedida en el prompt.</p>
            <ul className="checks">{checks.map((c) => <li key={c.name} className={c.ok ? 'ok' : 'bad'}>
                <strong>{c.ok ? 'Pasa' : 'Falla'} · {c.name}</strong><div>{c.detail}</div></li>)}</ul>
            <Callout title="Qué no demuestra" tone="warning">Que el prototipo funcione no prueba que bajen las inasistencias. Eso solo se mide en un piloto real, comparando contra el 30% actual.</Callout>
        </Group>
        <Group label="Arquitectura y herramientas propuestas">
            <Facts items={[
                { label: 'Citas', value: 'Google Calendar API: lee los eventos del calendario del consultorio (solo lectura). No se reemplaza el calendario.' },
                { label: 'Mensajes', value: 'WhatsApp Business Platform (API oficial) con plantillas aprobadas. Los pacientes solo reciben y responden en WhatsApp.' },
                { label: 'Correo (opcional)', value: 'Confirmación de cita por email al crearla, si el paciente deja su correo: EmailJS (pendiente de configurar) con el remitente del consultorio.' },
                { label: 'Programador', value: 'Un proceso que revisa cada pocos minutos qué recordatorios tocan y los envía una sola vez.' },
                { label: 'Datos', value: 'Base pequeña (SQLite o Postgres): recordatorios, estados, planes de tratamiento y alertas. Sin datos clínicos.' },
                { label: 'Panel', value: 'Página web simple para la asistente, como esta demo.' },
                { label: 'Alertas', value: 'Panel y, opcional, un WhatsApp interno a la asistente.' },
            ]} />
            <Callout title="Decisiones propuestas, no exigidas por el caso" tone="note">Los horarios de 48 h y 2 h, WhatsApp como canal y las reglas de 7 y 14 días son propuestas. Un sistema real tendría costos de la API de WhatsApp y requiere consentimiento de los pacientes para escribirles.</Callout>
        </Group>
    </>;
}

type Tab = 'hoy' | 'bandeja' | 'tratamientos' | 'pruebas';

export function App() {
    const [s, setS] = useState<State>(() => seed());
    const set = (f: (s: State) => State) => setS(f);
    const [createdAppt, setCreatedAppt] = useState<{ name: string; start: number; email: string } | null>(null);
    const [tab, setTab] = useState<Tab>('hoy');
    const open = s.alerts.filter((a) => !a.done).length;
    const banner = createdAppt ? <CreatedBanner appt={createdAppt} onDismiss={() => setCreatedAppt(null)} /> : null;
    const tabs: { id: Tab; label: string }[] = [
        { id: 'hoy', label: `Hoy${open ? ` (${open})` : ''}` },
        { id: 'bandeja', label: 'Mensajes' },
        { id: 'tratamientos', label: 'Tratamientos' },
        { id: 'pruebas', label: 'Pruebas y diseño' },
    ];
    return <main className="card">
        <header className="hdr">
            <div className="hdr-top"><h1>Prototipo del consultorio dental</h1><span className="hdr-fact">Demo con datos ficticios</span></div>
            <p className="intro">Recordatorios por WhatsApp, avisos a la asistente y seguimiento de tratamientos de la Dra. Laura. Todo es simulado: ningún mensaje ni correo sale automáticamente de esta página y no se conecta ningún calendario.</p>
        </header>
        <figure className="hero"><img src={hero} alt="Calendario con un diente y un teléfono con un mensaje confirmado" /></figure>
        <Clock s={s} set={set} />
        <nav className="file-nav" aria-label="Secciones">
            {tabs.map((t) => <a key={t.id} href="#" aria-current={tab === t.id ? 'page' : undefined} onClick={(e) => { e.preventDefault(); setTab(t.id); }}>{t.label}</a>)}
        </nav>
        {tab === 'hoy' && <Today s={s} set={set} onCreated={(name, start, email) => setCreatedAppt({ name, start, email })} banner={banner} />}
        {tab === 'bandeja' && <Outbox s={s} set={set} />}
        {tab === 'tratamientos' && <Treatments s={s} set={set} />}
        {tab === 'pruebas' && <Verify />}
        <footer className="closing">Pacientes y citas inventados. Sin facturación ni expediente clínico. La bandeja, los recordatorios y los correos mostrados son simulados: esta página no envía nada por sí sola. El envío real de correos quedará para cuando se configure EmailJS.</footer>
    </main>;
}

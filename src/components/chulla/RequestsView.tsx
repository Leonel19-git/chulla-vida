import { useState } from 'react';
import { ArrowRight, CalendarDays, CheckCircle2, CircleHelp, CreditCard, Download, Wallet } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { Reservation } from '../../types';
import { Dialog } from './Dialog';
import { languageMetadata } from '../../i18n/ui';
const statusLabels: Record<string, string> = { pendiente: 'Por confirmar', confirmado: 'Confirmada', pagado: 'Pagada', validado_en_sitio: 'Visita validada', liquidado_al_local: 'Liquidada', completado: 'Completada', cancelado: 'Cancelada' };
const methods = { tarjeta: 'Tarjeta de prueba', transferencia: 'Transferencia de prueba', deuna: 'Deuna de prueba' };
export function RequestsView() {
    const { reservations, cancelReservation, completeDemoPayment, setActiveTab, t, language } = useApp();
    const locale = languageMetadata[language].tag;
    const money = (value: number) => new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value);
    const displayDate = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
    const [filter, setFilter] = useState('activas');
    const [cancel, setCancel] = useState<Reservation | null>(null);
    const [notice, setNotice] = useState('');
    const items = reservations.filter(r => r.turista_email === 'viajero@chullavida.local' && (filter === 'todas' || (filter === 'canceladas' ? r.estado === 'cancelado' : r.estado !== 'cancelado')));
    const download = (r: Reservation) => {
        const lines = [
            `CHULLA VIDA · ${t('RESUMEN DE DEMOSTRACIÓN')}`, r.codigo_voucher, r.lugar_titulo,
            `${displayDate(r.fecha_tour)} · ${r.cantidad_personas} ${t('personas')}`,
            `${t('Total orientativo')}: ${money(r.precio_total)}`,
            `${t('Solicitud al anfitrión')}: ${t(statusLabels[r.estado])}`,
            `${t('Método de prueba')}: ${t(methods[r.metodo_pago])}`,
            r.pago_demo ? `${t('Simulación')}: ${t(r.pago_demo.estado === 'aprobado' ? 'Aprobado' : 'Pendiente de revisión')} · ${r.pago_demo.referencia}` : t('Sin simulación de pago'),
            t('No acredita un pago ni una reserva real. No se ha cobrado dinero.'),
        ];
        const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' }));
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `${r.codigo_voucher}-demo.txt`;
        anchor.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
    return <section className="trips-payments-view">
    <div className="page-heading"><h1>{t("Tus viajes y pagos")}</h1><p>{t("La escapada, su solicitud y la simulación de pago, en un mismo lugar.")}</p></div>
    <div className="payment-demo-notice"><CircleHelp size={20}/><p><strong>{t("Estás en modo de demostración.")}</strong>{" " + t("Puedes probar los pagos y sus estados. No se cobra dinero ni se envían reservas externas.")}</p></div>
    <div className="segmented-tabs" role="group" aria-label={t("Estado de solicitudes")}>{[['activas', 'Activas'], ['canceladas', 'Canceladas'], ['todas', 'Todas']].map(([value, label]) => <button key={value} className={filter === value ? 'active' : ''} aria-pressed={filter === value} onClick={() => setFilter(value)}>{t(label)}</button>)}</div>
    {notice && <p className="payment-action-notice" role="status"><CheckCircle2 size={18}/>{t(notice)}</p>}
    {items.length ? <div className="requests-list">{items.map(r => <article key={r.id} className="request-row request-with-payment">
      <div className="request-date"><CalendarDays size={23}/><span>{displayDate(r.fecha_tour)}</span></div>
      <div className="request-description"><span className={`status-pill status-${r.estado}`}>{t(statusLabels[r.estado])}</span><h3>{r.lugar_titulo.split(':')[0]}</h3><p>{r.cantidad_personas} {t(r.cantidad_personas === 1 ? 'wambra' : 'wambras')} · {money(r.precio_total)}{" " + t("en total ·") + " "}{r.codigo_voucher}</p>
        <div className={`request-payment-note ${r.pago_demo?.estado === 'aprobado' ? 'demo-approved' : ''}`}>
          {r.pago_demo?.estado === 'aprobado' ? <CheckCircle2 size={17}/> : <Wallet size={17}/>}
          <div><strong>{t(r.pago_demo ? r.pago_demo.estado === 'aprobado' ? 'Simulación de pago aprobada' : 'Transferencia de prueba pendiente' : 'Sin simulación de pago')}</strong><span>{t(methods[r.metodo_pago])}{r.pago_demo ? ` · ${r.pago_demo.referencia}` : ''}</span>{r.estado === 'cancelado' && r.pago_demo && <span>{t("Solicitud cancelada. El historial de la simulación se conserva; no existe un cobro ni un reembolso real.")}</span>}</div>
        </div>
      </div>
      <div className="request-actions">
        {r.pago_demo?.estado === 'pendiente' && ['pendiente', 'confirmado'].includes(r.estado) && <button className="button button-primary" onClick={() => { setNotice(completeDemoPayment(r.id) ? 'Simulación completada. El estado del anfitrión se mantiene por separado.' : 'No se puede completar esta simulación. Revisa el estado de la solicitud.'); }}><CreditCard size={15}/>{t("Completar simulación")}</button>}
        <button className="button button-secondary" onClick={() => download(r)}><Download size={15}/>{t("Descargar resumen")}</button>
        {['pendiente', 'confirmado'].includes(r.estado) && <button className="text-button danger" onClick={() => setCancel(r)}>{t("Cancelar solicitud")}</button>}
      </div>
    </article>)}</div> : <div className="empty-state"><CalendarDays size={38}/><h2>{t(filter === 'canceladas' ? 'Sin solicitudes canceladas' : 'Tu próxima escapada empieza con una idea')}</h2><p>{t("Elige una experiencia para probar su reserva y recorrido de pago.")}</p><button className="button button-primary" onClick={() => setActiveTab('feed')}>{t("Encontrar una escapada")}<ArrowRight size={16}/></button></div>}
    <p className="small-note">{t("Los estados de pago son simulaciones locales. La disponibilidad de una visita siempre requiere la confirmación del anfitrión.")}</p>
    {cancel && <Dialog title={t("¿Cancelar esta solicitud?")} onClose={() => setCancel(null)}><div className="dialog-content"><p>{cancel.lugar_titulo.split(':')[0]} · {displayDate(cancel.fecha_tour)}</p><p className="muted">{t("La solicitud quedará cancelada y conservará su historial de prueba. No se realizará ningún cobro ni reembolso.")}</p><div className="dialog-actions"><button className="button button-secondary" onClick={() => setCancel(null)}>{t("Mantener mi plan")}</button><button className="button button-primary" onClick={() => { cancelReservation(cancel.id); setCancel(null); setNotice('Solicitud cancelada en esta demostración.'); }}>{t("Sí, cancelar solicitud")}</button></div></div></Dialog>}
  </section>;
}

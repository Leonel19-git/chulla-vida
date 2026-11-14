import { WalletPanel } from '../wallet/WalletPanel';

/** Panel «Mis solicitudes y reservas». Evento `cv3:bookings`; `experienceId` cuando se abre desde una ficha. Reutiliza la billetera de viaje. */
export function BookingsPanel({ experienceId, onClose, onOpenExperience }: { experienceId?: string; onClose: () => void; onOpenExperience: (id: string) => void }) {
  return <WalletPanel title="Mis solicitudes y reservas" experienceId={experienceId} onClose={onClose} onOpenExperience={onOpenExperience} />;
}

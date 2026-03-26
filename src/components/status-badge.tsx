type DisplayStatus = 'discovered' | 'confirmed' | 'submitted' | 'expiring' | 'expired' | 'ineligible';

const statusStyles: Record<DisplayStatus, string> = {
  discovered: 'bg-status-discovered/20 text-status-discovered border-status-discovered/30',
  confirmed: 'bg-status-confirmed/20 text-status-confirmed border-status-confirmed/30',
  submitted: 'bg-status-submitted/20 text-status-submitted border-status-submitted/30',
  expiring: 'bg-status-expiring/20 text-status-expiring border-status-expiring/30',
  expired: 'bg-status-expired/20 text-status-expired border-status-expired/30',
  ineligible: 'bg-status-ineligible/20 text-status-ineligible border-status-ineligible/30',
};

export function StatusBadge({ status }: { status: DisplayStatus }) {
  return (
    <span
      className={`inline-block px-2 py-0.5 text-[11px] font-medium border rounded-[2px] ${statusStyles[status] || statusStyles.ineligible}`}
    >
      {status}
    </span>
  );
}

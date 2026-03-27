type DisplayStatus = 'discovered' | 'confirmed' | 'submitted' | 'expiring' | 'expired' | 'ineligible';

const statusStyles: Record<DisplayStatus, string> = {
  discovered: 'text-status-discovered border-status-discovered/40',
  confirmed: 'text-status-confirmed border-status-confirmed/40',
  submitted: 'text-status-submitted border-status-submitted/40',
  expiring: 'text-status-expiring border-status-expiring/40',
  expired: 'text-status-expired border-status-expired/40',
  ineligible: 'text-status-ineligible border-status-ineligible/40',
};

export function StatusBadge({ status }: { status: DisplayStatus }) {
  return (
    <span
      className={`inline-block px-2 py-0.5 text-[11px] border ${statusStyles[status] || statusStyles.ineligible}`}
    >
      {status}
    </span>
  );
}

import type { MessageStatus } from './model'

export const statusConfig: Record<MessageStatus, { label: string; badge: string; dot: string }> = {
  pending: { label: 'Pending', badge: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-400' },
  open:    { label: 'Open',    badge: 'bg-blue-50 text-blue-700 border-blue-200',   dot: 'bg-blue-400' },
  closed:  { label: 'Closed', badge: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400' },
}

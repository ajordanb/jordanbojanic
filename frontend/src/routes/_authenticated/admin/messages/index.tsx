import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { type ColDef, type ICellRendererParams } from 'ag-grid-community'
import { Badge } from '@/components/ui/badge'
import CustomGrid from '@/components/grid/CustomGrid'
import { useApi } from '@/api/api'
import { statusConfig } from '@/api/messages/statusConfig'
import type { Message, MessageStatus } from '@/api/messages/model'

export const Route = createFileRoute('/_authenticated/admin/messages/')({
  component: MessagesPage,
})

const EMPTY_MESSAGES: Message[] = []

function StatusCell({ value }: ICellRendererParams) {
  const cfg = statusConfig[value as MessageStatus]
  if (!cfg) return null
  return (
    <Badge variant="outline" className={`text-xs ${cfg.badge}`}>
      {cfg.label}
    </Badge>
  )
}

function MessagePreviewCell({ value }: ICellRendererParams) {
  const text: string = value ?? ''
  return (
    <span className="text-slate-500">
      {text.length > 100 ? text.slice(0, 100) + '…' : text}
    </span>
  )
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

function MessagesPage() {
  const [statusFilter, setStatusFilter] = useState<MessageStatus | 'all'>('all')
  const api = useApi()
  const navigate = useNavigate()

  const { data: messages, isLoading, error } = api.messages.useMessagesQuery(
    statusFilter === 'all' ? undefined : statusFilter,
  )

  const columnDefs = useMemo<ColDef<Message>[]>(
    () => [
      {
        headerName: 'Name',
        field: 'name',
        flex: 1,
        minWidth: 130,
        filter: 'agTextColumnFilter',
      },
      {
        headerName: 'Email',
        field: 'email',
        flex: 1.5,
        minWidth: 160,
        filter: 'agTextColumnFilter',
        cellStyle: { color: '#6b7280' },
      },
      {
        headerName: 'Message',
        field: 'message',
        flex: 3,
        minWidth: 200,
        filter: false,
        sortable: false,
        cellRenderer: MessagePreviewCell,
      },
      {
        headerName: 'Status',
        field: 'status',
        width: 110,
        filter: 'agTextColumnFilter',
        cellRenderer: StatusCell,
      },
      {
        headerName: 'Received',
        field: 'created_at',
        width: 120,
        filter: false,
        valueFormatter: (p) => formatDate(p.value),
        cellStyle: { color: '#9ca3af' },
      },
    ],
    [],
  )

  if (error) {
    return (
      <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4">
        <p className="text-sm text-destructive">Failed to load messages. Please try again.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Messages</h1>
          <p className="text-sm text-muted-foreground">Contact form submissions</p>
        </div>

        <div className="flex items-center gap-2">
          {(['all', 'pending', 'open', 'closed'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {s === 'all' ? 'All' : statusConfig[s].label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading messages…</div>
        ) : (
          <CustomGrid<Message>
            rowData={messages ?? EMPTY_MESSAGES}
            columnDefs={columnDefs}
            height="520px"
            onRowClicked={(msg) =>
              navigate({ to: '/admin/messages/$messageId', params: { messageId: msg.id } })
            }
            defaultColDef={{ sortable: true }}
          />
        )}
      </div>
    </div>
  )
}

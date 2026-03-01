import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useApi } from '@/api/api'
import type { MessageStatus } from '@/api/messages/model'

export const Route = createFileRoute('/_authenticated/admin/messages/')({
  component: MessagesPage,
})

const statusColors: Record<MessageStatus, string> = {
  pending: 'bg-muted text-muted-foreground border-border',
  open: 'bg-primary/10 text-primary border-primary/20',
  closed: 'bg-secondary text-secondary-foreground border-border',
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
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
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as MessageStatus | 'all')}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="hidden md:table-cell">Preview</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden sm:table-cell">Received</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Skeleton className="h-4 w-48" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                </TableRow>
              ))
            ) : messages?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                  No messages found.
                </TableCell>
              </TableRow>
            ) : (
              messages?.map((msg) => (
                <TableRow
                  key={msg.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() =>
                    navigate({
                      to: '/admin/messages/$messageId',
                      params: { messageId: msg.id },
                    })
                  }
                >
                  <TableCell className="font-medium">{msg.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{msg.email}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground text-sm max-w-xs">
                    <span className="truncate block">
                      {msg.message.slice(0, 80)}
                      {msg.message.length > 80 ? '\u2026' : ''}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusColors[msg.status]}>
                      {msg.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                    {formatDate(msg.created_at)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

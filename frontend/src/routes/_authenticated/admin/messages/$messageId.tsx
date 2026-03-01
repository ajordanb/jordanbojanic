import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useRef, useEffect } from 'react'
import { ArrowLeft, Trash2, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useApi } from '@/api/api'
import type { MessageStatus } from '@/api/messages/model'

export const Route = createFileRoute('/_authenticated/admin/messages/$messageId')({
  component: MessageDetailPage,
})

const statusColors: Record<MessageStatus, string> = {
  pending: 'bg-muted text-muted-foreground border-border',
  open: 'bg-primary/10 text-primary border-primary/20',
  closed: 'bg-secondary text-secondary-foreground border-border',
}

function MessageDetailPage() {
  const { messageId } = Route.useParams()
  const navigate = useNavigate()
  const api = useApi()

  const [replyText, setReplyText] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<MessageStatus | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [replySuccess, setReplySuccess] = useState(false)
  const replySuccessTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (replySuccessTimer.current !== null) {
        clearTimeout(replySuccessTimer.current)
      }
    }
  }, [])

  const { data: msg, isLoading, error } = api.messages.useMessageQuery(messageId)
  const updateStatus = api.messages.useUpdateMessageStatus()
  const deleteMessage = api.messages.useDeleteMessage()
  const replyToMessage = api.messages.useReplyToMessage()

  const currentStatus = selectedStatus ?? (msg?.status as MessageStatus | undefined)

  const handleStatusSave = async () => {
    if (!currentStatus || currentStatus === msg?.status) return
    await updateStatus.mutateAsync({ id: messageId, status: currentStatus })
  }

  const handleDelete = async () => {
    if (!deleteConfirm) {
      setDeleteConfirm(true)
      return
    }
    try {
      await deleteMessage.mutateAsync(messageId)
      navigate({ to: '/admin/messages' })
    } catch {
      setDeleteConfirm(false)
    }
  }

  const handleReply = async () => {
    if (!replyText.trim()) return
    await replyToMessage.mutateAsync({ id: messageId, reply_text: replyText })
    setReplyText('')
    setReplySuccess(true)
    if (replySuccessTimer.current !== null) {
      clearTimeout(replySuccessTimer.current)
    }
    replySuccessTimer.current = setTimeout(() => setReplySuccess(false), 3000)
  }

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-2xl">
        <Skeleton className="h-8 w-48" />
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    )
  }

  if (error || !msg) {
    return (
      <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4">
        <p className="text-sm text-destructive">Message not found.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate({ to: '/admin/messages' })}
        >
          <ArrowLeft className="size-4 mr-1" />
          Back
        </Button>
      </div>

      {/* Message card */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{msg.name}</h2>
            <a
              href={`mailto:${msg.email}`}
              className="text-sm text-muted-foreground hover:text-foreground hover:underline"
            >
              {msg.email}
            </a>
            <p className="text-xs text-muted-foreground mt-1">
              {new Date(msg.created_at).toLocaleString()}
            </p>
          </div>
          <Badge variant="outline" className={statusColors[msg.status as MessageStatus]}>
            {msg.status}
          </Badge>
        </div>

        <div className="border-t border-border pt-4">
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
            {msg.message}
          </p>
        </div>
      </div>

      {/* Status update */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Update Status</h3>
        <div className="flex items-center gap-3">
          <Select
            value={currentStatus ?? msg.status}
            onValueChange={(v) => setSelectedStatus(v as MessageStatus)}
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={handleStatusSave}
            disabled={
              !selectedStatus || selectedStatus === msg.status || updateStatus.isPending
            }
            size="sm"
          >
            {updateStatus.isPending ? 'Saving\u2026' : 'Save'}
          </Button>
          {updateStatus.isSuccess && (
            <span className="text-sm text-muted-foreground">Saved</span>
          )}
        </div>
      </div>

      {/* Reply */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Reply to {msg.name}</h3>
        <Textarea
          placeholder={`Write your reply to ${msg.name}\u2026`}
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          rows={5}
          disabled={replyToMessage.isPending}
        />
        {replySuccess && (
          <p className="text-sm text-muted-foreground">Reply sent successfully.</p>
        )}
        {replyToMessage.isError && (
          <p className="text-sm text-destructive">Failed to send reply. Please try again.</p>
        )}
        <Button
          onClick={handleReply}
          disabled={!replyText.trim() || replyToMessage.isPending}
          className="gap-2"
        >
          <Send className="size-4" />
          {replyToMessage.isPending ? 'Sending\u2026' : 'Send Reply'}
        </Button>
      </div>

      {/* Delete */}
      <div className="rounded-xl border border-destructive/20 bg-card p-6 space-y-3">
        <h3 className="text-sm font-semibold text-destructive">Delete Message</h3>
        <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
        <Button
          variant="destructive"
          onClick={handleDelete}
          disabled={deleteMessage.isPending}
          className="gap-2"
        >
          <Trash2 className="size-4" />
          {deleteConfirm ? 'Confirm Delete' : 'Delete Message'}
        </Button>
        {deleteConfirm && (
          <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(false)}>
            Cancel
          </Button>
        )}
      </div>
    </div>
  )
}

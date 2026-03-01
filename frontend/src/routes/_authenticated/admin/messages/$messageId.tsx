import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useRef, useEffect, useMemo } from 'react'
import { ArrowLeft, Send, Trash2, User, Headphones, ChevronDown, Check } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useApi } from '@/api/api'
import { statusConfig } from '@/api/messages/statusConfig'
import type { MessageStatus, Reply } from '@/api/messages/model'

export const Route = createFileRoute('/_authenticated/admin/messages/$messageId')({
  component: MessageDetailPage,
})

function StatusDropdown({
  value,
  onChange,
  isPending,
}: {
  value: MessageStatus
  onChange: (s: MessageStatus) => void
  isPending: boolean
}) {
  const cfg = statusConfig[value]
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          disabled={isPending}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${cfg.badge} hover:opacity-80`}
        >
          <span className={`size-1.5 rounded-full ${cfg.dot}`} />
          {cfg.label}
          <ChevronDown className="size-3 ml-0.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        {(Object.keys(statusConfig) as MessageStatus[]).map((s) => (
          <DropdownMenuItem
            key={s}
            onClick={() => onChange(s)}
            className="flex items-center gap-2 text-xs"
          >
            <span className={`size-1.5 rounded-full ${statusConfig[s].dot}`} />
            {statusConfig[s].label}
            {s === value && <Check className="size-3 ml-auto text-muted-foreground" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function MessageDetailPage() {
  const { messageId } = Route.useParams()
  const navigate = useNavigate()
  const api = useApi()

  const [replyText, setReplyText] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<MessageStatus | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [replySuccess, setReplySuccess] = useState(false)
  const replySuccessTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const threadEndRef = useRef<HTMLDivElement>(null)

  const { data: msg, isLoading, error } = api.messages.useMessageQuery(messageId)
  const updateStatus = api.messages.useUpdateMessageStatus()
  const deleteMessage = api.messages.useDeleteMessage()
  const replyToMessage = api.messages.useReplyToMessage()

  const currentStatus = selectedStatus ?? (msg?.status as MessageStatus | undefined)

  useEffect(() => {
    return () => {
      if (replySuccessTimerRef.current) clearTimeout(replySuccessTimerRef.current)
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current)
    }
  }, [])

  const allEvents = useMemo(() => {
    if (!msg) return []
    return [
      { type: 'message' as const, data: msg, time: msg.created_at, key: msg.id },
      ...msg.replies.map((r: Reply) => ({ type: 'reply' as const, data: r, time: r.sent_at, key: r.sent_at })),
    ].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
  }, [msg])

  const handleStatusChange = async (s: MessageStatus) => {
    setSelectedStatus(s)
    await updateStatus.mutateAsync({ id: messageId, status: s })
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
    if (replySuccessTimerRef.current) clearTimeout(replySuccessTimerRef.current)
    replySuccessTimerRef.current = setTimeout(() => setReplySuccess(false), 3000)
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current)
    scrollTimerRef.current = setTimeout(
      () => threadEndRef.current?.scrollIntoView({ behavior: 'smooth' }),
      100,
    )
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleReply()
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col h-[calc(100vh-5rem)]">
        <div className="flex items-center gap-4 p-4 border-b border-border">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="flex-1 p-6 space-y-4">
          <Skeleton className="h-24 w-3/4" />
          <Skeleton className="h-20 w-2/3 ml-auto" />
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
    <div className="flex flex-col h-[calc(100vh-5rem)] rounded-xl border border-border bg-card overflow-hidden">
      {/* Ticket header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card shrink-0">
        <button
          onClick={() => navigate({ to: '/admin/messages' })}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          <span>Back</span>
        </button>

        <div className="h-4 w-px bg-border mx-1" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground truncate">{msg.name}</span>
            <span className="text-muted-foreground text-sm hidden sm:inline">·</span>
            <a
              href={`mailto:${msg.email}`}
              className="text-sm text-muted-foreground hover:text-foreground hover:underline truncate hidden sm:inline"
            >
              {msg.email}
            </a>
          </div>
          <p className="text-xs text-muted-foreground">
            Received {new Date(msg.created_at).toLocaleString()}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {currentStatus && (
            <StatusDropdown
              value={currentStatus}
              onChange={handleStatusChange}
              isPending={updateStatus.isPending}
            />
          )}

          <button
            onClick={handleDelete}
            disabled={deleteMessage.isPending}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
              deleteConfirm
                ? 'bg-red-600 text-white border-red-600 hover:bg-red-700'
                : 'border-border text-muted-foreground hover:text-destructive hover:border-destructive'
            }`}
          >
            <Trash2 className="size-3.5" />
            {deleteConfirm ? 'Confirm' : 'Delete'}
          </button>
          {deleteConfirm && (
            <button
              onClick={() => setDeleteConfirm(false)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Conversation thread */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 bg-muted/30">
        {allEvents.map((event) =>
          event.type === 'message' ? (
            <div key={event.key} className="flex gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-600 mt-0.5">
                <User className="size-4" />
              </div>
              <div className="max-w-[75%]">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-xs font-medium text-foreground">{msg.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(event.time).toLocaleString()}
                  </span>
                </div>
                <div className="rounded-2xl rounded-tl-sm bg-card border border-border px-4 py-3 shadow-sm">
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                    {msg.message}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div key={event.key} className="flex gap-3 justify-end">
              <div className="max-w-[75%]">
                <div className="flex items-baseline gap-2 mb-1 justify-end">
                  <span className="text-xs text-muted-foreground">
                    {new Date(event.time).toLocaleString()}
                  </span>
                  <span className="text-xs font-medium text-foreground">You</span>
                </div>
                <div className="rounded-2xl rounded-tr-sm bg-foreground text-background px-4 py-3 shadow-sm">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {(event.data as Reply).text}
                  </p>
                </div>
              </div>
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground text-background mt-0.5">
                <Headphones className="size-4" />
              </div>
            </div>
          ),
        )}
        <div ref={threadEndRef} />
      </div>

      {/* Reply composer */}
      <div className="border-t border-border bg-card px-4 py-3 shrink-0">
        {replySuccess && (
          <p className="text-xs text-green-600 mb-2">Reply sent successfully.</p>
        )}
        {replyToMessage.isError && (
          <p className="text-xs text-destructive mb-2">Failed to send reply. Try again.</p>
        )}
        <div className="flex gap-3 items-end">
          <Textarea
            placeholder={`Reply to ${msg.name}… (Ctrl+Enter to send)`}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={3}
            disabled={replyToMessage.isPending}
            className="flex-1 resize-none text-sm bg-muted/50 border-border focus-visible:ring-1 focus-visible:ring-ring"
          />
          <button
            onClick={handleReply}
            disabled={!replyText.trim() || replyToMessage.isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-foreground text-background text-sm font-medium transition-opacity disabled:opacity-40 hover:opacity-80 shrink-0"
          >
            <Send className="size-4" />
            {replyToMessage.isPending ? 'Sending…' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  )
}

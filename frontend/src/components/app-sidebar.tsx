import * as React from 'react'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import {
  ChevronsUpDown,
  LogOut,
  MessageSquare,
  Search,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/hooks/useAuth'
import { messagesApi } from '@/api/messages/messagesApi'
import type { Message, MessageStatus } from '@/api/messages/model'
import { statusConfig } from '@/api/messages/statusConfig'

const STATUS_OPTIONS: Array<MessageStatus | 'all'> = [
  'all',
  'pending',
  'open',
  'closed',
]

function useActiveMessageId(): string | undefined {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const match = pathname.match(/\/admin\/messages\/([^/]+)/)
  return match?.[1]
}

function NavUser() {
  const { currentUser, logout } = useAuth()
  const { isMobile } = useSidebar()
  const navigate = useNavigate()

  const initials = currentUser?.slice(0, 2).toUpperCase() ?? 'JB'

  const handleLogout = () => {
    logout()
    navigate({ to: '/admin/login' })
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground md:h-8 md:p-0"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground text-xs font-semibold shrink-0">
                {initials}
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">Admin</span>
                <span className="truncate text-xs opacity-70">{currentUser}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-44 rounded-xl border-0 shadow-lg"
            side={isMobile ? 'bottom' : 'right'}
            align="end"
            sideOffset={8}
          >
            <DropdownMenuItem
              onClick={handleLogout}
              className="rounded-lg text-destructive focus:text-destructive focus:bg-destructive/10"
            >
              <LogOut className="size-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

function formatRelative(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin}m`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay === 1) return 'Yesterday'
  if (diffDay < 7) return `${diffDay}d`
  return date.toLocaleDateString()
}

function ThreadRow({
  message,
  active,
}: {
  message: Message
  active: boolean
}) {
  const lastEvent = message.replies[message.replies.length - 1]
  const preview = lastEvent?.text ?? message.message
  const lastAt = lastEvent?.sent_at ?? message.created_at

  return (
    <Link
      to="/admin/messages/$messageId"
      params={{ messageId: message.id }}
      className={`flex flex-col items-start gap-1 px-4 py-3 text-sm leading-tight transition-colors ${
        active
          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
          : 'hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'
      }`}
    >
      <div className="flex w-full items-center gap-2">
        {message.unread_by_agent && (
          <span
            aria-hidden
            className="size-2 shrink-0 rounded-full bg-sidebar-primary"
          />
        )}
        <span className={`truncate ${message.unread_by_agent ? 'font-semibold' : 'font-medium'}`}>
          {message.name}
        </span>
        <span className="ml-auto text-xs opacity-70 shrink-0">
          {formatRelative(lastAt)}
        </span>
      </div>
      <span className="line-clamp-2 text-xs opacity-80 whitespace-break-spaces">
        {preview}
      </span>
    </Link>
  )
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const api = messagesApi()
  const [statusFilter, setStatusFilter] = useState<MessageStatus | 'all'>('all')
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [search, setSearch] = useState('')

  const { data: messages = [] } = api.useMessagesQuery(
    statusFilter === 'all' ? undefined : statusFilter,
  )
  const { data: unreadData } = api.useUnreadCountQuery()
  const activeId = useActiveMessageId()

  const filtered = useMemo(() => {
    let list = messages
    if (unreadOnly) list = list.filter((m) => m.unread_by_agent)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q) ||
          m.message.toLowerCase().includes(q),
      )
    }
    return list
  }, [messages, unreadOnly, search])

  const unreadCount = unreadData?.count ?? 0

  return (
    <Sidebar
      variant="inset"
      collapsible="icon"
      className="overflow-hidden *:data-[sidebar=sidebar]:flex-row"
      {...props}
    >
      {/* Icon rail */}
      <Sidebar
        collapsible="none"
        className="w-[calc(var(--sidebar-width-icon)+1px)]!"
      >
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild size="lg" className="md:h-8 md:p-0">
                <Link to="/">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground text-xs font-bold shrink-0">
                    JB
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent className="px-1.5 md:px-0">
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive
                    tooltip={{ children: 'Messages', hidden: false }}
                    className="px-2.5 md:px-2 relative"
                  >
                    <Link to="/admin/messages">
                      <MessageSquare />
                      {unreadCount > 0 && (
                        <span
                          aria-label={`${unreadCount} unread`}
                          className="absolute top-1 right-1 size-1.5 rounded-full bg-destructive"
                        />
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <NavUser />
        </SidebarFooter>
      </Sidebar>

      {/* List panel */}
      <Sidebar collapsible="none" className="flex-1">
        <SidebarHeader className="gap-3 p-4">
          <div className="flex items-center justify-between">
            <div className="text-sidebar-foreground text-base font-semibold">
              Messages
            </div>
            {unreadCount > 0 && (
              <span className="text-xs text-sidebar-foreground/70">
                {unreadCount} unread
              </span>
            )}
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-sidebar-foreground/60" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations..."
              className="h-9 pl-9 rounded-lg border-0 bg-sidebar-accent text-sidebar-foreground placeholder:text-sidebar-foreground/50 shadow-none focus-visible:ring-2 focus-visible:ring-sidebar-ring/40"
            />
          </div>

          <div className="flex items-center gap-1 text-xs">
            {STATUS_OPTIONS.map((s) => {
              const isActive = statusFilter === s
              const label = s === 'all' ? 'All' : statusConfig[s].label
              return (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-2.5 py-1 rounded-full font-medium transition-colors ${
                    isActive
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                      : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/60'
                  }`}
                >
                  {label}
                </button>
              )
            })}
            <button
              onClick={() => setUnreadOnly((v) => !v)}
              className={`ml-auto px-2.5 py-1 rounded-full font-medium transition-colors ${
                unreadOnly
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                  : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/60'
              }`}
            >
              Unread
            </button>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup className="px-0 py-0">
            <SidebarGroupContent>
              {filtered.length === 0 ? (
                <div className="px-4 py-8 text-center text-xs text-sidebar-foreground/60">
                  {messages.length === 0 ? 'No conversations yet' : 'No matches'}
                </div>
              ) : (
                filtered.map((m) => (
                  <ThreadRow key={m.id} message={m} active={m.id === activeId} />
                ))
              )}
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
    </Sidebar>
  )
}

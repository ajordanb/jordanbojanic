import * as React from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { ChevronsUpDown, LogOut, MessageSquare } from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
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
import { useAuth } from '@/hooks/useAuth'
import { messagesApi } from '@/api/messages/messagesApi'

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
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
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

function NavBadge({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <span className="ml-auto flex min-w-5 items-center justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground text-[10px] font-semibold px-1.5 py-0.5">
      {count > 99 ? '99+' : count}
    </span>
  )
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const api = messagesApi()
  const { data: unreadData } = api.useUnreadCountQuery()
  const unreadCount = unreadData?.count ?? 0

  return (
    <Sidebar variant="inset" collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg">
              <Link to="/">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground text-xs font-bold shrink-0">
                  JB
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Jordan Bojanic</span>
                  <span className="truncate text-xs opacity-70">Admin</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Messages">
                <Link to="/admin/messages">
                  <MessageSquare className="size-4" />
                  <span>Messages</span>
                  <NavBadge count={unreadCount} />
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            {/*
              Future workspace items:
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Notes">
                  <Link to="/admin/notes"><StickyNote className="size-4" /><span>Notes</span></Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Passwords">
                  <Link to="/admin/passwords"><KeyRound className="size-4" /><span>Passwords</span></Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            */}
          </SidebarMenu>
        </SidebarGroup>

        {/*
          Future admin-only group (gate on admin role):
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Users">
                  <Link to="/admin/users"><Users className="size-4" /><span>Users</span></Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Roles">
                  <Link to="/admin/roles"><Shield className="size-4" /><span>Roles</span></Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        */}
      </SidebarContent>

      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import type { Message, MessageStatus, MessageReply } from './model'

const BASE = 'messages'

export function messagesApi() {
  const { authGet, authPatch, authPost, authDelete } = useAuth()
  const queryClient = useQueryClient()

  const useMessagesQuery = (status?: MessageStatus) =>
    useQuery({
      queryKey: ['messages', status ?? 'all'],
      queryFn: async () => {
        const result = await authGet<Message[]>(BASE, {
          params: status ? { status } : undefined,
        })
        return result as Message[]
      },
    })

  const useMessageQuery = (id: string) =>
    useQuery({
      queryKey: ['messages', id],
      queryFn: async () => {
        const result = await authGet<Message>(`${BASE}/${id}`)
        return result as Message
      },
      enabled: !!id,
    })

  const useUpdateMessageStatus = () =>
    useMutation({
      mutationFn: async ({ id, status }: { id: string; status: MessageStatus }) => {
        const result = await authPatch<Message>(`${BASE}/${id}`, { status })
        return result as Message
      },
      onSuccess: (_, { id }) => {
        queryClient.invalidateQueries({ queryKey: ['messages'] })
        queryClient.invalidateQueries({ queryKey: ['messages', id] })
      },
    })

  const useDeleteMessage = () =>
    useMutation({
      mutationFn: async (id: string) => {
        return authDelete(`${BASE}/${id}`)
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['messages'] })
      },
    })

  const useReplyToMessage = () =>
    useMutation({
      mutationFn: async ({ id, reply_text }: { id: string; reply_text: string }) => {
        const body: MessageReply = { reply_text }
        return authPost(`${BASE}/${id}/reply`, body)
      },
      onSuccess: (_, { id }) => {
        queryClient.invalidateQueries({ queryKey: ['messages', id] })
      },
    })

  return {
    useMessagesQuery,
    useMessageQuery,
    useUpdateMessageStatus,
    useDeleteMessage,
    useReplyToMessage,
  }
}

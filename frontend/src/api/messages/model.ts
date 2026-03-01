export type MessageStatus = 'pending' | 'open' | 'closed'

export interface Message {
  id: string
  name: string
  email: string
  message: string
  status: MessageStatus
  created_at: string
}

export interface MessageUpdate {
  status: MessageStatus
}

export interface MessageReply {
  reply_text: string
}

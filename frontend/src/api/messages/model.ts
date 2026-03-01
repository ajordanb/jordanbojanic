export type MessageStatus = 'pending' | 'open' | 'closed'

export interface Reply {
  text: string
  sent_at: string
}

export interface Message {
  id: string
  name: string
  email: string
  message: string
  status: MessageStatus
  created_at: string
  replies: Reply[]
}

export interface MessageUpdate {
  status: MessageStatus
}

export interface MessageReply {
  reply_text: string
}

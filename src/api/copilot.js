import { api } from './index'

export const listConversations = () => api('/copilot/conversations')

export const createConversation = (title = 'New Analysis') =>
  api('/copilot/conversations', { method: 'POST', body: { title } })

export const getMessages = (conversationId) =>
  api(`/copilot/conversations/${conversationId}/messages`)

export const sendMessage = (conversationId, content, headers = {}) =>
  api(`/copilot/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: { content },
    headers,
  })

export const deleteConversation = (conversationId) =>
  api(`/copilot/conversations/${conversationId}`, { method: 'DELETE' })
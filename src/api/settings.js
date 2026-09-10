import { api } from './index'

export const getWorkspace = () => api('/settings/workspace')

export const updateWorkspace = (payload) =>
  api('/settings/workspace', { method: 'PUT', body: payload })

export const listTeam = () => api('/settings/team')

export const inviteMember = (email, role) =>
  api('/settings/team/invite', { method: 'POST', body: { email, role } })

export const removeMember = (memberId) =>
  api(`/settings/team/${memberId}`, { method: 'DELETE' })

export const listApiKeys = () => api('/settings/api-keys')

export const createApiKey = (name, scopes = []) =>
  api('/settings/api-keys', { method: 'POST', body: { name, scopes } })

export const deleteApiKey = (keyId) =>
  api(`/settings/api-keys/${keyId}`, { method: 'DELETE' })

export const listWebhooks = () => api('/settings/webhooks')

export const createWebhook = (name, url, event) =>
  api('/settings/webhooks', { method: 'POST', body: { name, url, event } })

export const deleteWebhook = (webhookId) =>
  api(`/settings/webhooks/${webhookId}`, { method: 'DELETE' })
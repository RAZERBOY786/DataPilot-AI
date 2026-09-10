import { api } from './index'

export const listDatasets = () => api('/datasets')

export const getDataset = (id) => api(`/datasets/${id}`)

export const getRows = (id, limit = 15) => api(`/datasets/${id}/rows?limit=${limit}`)

export const uploadDataset = (formData) =>
  api('/datasets/upload', { method: 'POST', body: formData })

export const deleteDataset = (id) =>
  api(`/datasets/${id}`, { method: 'DELETE' })
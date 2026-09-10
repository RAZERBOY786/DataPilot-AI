import { api } from './index'

export const getProfiles = (datasetId) => api(`/profiles/dataset/${datasetId}`)
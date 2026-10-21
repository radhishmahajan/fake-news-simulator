import axios from 'axios'
import type { SimulationResponse, SimulationSettings } from '../types'

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const api = axios.create({ baseURL: API_URL, timeout: 120000 })

export async function healthCheck() {
  const { data } = await api.get('/api/health')
  return data
}
export async function runSimulation(settings: SimulationSettings): Promise<SimulationResponse> {
  const { data } = await api.post('/api/simulate', settings)
  return data
}
export async function inspectDataset(file: File) {
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.post('/api/dataset/inspect', form, {
    headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000,
  })
  return data
}

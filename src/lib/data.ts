import { useEffect, useState } from 'react'
import type { DashboardData } from './types'

export type DashboardDataState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: DashboardData }

const DATA_URL = `${import.meta.env.BASE_URL}generated/dashboard-data.json`

export function useDashboardData(): DashboardDataState {
  const [state, setState] = useState<DashboardDataState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    fetch(DATA_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json() as Promise<DashboardData>
      })
      .then((data) => {
        if (!cancelled) setState({ status: 'ready', data })
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setState({
            status: 'error',
            message: err instanceof Error ? err.message : String(err),
          })
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  return state
}

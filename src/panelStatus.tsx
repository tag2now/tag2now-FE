import type { ReactElement } from 'react'

export function panelStatus(loading: boolean, error: string | null, loadingMsg?: string): ReactElement | null {
  if (loading) return <div className="panel"><p className="state-msg px-4" role="status">{loadingMsg}</p></div>
  if (error)   return <div className="panel"><p className="state-msg error px-4" role="alert">Error: {error}</p></div>
  return null
}

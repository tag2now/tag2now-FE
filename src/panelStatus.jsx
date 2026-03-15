export function panelStatus(loading, error, loadingMsg) {
  if (loading) return <div className="panel"><p className="state-msg">{loadingMsg}</p></div>
  if (error)   return <div className="panel"><p className="state-msg error">Error: {error}</p></div>
  return null
}

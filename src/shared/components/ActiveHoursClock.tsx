function hourColor(h: number) {
  // yellow (#facc15) at h=0 → red (#f87171) at h=23
  const t = h / 23
  const r = Math.round(250 + (248 - 250) * t)
  const g = Math.round(204 + (113 - 204) * t)
  const b = Math.round(21 + (113 - 21) * t)
  return `rgb(${r},${g},${b})`
}

function sectorPath(h: number, cx: number, cy: number, rInner: number, rOuter: number) {
  const total = 24
  const gap = 0.03
  const startRad = (h * (Math.PI * 2 / total)) - Math.PI / 2 + gap
  const endRad = ((h + 1) * (Math.PI * 2 / total)) - Math.PI / 2 - gap
  const x1 = cx + rInner * Math.cos(startRad), y1 = cy + rInner * Math.sin(startRad)
  const x2 = cx + rOuter * Math.cos(startRad), y2 = cy + rOuter * Math.sin(startRad)
  const x3 = cx + rOuter * Math.cos(endRad),   y3 = cy + rOuter * Math.sin(endRad)
  const x4 = cx + rInner * Math.cos(endRad),   y4 = cy + rInner * Math.sin(endRad)
  return `M${x1} ${y1} L${x2} ${y2} A${rOuter} ${rOuter} 0 0 1 ${x3} ${y3} L${x4} ${y4} A${rInner} ${rInner} 0 0 0 ${x1} ${y1}Z`
}

export default function ActiveHoursClock({ hours }: { hours: number[] }) {
  const active = new Set(hours)
  const cx = 64, cy = 64, rIn = 30, rOut = 60, labelR = 59
  return (
    <svg viewBox="0 0 128 128" className="h-full mx-auto block">
    {Array.from({ length: 24 }, (_, h) => (
        <path key={h}
          d={sectorPath(h, cx, cy, rIn, rOut)}
          fill={active.has(h) ? hourColor(h) : 'rgba(255,255,255,0.05)'}
          stroke="rgba(0,0,0,0.4)"
          strokeWidth="0.5"
        />
    ))}
    {[0, 6, 12, 18].map((h) => {
      const angle = (h * (Math.PI * 2 / 24)) - Math.PI / 2
      return (
        <text key={h} x={cx + labelR * Math.cos(angle)} y={cy + labelR * Math.sin(angle)}
              textAnchor="middle" dominantBaseline="middle"
              fontSize="11" fontWeight="800" fill="#9ba3cc">
          {h}
        </text>
      )
    })}
  </svg>
)
}

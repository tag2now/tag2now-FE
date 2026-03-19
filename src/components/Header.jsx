export default function Header({ totalUsers }) {
  return (
    <header className="app-header relative border-b-2 border-accent pt-7 pb-5 mb-1 flex justify-between items-baseline px-4">
      <div className="flex items-center gap-3">
        <h1 className="font-display text-[clamp(1.05rem,4vw,1.8rem)] font-black m-0 tracking-wide uppercase">
          Tag<span className="header-accent">2</span>Now
        </h1>
        <div className="inline-flex items-center gap-2 text-[0.95rem] font-bold">
          <div className="inline-flex items-center gap-1.5 tracking-[0.2em] uppercase text-red-500">
            <span className="w-1.75 h-1.75 rounded-full bg-red-500 animate-[blink_1.6s_ease-in-out_infinite]" />
            Live
          </div>
          {totalUsers > 0 && (
            <span className="tracking-wide text-red-500">
              {totalUsers} online
            </span>
          )}
        </div>
      </div>
      <div>
        <span className="font-semibold text-gray-400">버그/개선 제보 @doStudy</span>
      </div>
    </header>
  )
}

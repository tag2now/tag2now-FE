const kstMoment = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

/** Every moment of the event reads in KST: the notice names its hours that way. */
export const formatEventTime = (iso: string): string => kstMoment.format(new Date(iso))

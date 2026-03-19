interface LoadingBarProps {
  visible?: boolean
}

export default function LoadingBar({ visible }: LoadingBarProps) {
  return <div className={`loading-bar${visible ? '' : ' loading-bar-hidden'}`} />
}

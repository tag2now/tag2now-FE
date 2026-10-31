import type { ReactNode } from 'react'
import Header from '@/shared/components/Header'
import Footer from '@/shared/components/Footer'
import StartupDialogs from '@/app/StartupDialogs'
import { LoginDialog } from '@/auth/component'
import InstallSheet from '@/install/InstallSheet'

interface AppLayoutProps {
  sidebar: ReactNode
  chat: ReactNode
  children: ReactNode
}

export default function AppLayout({ sidebar, chat, children }: AppLayoutProps) {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#mainContent">본문으로 건너뛰기</a>
      <StartupDialogs />
      {/* One instance serves every feature through requestLogin. */}
      <LoginDialog />
      <Header />
      <div className="app-layout">
        <aside className="app-sidebar" aria-label="서비스 메뉴">
          {sidebar}
        </aside>
        <main id="mainContent" className="app-main">
          {children}
        </main>
        {/* Keep chat mounted outside the routed panels for the whole visit. */}
        {chat}
      </div>
      <Footer />
      <InstallSheet />
    </div>
  )
}

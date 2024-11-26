import Logo from '@/assets/logo.svg'

export function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center">
      <header className="flex items-center space-x-2">
        <img src={Logo} alt="logo" width="60" height="60" />
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold">Tab Switch</h1>
          <p>Switch between tabs automatically</p>
        </div>
      </header>
    </main>
  )
}

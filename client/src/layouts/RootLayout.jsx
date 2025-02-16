import { Outlet } from 'react-router-dom'

const RootLayout = () => {
  return (
    <div className="root-layout">
      <header>
        {/* Add your header/navigation here */}
      </header>
      <main>
        <Outlet />
      </main>
      <footer>
        {/* Add your footer here */}
      </footer>
    </div>
  )
}

export default RootLayout

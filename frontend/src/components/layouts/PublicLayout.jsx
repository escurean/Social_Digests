import { Outlet } from 'react-router-dom'
import Navbar from '../public/Navbar.jsx'
import Footer from '../public/Footer.jsx'
import BannerBar from '../public/BannerBar.jsx'

export default function PublicLayout() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />
      <BannerBar />
      <main style={{ flex: 1 }}>
        <div className="page-enter">
          <Outlet />
        </div>
      </main>
      <Footer />
    </div>
  )
}

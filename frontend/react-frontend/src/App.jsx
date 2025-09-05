import { Routes, Route, Link } from 'react-router-dom'
import HomePage from './pages/HomePage.jsx'
import PrayerPage from './pages/PrayerPage.jsx'

export default function App() {
  return (
    <>
      {/* Full-width top bar */}
      <div className="topbar">
        <div className="topbar-inner container">
          <Link to="/" className="navlink">Home</Link>
          <Link to="/pray" className="navlink">Pray</Link>
        </div>
      </div>

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/pray" element={<PrayerPage />} />
      </Routes>
    </>
  )
}

import { Routes, Route, Link } from 'react-router-dom'
import HomePage from './pages/HomePage.jsx'
import PrayerPage from './pages/PrayerPage.jsx'

export default function App() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
      }}
    >
      {/* Full-width top bar */}
      <div className="topbar">
        <div className="topbar-inner container">
          <Link to="/" className="navlink">Home</Link>
          <Link to="/pray" className="navlink">Pray</Link>
        </div>
      </div>

      {/* Main content fills the available space */}
      <div style={{ flex: 1 }}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/pray" element={<PrayerPage />} />
        </Routes>
      </div>

      {/* Global footer */}
      <footer
        style={{
          textAlign: "center",
          fontSize: 12,
          color: "#666",
          padding: "12px",
          borderTop: "1px solid #eee",
          marginTop: "24px",
        }}
      >
        Built with ❤️ by Anush
      </footer>
    </div>
  )
}
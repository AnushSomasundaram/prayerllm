import { useState } from 'react'

export default function PrayerPage() {
  const [text, setText] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    // For now we do nothing with it; later you’ll call your API here.
    // Example (later): await fetch('/api/pray', { method: 'POST', body: JSON.stringify({ prayer: text }) })
    alert('Captured! (No API call yet)') // temporary so you see it’s wired
  }

  return (
    <main
      style={{
        minHeight: 'calc(100vh - 57px)',
        display: 'grid',
        placeItems: 'center',
        padding: '24px',
      }}
    >
      <section style={{ width: '100%', maxWidth: 720 }}>
        <h2 style={{ fontSize: 24, marginBottom: 12 }}>
        Lay your thoughts before me, my dear one.
        </h2>

        <form onSubmit={handleSubmit}>
          <label htmlFor="prayer" style={{ display: 'block', marginBottom: 8 }}>
            
          </label>
          <textarea
            id="prayer"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            placeholder="Type your prayer / thought here...."
            style={{
              width: '100%',
              padding: 12,
              borderRadius: 12,
              border: '1px solid #ddd',
              outline: 'none',
              fontSize: 14,
              marginBottom: 12,
            }}
          />
          <div>
            <button
              type="submit"
              style={{
                padding: '10px 16px',
                borderRadius: 12,
                border: '1px solid #333',
                background: '#111',
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              Submit
            </button>
          </div>
        </form>
      </section>
    </main>
  )
}

import { useState } from "react"
import "./App.css"

function App() {
  const [url, setUrl] = useState("")
  const [shortUrl, setShortUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setShortUrl("")

    try {
      const response = await fetch("/url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to shorten URL")
      }

      setShortUrl(data.shortUrl)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <h1>Keep It Short</h1>
      <p>Enter a long URL to get a shortened version.</p>
      
      <form onSubmit={handleSubmit} className="card">
        <input
          type="url"
          placeholder="https://example.com/very-long-url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
          className="url-input"
        />
        <button type="submit" disabled={loading}>
          {loading ? "Shortening..." : "Shorten"}
        </button>
      </form>

      {error && <p className="error">{error}</p>}

      {shortUrl && (
        <div className="result">
          <p>Your short URL:</p>
          <a href={shortUrl} target="_blank" rel="noreferrer">
            {shortUrl}
          </a>
          <div style={{ marginTop: "10px" }}>
            <button 
              className="copy-btn"
              onClick={() => {
                navigator.clipboard.writeText(shortUrl)
                alert("Copied to clipboard!")
              }}
            >
              Copy
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App

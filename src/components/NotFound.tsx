import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="not-found">
      <h2>Not found</h2>
      <p>That building or machine isn't on the map (yet).</p>
      <Link to="/" className="back-link">
        ← All buildings
      </Link>
    </div>
  )
}

import { BrowserRouter, Routes, Route } from 'react-router-dom'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<div>Map coming soon</div>} />
        <Route path="/admin" element={<div>Admin coming soon</div>} />
      </Routes>
    </BrowserRouter>
  )
}

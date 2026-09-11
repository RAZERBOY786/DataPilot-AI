import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Landing from './pages/Landing'
import Upload from './pages/Upload'
import Datasets from './pages/Datasets'
import Profiling from './pages/Profiling'
import Copilot from './pages/Copilot'
import Settings from './pages/Settings'
import Security from './pages/Security'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Landing />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/datasets" element={<Datasets />} />
        <Route path="/profiling" element={<Profiling />} />
        <Route path="/copilot" element={<Copilot />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/security" element={<Security />} />
      </Route>
    </Routes>
  )
}

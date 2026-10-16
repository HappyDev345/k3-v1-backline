import { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import NavBar from './components/NavBar'
import AuthModal from './components/AuthModal'
import FeedPage from './pages/FeedPage'
import DiscoverPage from './pages/DiscoverPage'
import PeoplePage from './pages/PeoplePage'
import ProfilePage from './pages/ProfilePage'
import MessagesPage from './pages/MessagesPage'
import ForumPage from './pages/ForumPage'
import NotificationsPage from './pages/NotificationsPage'

export default function App() {
  const [authOpen, setAuthOpen] = useState(false)
  const promptSignIn = () => setAuthOpen(true)

  return (
    <>
      <NavBar onSignIn={() => setAuthOpen(true)} />
      <Routes>
        <Route path="/" element={<FeedPage promptSignIn={promptSignIn} />} />
        <Route path="/discover" element={<DiscoverPage promptSignIn={promptSignIn} />} />
        <Route path="/people" element={<PeoplePage promptSignIn={promptSignIn} />} />
        <Route path="/profile" element={<ProfilePage promptSignIn={promptSignIn} />} />
        <Route path="/profile/:id" element={<ProfilePage promptSignIn={promptSignIn} />} />
        <Route path="/messages" element={<MessagesPage promptSignIn={promptSignIn} />} />
        <Route path="/forum" element={<ForumPage promptSignIn={promptSignIn} />} />
        <Route path="/notifications" element={<NotificationsPage promptSignIn={promptSignIn} />} />
      </Routes>
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      <footer>BACKLINE · Connecting the people who make productions happen.</footer>
    </>
  )
}

import React from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";

import Navbar from "./components/Navbar";
import AuthModal from "./components/AuthModal";
import { useAuth } from "./context/AuthContext";
import Home from "./pages/Home";
import Quiz from "./pages/Quiz";
import Leaderboard from "./pages/Leaderboard";
import Seva from "./pages/Seva";
import NaamJap from "./pages/NaamJap";
import ProtectedRoute from "./components/ProtectedRoute";
import Profile from "./pages/Profile";
import AdminDashboard from "./pages/AdminDashboard";
import Bhajans from "./pages/Bhajans";

function NotFound() {
  return (
    <main className="not-found-page py-20 text-center space-y-4">
      <h1 className="text-3xl font-bold text-spiritual-darkMaroon">
        Page not found
      </h1>
      <p className="text-gray-600">
        The page you are looking for does not exist.
      </p>
      <Link
        to="/"
        className="inline-block bg-spiritual-saffron text-white px-6 py-2.5 rounded-full font-semibold shadow"
      >
        Return to Home
      </Link>
    </main>
  );
}

function Footer() {
  return (
    <footer className="w-full bg-[#4A0E17] text-[#FFF8ED] py-10 px-4 border-t border-[#D4AF37]/30">
      <div className="max-w-4xl mx-auto flex flex-col items-center justify-center text-center space-y-4">
        <div className="flex items-center justify-center gap-2.5">
          <span className="w-9 h-9 rounded-full bg-[#FF8C00] flex items-center justify-center text-white font-bold text-base shadow-sm">
            ॐ
          </span>
          <strong className="text-lg font-serif tracking-wider text-white">
            Radha Krishna Bhaktimarg
          </strong>
        </div>

        <p className="text-xs text-[#EADDE0] max-w-lg leading-relaxed mx-auto">
          A place for devotion, spiritual learning, and selfless service. Shri
          Radha Raman &amp; Banke Bihari Seva.
        </p>

        <nav
          className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-medium text-[#F4E08B] pt-1"
          aria-label="Footer navigation"
        >
          <Link to="/" className="hover:text-white transition">
            Home
          </Link>
          <Link to="/quiz" className="hover:text-white transition">
            Daily Quiz
          </Link>
          <Link to="/leaderboard" className="hover:text-white transition">
            Leaderboard
          </Link>
          <Link to="/bhajans" className="hover:text-white transition">
            Bhajans &amp; Mantras
          </Link>
          <Link to="/jap" className="hover:text-white transition">
            📿 Naam Jap
          </Link>
          <Link to="/seva" className="hover:text-white transition">
            Voluntary Seva
          </Link>
        </nav>

        <small className="block text-[#A8929A] text-[11px] pt-2 border-t border-white/10 w-full max-w-xs mx-auto">
          © 2026 Radha Krishna Bhaktimarg. Designed BY{" "}
          <a
            href="https://www.instagram.com/akshay_aute_001/"
            target="_blank"
            rel="noreferrer"
            className="hover:text-white transition"
          >
            akshay_aute_001
          </a>{" "}
          &amp;{" "}
          <a
            href="https://www.instagram.com/ki.ran_.ig/"
            target="_blank"
            rel="noreferrer"
            className="hover:text-white transition"
          >
            @Ki.ran_.ig
          </a>
        </small>
      </div>
    </footer>
  );
}

export default function App() {
  const { isAuthModalOpen, closeAuthModal } = useAuth();

  return (
    <BrowserRouter>
      <div className="app-shell flex flex-col min-h-screen bg-spiritual-cream font-sans">
        <Navbar />

        {/* Global Auth Modal */}
        <AuthModal isOpen={isAuthModalOpen} onClose={closeAuthModal} />

        <main className="app-content flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />

            <Route
              path="/quiz"
              element={
                <ProtectedRoute>
                  <Quiz />
                </ProtectedRoute>
              }
            />
            <Route
              path="/leaderboard"
              element={
                <ProtectedRoute>
                  <Leaderboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/seva"
              element={
                <ProtectedRoute>
                  <Seva />
                </ProtectedRoute>
              }
            />
            <Route
              path="/bhajans"
              element={
                <ProtectedRoute>
                  <Bhajans />
                </ProtectedRoute>
              }
            />
            <Route
              path="/jap"
              element={
                <ProtectedRoute>
                  <NaamJap />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute adminOnly={true}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>

        <Footer />
      </div>
    </BrowserRouter>
  );
}

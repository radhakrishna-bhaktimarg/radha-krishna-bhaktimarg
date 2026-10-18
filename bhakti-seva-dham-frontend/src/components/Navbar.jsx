import React, { useState } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import {
  Menu,
  X,
  LogIn,
  LogOut,
  User,
  ShieldCheck,
  Trophy,
  Music2,
  Sparkles,
  HeartHandshake,
  House,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import "./Navbar.css";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { devotee, logoutDevotee, openAuthModal } = useAuth();
  const navigate = useNavigate();

  const closeMenu = () => setIsOpen(false);

  const protectQuizNavigation = (event, destination) => {
    if (window.location.pathname !== "/quiz") return;

    const navigationEvent = new CustomEvent("quiz-navigation-attempt", {
      cancelable: true,
      detail: { destination },
    });
    const allowed = window.dispatchEvent(navigationEvent);
    if (!allowed) {
      event.preventDefault();
      closeMenu();
    }
  };

  const handleLogout = () => {
    logoutDevotee();
    closeMenu();
    navigate("/");
  };

  const devoteeInitial = devotee?.name
    ? devotee.name.trim().charAt(0).toUpperCase()
    : "🙏";

  const isAdmin = devotee?.role === "admin";

  return (
    <nav className="site-navbar">
      <div className="site-navbar-container">
        {/* Logo & Brand */}
        <Link to="/" className="site-brand" onClick={closeMenu}>
          <div className="site-brand-icon">
            <img
              src="/images/radhaRaman.png"
              alt="Radha Krishna Bhaktimarg"
            />
          </div>
          <div className="site-brand-text">
            <strong>राधाकृष्ण भक्तिमार्ग</strong>
            <small>Shri Radha Raman &amp; Banke Bihari Seva</small>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <div className="site-nav-links">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `site-nav-link ${isActive ? "nav-active" : ""}`
            }
          >
            Home
          </NavLink>

          {/* Regular Devotee View Links */}
          {Boolean(devotee) && !isAdmin && (
            <>
              <NavLink
                to="/quiz"
                className={({ isActive }) =>
                  `site-nav-link ${isActive ? "nav-active" : ""}`
                }
              >
                Daily Quiz
              </NavLink>

              <NavLink
                to="/leaderboard"
                className={({ isActive }) =>
                  `site-nav-link ${isActive ? "nav-active" : ""}`
                }
              >
                Leaderboard
              </NavLink>

              <NavLink
                to="/bhajans"
                className={({ isActive }) =>
                  `site-nav-link ${isActive ? "nav-active" : ""}`
                }
              >
                Bhajans &amp; Mantras
              </NavLink>

              <NavLink
                to="/jap"
                className={({ isActive }) =>
                  `site-nav-link ${isActive ? "nav-active" : ""}`
                }
              >
                Naam Jap
              </NavLink>

              <NavLink
                to="/seva"
                className={({ isActive }) =>
                  `site-nav-link ${isActive ? "nav-active" : ""}`
                }
              >
                Voluntary Seva
              </NavLink>
            </>
          )}

          {/* Admin Specific Links */}
          {Boolean(devotee) && isAdmin && (
            <>
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `site-nav-link ${isActive ? "nav-active" : ""}`
                }
              >
                <ShieldCheck size={15} />
                <span>Admin Panel</span>
              </NavLink>

              <NavLink
                to="/leaderboard"
                className={({ isActive }) =>
                  `site-nav-link ${isActive ? "nav-active" : ""}`
                }
              >
                Leaderboard
              </NavLink>

              <NavLink
                to="/bhajans"
                className={({ isActive }) =>
                  `site-nav-link ${isActive ? "nav-active" : ""}`
                }
              >
                Bhajans Gallery
              </NavLink>
            </>
          )}

          {/* Common Profile Link for Logged-In Users */}
          {Boolean(devotee) && (
            <NavLink
              to="/profile"
              className={({ isActive }) =>
                `site-nav-link profile-nav-tab ${isActive ? "nav-active" : ""}`
              }
            >
              <User size={14} />
              <span>Profile</span>
            </NavLink>
          )}

          {/* Desktop Auth Controls */}
          <div className="nav-auth-wrapper">
            {devotee ? (
              <div className="nav-devotee-badge">
                <Link
                  to="/profile"
                  className="devotee-clean-pill"
                  title="Devotee Profile Dekhein"
                >
                  <span className="devotee-avatar-circle">
                    {devoteeInitial}
                  </span>
                  <span className="devotee-clean-name">
                    {devotee?.name || "Devotee"}
                  </span>
                </Link>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="nav-logout-btn"
                  title="Logout"
                >
                  <LogOut size={13} />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={openAuthModal}
                className="nav-login-btn"
              >
                <LogIn size={15} />
                <span>Login / Register</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Hamburger Toggle */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="nav-menu-toggle"
          aria-label="Toggle navigation menu"
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {isOpen && (
        <div className="site-nav-drawer">
          <NavLink
            to="/"
            end
            onClick={(event) => {
              protectQuizNavigation(event, "/");
              closeMenu();
            }}
            className="drawer-link"
          >
            <House size={17} aria-hidden="true" />
            <span>Home</span>
          </NavLink>

          {/* Regular Devotee Mobile Links */}
          {Boolean(devotee) && !isAdmin && (
            <>
              <NavLink
                to="/profile"
                onClick={(event) => {
                  protectQuizNavigation(event, "/profile");
                  closeMenu();
                }}
                className="drawer-link"
              >
                <User size={17} aria-hidden="true" />
                <span>My Profile</span>
              </NavLink>
              <NavLink
                to="/quiz"
                onClick={closeMenu}
                className="drawer-link"
              >
                <Sparkles size={17} aria-hidden="true" />
                <span>Daily Quiz</span>
              </NavLink>
              <NavLink
                to="/leaderboard"
                onClick={(event) => {
                  protectQuizNavigation(event, "/leaderboard");
                  closeMenu();
                }}
                className="drawer-link"
              >
                <Trophy size={17} aria-hidden="true" />
                <span>Leaderboard</span>
              </NavLink>
              <NavLink
                to="/bhajans"
                onClick={(event) => {
                  protectQuizNavigation(event, "/bhajans");
                  closeMenu();
                }}
                className="drawer-link"
              >
                <Music2 size={17} aria-hidden="true" />
                <span>Bhajans &amp; Mantras</span>
              </NavLink>
              <NavLink
                to="/jap"
                onClick={(event) => {
                  protectQuizNavigation(event, "/jap");
                  closeMenu();
                }}
                className="drawer-link"
              >
                <Sparkles size={17} aria-hidden="true" />
                <span>Naam Jap</span>
              </NavLink>
              <NavLink
                to="/seva"
                onClick={(event) => {
                  protectQuizNavigation(event, "/seva");
                  closeMenu();
                }}
                className="drawer-link"
              >
                <HeartHandshake size={17} aria-hidden="true" />
                <span>Voluntary Seva</span>
              </NavLink>
            </>
          )}

          {/* Admin Mobile Links */}
          {Boolean(devotee) && isAdmin && (
            <>
              <NavLink to="/admin" onClick={closeMenu} className="drawer-link">
                <ShieldCheck size={17} aria-hidden="true" />
                <span>Admin Panel</span>
              </NavLink>
              <NavLink
                to="/leaderboard"
                onClick={closeMenu}
                className="drawer-link"
              >
                <Trophy size={17} aria-hidden="true" />
                <span>Leaderboard</span>
              </NavLink>
              <NavLink
                to="/bhajans"
                onClick={closeMenu}
                className="drawer-link"
              >
                <Music2 size={17} aria-hidden="true" />
                <span>Bhajans Gallery</span>
              </NavLink>
              <NavLink
                to="/profile"
                onClick={closeMenu}
                className="drawer-link"
              >
                <User size={17} aria-hidden="true" />
                <span>My Profile</span>
              </NavLink>
            </>
          )}

          <div className="drawer-auth-row">
            {devotee ? (
              <div className="drawer-logged-user">
                <Link
                  to="/profile"
                  onClick={closeMenu}
                  className="drawer-user-info"
                  style={{ textDecoration: "none" }}
                >
                  <span className="devotee-avatar-circle">
                    {devoteeInitial}
                  </span>
                  <span>{devotee?.name || "Devotee"}</span>
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="drawer-logout-btn"
                >
                  <LogOut size={14} />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  closeMenu();
                  openAuthModal();
                }}
                className="drawer-login-btn"
              >
                <LogIn size={16} />
                <span>Login / Register</span>
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

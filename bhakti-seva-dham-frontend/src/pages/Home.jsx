import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Home.css";

import {
  Award,
  BookOpen,
  Gift,
  Heart,
  MessageCircle,
  Camera,
  ArrowRight,
} from "lucide-react";

export default function Home() {
  const { devotee, openAuthModal } = useAuth();
  const navigate = useNavigate();

  // Helper function to handle navigation with login gate
  const handleProtectedNavigation = (path) => {
    if (devotee) {
      navigate(path);
    } else {
      openAuthModal();
    }
  };

  return (
    <div className="home-page">
      <section className="hero-section">
        <span className="welcome-badge">Jai Shri Radhe Krishna</span>

        <h1>Radha Krishna Bhaktimarg</h1>

        <p className="hero-description">
          Connect with Shri Radha Raman Ji, Banke Bihari Ji, devotional stories,
          spiritual knowledge and seva.
        </p>

        <div className="hero-actions">
          <button
            type="button"
            className="primary-button"
            onClick={() => handleProtectedNavigation("/quiz")}
          >
            Play Today's Quiz <ArrowRight size={18} />
          </button>

          <button
            type="button"
            className="secondary-button"
            onClick={() => handleProtectedNavigation("/seva")}
          >
            <Heart size={18} /> Explore Seva
          </button>
        </div>
      </section>

      <section className="activities-section">
        <div className="section-heading">
          <span>OUR SPIRITUAL COMMUNITY</span>
          <h2>Explore Bhakti &amp; Seva</h2>
          <p>Learn, participate and grow in devotion.</p>
        </div>

        <div className="activity-grid">
          <article className="activity-card">
            <div className="activity-icon">
              <Award size={30} />
            </div>
            <h3>Daily Quiz</h3>
            <p>
              Test your knowledge of devotional stories and follow your quiz
              progress.
            </p>
            <button
              type="button"
              className="card-link-button"
              onClick={() => handleProtectedNavigation("/quiz")}
            >
              Explore Quiz →
            </button>
          </article>

          <article className="activity-card">
            <div className="activity-icon">
              <BookOpen size={30} />
            </div>
            <h3>Bhajans &amp; Mantras</h3>
            <p>
              Discover devotional songs, mantras and sacred music from Sanatan
              Dharma.
            </p>
            <button
              type="button"
              className="card-link-button"
              onClick={() => handleProtectedNavigation("/bhajans")}
            >
              Explore Bhajans →
            </button>
          </article>

          <article className="activity-card">
            <div className="activity-icon">
              <Gift size={30} />
            </div>
            <h3>Seva Activities</h3>
            <p>
              Learn about community service, devotional activities and upcoming
              events.
            </p>
            <button
              type="button"
              className="card-link-button"
              onClick={() => handleProtectedNavigation("/seva")}
            >
              Explore Seva →
            </button>
          </article>
        </div>
      </section>

      <section className="connect-section">
        <h2>Stay Connected</h2>
        <p>
          Follow our updates and stay connected with the Radha Krishna Bhaktimarg
          community.
        </p>

        <div className="social-links">
          <a
            href="https://instagram.com/dhiru.x.indresh"
            target="_blank"
            rel="noreferrer"
          >
            <Camera size={20} /> Instagram
          </a>

          <a
            href="https://chat.whatsapp.com/Cdev6EaEmRLGQMg310XCFs?s=cl&p=a&mlu=4&ilr=4"
            target="_blank"
            rel="noreferrer"
          >
            <MessageCircle size={20} /> WhatsApp
          </a>
        </div>
      </section>
    </div>
  );
}

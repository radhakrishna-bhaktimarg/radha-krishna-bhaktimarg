import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Music,
  Play,
  X,
  Loader2,
  Sparkles,
  ExternalLink,
  Headphones,
  Volume2,
  SkipForward,
  SkipBack,
  Repeat,
  Shuffle,
  Maximize2,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { API_BASE_URL } from "../api/api";
import "./Bhajans.css";

const CATEGORIES = ["All", "Bhajan", "Mantra", "Namavali", "Aarti", "Kirtan"];
const PAGE_SIZE = 10;

export default function Bhajans() {
  const { devotee } = useAuth();
  const [userName, setUserName] = useState(() => {
    return (
      devotee?.name || localStorage.getItem("bhakti_devotee_name") || "Devotee"
    );
  });

  const [bhajans, setBhajans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [activeCategory, setActiveCategory] = useState("All");

  const [modalVideo, setModalVideo] = useState(null);
  const [bgAudioItem, setBgAudioItem] = useState(null);
  const [playbackMode, setPlaybackMode] = useState("loop-one"); // default to repeat current track

  useEffect(() => {
    if (devotee?.name) {
      setUserName(devotee.name);
    }
  }, [devotee]);

  const fetchBhajans = async (
    category = "All",
    { append = false, offset = 0 } = {},
  ) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      const url =
        category === "All"
          ? `${API_BASE_URL}/bhajans?limit=${PAGE_SIZE}&offset=${offset}`
          : `${API_BASE_URL}/bhajans?category=${encodeURIComponent(category)}&limit=${PAGE_SIZE}&offset=${offset}`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.success && Array.isArray(data.bhajans)) {
        setBhajans((previous) =>
          append ? [...previous, ...data.bhajans] : data.bhajans,
        );
        setHasMore(Boolean(data.hasMore));
      } else {
        if (!append) setBhajans([]);
        setHasMore(false);
      }
    } catch (err) {
      console.error("Failed to load bhajans:", err);
      if (!append) setBhajans([]);
    } finally {
      setLoadingMore(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBhajans(activeCategory);
  }, [activeCategory]);

  const handleLoadMore = () => {
    fetchBhajans(activeCategory, {
      append: true,
      offset: bhajans.length,
    });
  };

  const toggleBgAudio = (item, e) => {
    if (e) e.stopPropagation();
    if (bgAudioItem?._id === item._id) {
      setBgAudioItem(null);
    } else {
      setModalVideo(null);
      setBgAudioItem(item);
    }
  };

  const switchToBackgroundFromModal = () => {
    if (modalVideo) {
      const current = modalVideo;
      setModalVideo(null);
      setBgAudioItem(current);
    }
  };

  const handlePlayNext = () => {
    if (!bgAudioItem || bhajans.length === 0) return;
    const currentIndex = bhajans.findIndex((b) => b._id === bgAudioItem._id);
    const nextIndex = (currentIndex + 1) % bhajans.length;
    setBgAudioItem(bhajans[nextIndex]);
  };

  const handlePlayPrev = () => {
    if (!bgAudioItem || bhajans.length === 0) return;
    const currentIndex = bhajans.findIndex((b) => b._id === bgAudioItem._id);
    const prevIndex = (currentIndex - 1 + bhajans.length) % bhajans.length;
    setBgAudioItem(bhajans[prevIndex]);
  };

  const getAudioEmbedUrl = (youtubeId) => {
    if (!youtubeId) return "";
    if (playbackMode === "loop-one") {
      return `https://www.youtube.com/embed/${youtubeId}?autoplay=1&loop=1&playlist=${youtubeId}&rel=0`;
    }
    return `https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0`;
  };

  return (
    <div className="bhajans-page">
      <div className="bhajans-container">
        <header className="bhajans-header">
          <div className="bhajans-badge">
            <Sparkles size={13} />
            <span>DIVYA SANGEET &amp; DHWANI</span>
          </div>
          <h1>Bhajans &amp; Mantras Gallery</h1>
          <p>
            Shri Radha Raman va Banke Bihari Ji ke pavitra bhajan, vedic mantra
            evum shravana sadhana.
          </p>

          <div className="bhajan-category-tabs">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`category-tab-btn ${activeCategory === cat ? "active" : ""}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat === "All" ? "Sabhi (All)" : cat}
              </button>
            ))}
          </div>
        </header>

        {loading ? (
          <div
            style={{ textAlign: "center", padding: "60px 0", color: "#8c5825" }}
          >
            <Loader2
              className="animate-spin"
              size={34}
              style={{ margin: "0 auto 12px" }}
            />
            <p>Bhajan aur mantro ki soochi prapt ho rahi hai... 🌸</p>
          </div>
        ) : bhajans.length === 0 ? (
          <div
            className="quiz-blank-card"
            style={{ margin: "20px auto", textAlign: "center" }}
          >
            <Music
              size={32}
              color="#b85b00"
              style={{ margin: "0 auto 12px" }}
            />
            <h2>Radhe Radhe, {userName}!</h2>
            <p className="quiz-blank-message">
              Till this time no Bhajan or Mantra video is added, please come
              back after some time.
            </p>
          </div>
        ) : (
          <div className="bhajans-grid">
            {bhajans.map((item) => {
              const isPlaying = bgAudioItem?._id === item._id;
              return (
                <article
                  key={item._id}
                  className={`bhajan-card ${isPlaying ? "card-playing-active" : ""}`}
                  onClick={() => setModalVideo(item)}
                >
                  <div className="thumbnail-wrapper">
                    <img
                      src={
                        item.thumbnailUrl ||
                        `https://img.youtube.com/vi/${item.youtubeId}/hqdefault.jpg`
                      }
                      alt={item.title}
                      className="bhajan-thumbnail"
                      loading="lazy"
                    />
                    <div className="play-overlay-button">
                      <Play size={22} fill="#ffffff" color="#ffffff" />
                    </div>
                    <span className="bhajan-category-tag">{item.category}</span>
                  </div>

                  <div className="bhajan-info">
                    <h3 className="bhajan-card-title">{item.title}</h3>

                    <div className="bhajan-card-bottom-row">
                      <span style={{ fontSize: "0.76rem", color: "#8c5825" }}>
                        Click to watch
                      </span>
                      <button
                        type="button"
                        className={`btn-card-audio ${isPlaying ? "active" : ""}`}
                        onClick={(e) => toggleBgAudio(item, e)}
                        title="Background audio me sunein"
                      >
                        <Headphones size={13} />
                        <span>
                          {isPlaying ? "Playing Audio" : "Listen Audio"}
                        </span>
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {!loading && bhajans.length > 0 && hasMore && (
          <div style={{ display: "flex", justifyContent: "center", marginTop: "28px" }}>
            <button
              type="button"
              className="category-tab-btn active"
              onClick={handleLoadMore}
              disabled={loadingMore}
              style={{ minWidth: "150px" }}
            >
              {loadingMore ? "Loading..." : "Load More"}
            </button>
          </div>
        )}

        {/* Video Player Modal */}
        {modalVideo && (
          <div
            className="video-modal-backdrop"
            onClick={() => setModalVideo(null)}
          >
            <div
              className="video-modal-container"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="video-modal-header">
                <h3 className="modal-title">{modalVideo.title}</h3>
                <div className="modal-header-actions">
                  <button
                    type="button"
                    className="btn-modal-switch-audio"
                    onClick={switchToBackgroundFromModal}
                    title="Audio background me chalayein"
                  >
                    <Headphones size={14} />
                    <span>Listen Background</span>
                  </button>
                  <button
                    type="button"
                    className="modal-close-btn"
                    onClick={() => setModalVideo(null)}
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="video-iframe-container">
                <iframe
                  src={`https://www.youtube.com/embed/${modalVideo.youtubeId}?autoplay=1&rel=0`}
                  title={modalVideo.title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>

              <div className="video-modal-footer">
                <a
                  href={modalVideo.youtubeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="open-youtube-link"
                >
                  <span>YouTube Par Kholein</span>
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Floating Background Audio Bar */}
        {bgAudioItem && (
          <aside className="mini-audio-bar">
            <div className="mini-audio-left">
              <img
                src={bgAudioItem.thumbnailUrl}
                alt={bgAudioItem.title}
                className="mini-audio-thumb"
              />
              <span className="mini-audio-title">{bgAudioItem.title}</span>
            </div>

            <div className="mini-audio-right">
              {/* Previous */}
              {bhajans.length > 1 && (
                <button
                  type="button"
                  className="btn-mini-control"
                  onClick={handlePlayPrev}
                  title="Pichhla Bhajan (Previous)"
                >
                  <SkipBack size={14} />
                </button>
              )}

              {/* Next */}
              {bhajans.length > 1 && (
                <button
                  type="button"
                  className="btn-mini-control"
                  onClick={handlePlayNext}
                  title="Agla Bhajan (Next)"
                >
                  <SkipForward size={14} />
                </button>
              )}

              {/* Loop / Cycle Toggle */}
              <button
                type="button"
                onClick={() =>
                  setPlaybackMode((prev) =>
                    prev === "loop-one" ? "auto-next" : "loop-one",
                  )
                }
                title={
                  playbackMode === "loop-one"
                    ? "Currently: Repeat 1 (Ek hi dhun bar-bar chalegi)"
                    : "Currently: Cycle Mode (Agla bhajan kram-anusar chalega)"
                }
                style={{
                  background:
                    playbackMode === "loop-one" ? "#5c141d" : "#faeed1",
                  color: playbackMode === "loop-one" ? "#ffffff" : "#8c5825",
                  border: "1px solid #ebd4ab",
                  borderRadius: "999px",
                  padding: "4px 10px",
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                {playbackMode === "loop-one" ? (
                  <>
                    <Repeat size={11} />
                    <span>Repeat 1</span>
                  </>
                ) : (
                  <>
                    <Shuffle size={11} />
                    <span>Cycle</span>
                  </>
                )}
              </button>

              {/* Expand to Video */}
              <button
                type="button"
                className="category-tab-btn active"
                style={{ padding: "4px 10px", fontSize: "0.72rem" }}
                onClick={() => {
                  const current = bgAudioItem;
                  setBgAudioItem(null);
                  setModalVideo(current);
                }}
              >
                Video
              </button>

              {/* Close */}
              <button
                type="button"
                className="btn-mini-close"
                onClick={() => setBgAudioItem(null)}
                title="Audio Band Karein"
              >
                <X size={16} />
              </button>
            </div>

            {/* Hidden Background Audio Stream */}
            <iframe
              key={`${bgAudioItem.youtubeId}-${playbackMode}`}
              src={getAudioEmbedUrl(bgAudioItem.youtubeId)}
              title="BG Audio"
              style={{
                position: "absolute",
                width: "1px",
                height: "1px",
                opacity: 0,
                pointerEvents: "none",
              }}
              allow="autoplay"
            ></iframe>
          </aside>
        )}
      </div>
    </div>
  );
}

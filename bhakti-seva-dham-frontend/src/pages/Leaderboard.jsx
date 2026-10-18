import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Trophy,
  Award,
  Loader2,
  BookOpen,
  Calendar,
  Zap,
} from "lucide-react";
import "./Leaderboard.css";
import { API_BASE_URL } from "../api/api";

const getTodayDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function Leaderboard() {
  const [devotees, setDevotees] = useState([]);
  const [filter, setFilter] = useState("combined"); // 'combined' | 'daily' | 'jap'
  const [loading, setLoading] = useState(true);

  // Initialize selectedDate directly to today's date
  const [selectedDate, setSelectedDate] = useState(getTodayDateString());
  const [availableDates, setAvailableDates] = useState([]);
  const [isLive, setIsLive] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchLeaderboard = async (
    dateParam = "",
    metricParam = filter,
    offset = 0,
  ) => {
    try {
      if (offset === 0) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      const targetDate = dateParam || getTodayDateString();
      const url = `${API_BASE_URL}/leaderboard?date=${targetDate}&metric=${metricParam}&limit=10&offset=${offset}`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.success && Array.isArray(data.devotees)) {
        setDevotees((current) =>
          offset === 0 ? data.devotees : [...current, ...data.devotees],
        );
        setSelectedDate(data.selectedDate || targetDate);
        setIsLive(Boolean(data.isLive));
        setHasMore(Boolean(data.hasMore));
        if (Array.isArray(data.availableDates)) {
          setAvailableDates(data.availableDates);
        }
      }
    } catch (err) {
      console.error("Failed to load leaderboard:", err);
    } finally {
      if (offset === 0) {
        setLoading(false);
      } else {
        setLoadingMore(false);
      }
    }
  };

  useEffect(() => {
    fetchLeaderboard(selectedDate, filter);
  }, [filter]);

  // Multi-tier sorting: Score (DESC) -> Quiz Time Taken (ASC) -> Malas (DESC)
  const sortedDevotees = [...devotees].sort((a, b) => {
    if (filter === "daily") {
      // 1. Higher daily quiz score
      if ((b.todayQuizScore || 0) !== (a.todayQuizScore || 0)) {
        return (b.todayQuizScore || 0) - (a.todayQuizScore || 0);
      }
      // 2. Faster quiz time taken (fewer seconds wins)
      return (a.quizTimeTaken || 999999) - (b.quizTimeTaken || 999999);
    }

    if (filter === "jap") {
      return (b.completedMalas || 0) - (a.completedMalas || 0);
    }

    // Combined metric:
    // 1. Higher combined score
    if ((b.combinedScore || 0) !== (a.combinedScore || 0)) {
      return (b.combinedScore || 0) - (a.combinedScore || 0);
    }
    // 2. Faster quiz time taken
    if ((a.quizTimeTaken || 999999) !== (b.quizTimeTaken || 999999)) {
      return (a.quizTimeTaken || 999999) - (b.quizTimeTaken || 999999);
    }
    // 3. More malas chanted
    return (b.completedMalas || 0) - (a.completedMalas || 0);
  });

  const winner = sortedDevotees[0] || {
    name: "Devotee",
    todayQuizScore: 0,
    completedMalas: 0,
    combinedScore: 0,
    quizTimeTaken: 999999,
  };

  const getDisplayScore = (item) => {
    if (filter === "daily") return `${item.todayQuizScore || 0} Pts`;
    if (filter === "jap")
      return `${item.completedMalas || 0} Malas (${(item.completedMalas || 0) * 5} Pts)`;
    return `${item.combinedScore || 0} Pts`;
  };

  const formatTimeTaken = (seconds) => {
    if (!seconds || seconds >= 999999) return null;
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const runnersUp = sortedDevotees.slice(1);
  const todayStr = getTodayDateString();

  return (
    <div className="leaderboard-page">
      <div className="leaderboard-container">
        <header className="leaderboard-header">
          <div className="leaderboard-badge">
            <Sparkles size={13} />
            <span>Nitya Bhakti Ranking</span>
          </div>
          <h1>Top Devotees Leaderboard</h1>
          <p>
            Daily Katha Quiz aur Nitya Naam Jap sadhana (5 Pts per mala) ke
            adhar par rank soochi. Score saman hone par kam samay (speed) lene
            wale ko pratham sthan milega.
          </p>

          {/* 3 Metric Filter Tabs */}
          <div className="leaderboard-filter-tabs">
            <button
              type="button"
              className={`filter-tab ${filter === "combined" ? "active" : ""}`}
              onClick={() => setFilter("combined")}
            >
              <Award size={15} />
              <span>Combined Score</span>
            </button>
            <button
              type="button"
              className={`filter-tab ${filter === "daily" ? "active" : ""}`}
              onClick={() => setFilter("daily")}
            >
              <BookOpen size={15} />
              <span>Daily Quiz</span>
            </button>
            <button
              type="button"
              className={`filter-tab ${filter === "jap" ? "active" : ""}`}
              onClick={() => setFilter("jap")}
            >
              <Sparkles size={15} />
              <span>Naam Jap</span>
            </button>
          </div>

          {/* Date Selector for Prize Distribution History */}
          {availableDates.length > 0 && (
            <div className="leaderboard-date-strip">
              <span className="date-strip-label">
                <Calendar size={13} />
                <span>Result Tithi:</span>
              </span>
              <div className="date-pills-row">
                {availableDates.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => fetchLeaderboard(d.value, filter)}
                    className={`date-pill-btn ${selectedDate === d.value ? "active-date" : ""}`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Display historical notice ONLY when inspecting a past date */}
          {!isLive && selectedDate !== todayStr && (
            <div className="historical-notice-chip">
              Puraskar Vitran Record: Ye din <strong>{selectedDate}</strong> ka
              finalized record hai.
            </div>
          )}
        </header>

        {loading ? (
          <div
            style={{ textAlign: "center", padding: "48px 0", color: "#8c5825" }}
          >
            <Loader2
              className="animate-spin"
              size={32}
              style={{ margin: "0 auto 12px" }}
            />
            <p>Prasadam prapt ho raha hai...</p>
          </div>
        ) : sortedDevotees.length === 0 ? (
          <div
            style={{ textAlign: "center", padding: "40px 0", color: "#8c5825" }}
          >
            <p>Is din ke liye koi devotee score uplabdh nahi hai.</p>
          </div>
        ) : (
          <>
            {/* 1st Place Podium Card */}
            <div className="podium-first-card">
              <div className="podium-first-left">
                <div className="trophy-badge">
                  <Trophy size={26} />
                </div>
                <div className="podium-meta">
                  <span className="podium-rank-tag">
                    <Trophy size={13} />
                    <span>1st Rank Devotee</span>
                  </span>
                  <div className="podium-first-name">{winner.name}</div>
                  <div
                    className="podium-breakdown"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      flexWrap: "wrap",
                    }}
                  >
                    <span>
                      Quiz: {winner.todayQuizScore || 0} Pts •{" "}
                      {winner.completedMalas || 0} Malas (
                      {(winner.completedMalas || 0) * 5} Pts)
                    </span>
                    {formatTimeTaken(winner.quizTimeTaken) && (
                      <span
                        style={{
                          background: "#faeed1",
                          color: "#8c5825",
                          padding: "2px 8px",
                          borderRadius: "999px",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "3px",
                        }}
                      >
                        <Zap size={12} fill="#8c5825" />
                        {formatTimeTaken(winner.quizTimeTaken)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="podium-first-points">
                <span className="points-pill-gold">
                  {getDisplayScore(winner)}
                </span>
              </div>
            </div>

            {/* Runner-up list */}
            {runnersUp.length > 0 && (
              <div className="rankings-grid">
                {runnersUp.map((item, index) => (
                  <article key={item._id || index} className="ranking-plaque">
                    <div className="ranking-row-left">
                      <span className="rank-number-badge">#{index + 2}</span>
                      <div>
                        <span className="ranking-name">{item.name}</span>
                        <div
                          className="ranking-sub"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            flexWrap: "wrap",
                          }}
                        >
                          <span>
                            Quiz: {item.todayQuizScore || 0} Pts •{" "}
                            {item.completedMalas || 0} Malas
                          </span>
                          {formatTimeTaken(item.quizTimeTaken) && (
                            <span
                              style={{
                                background: "#faeed1",
                                color: "#8c5825",
                                padding: "1px 6px",
                                borderRadius: "999px",
                                fontSize: "0.72rem",
                                fontWeight: 700,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "2px",
                              }}
                            >
                              <Zap size={11} fill="#8c5825" />
                              {formatTimeTaken(item.quizTimeTaken)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="ranking-points">
                      <strong>{getDisplayScore(item)}</strong>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        )}

        {!loading && hasMore && (
          <button
            type="button"
            className="leaderboard-load-more"
            onClick={() => fetchLeaderboard(selectedDate, filter, devotees.length)}
            disabled={loadingMore}
          >
            {loadingMore ? "Loading..." : "Load More"}
          </button>
        )}

        <div className="scroll-footer-decor">
          <span className="decor-symbols">✦ ✦ ✦</span>
          <span>
            Shri Radha Raman &amp; Banke Bihari Ji ki kripa se sanchalit
          </span>
        </div>
      </div>
    </div>
  );
}

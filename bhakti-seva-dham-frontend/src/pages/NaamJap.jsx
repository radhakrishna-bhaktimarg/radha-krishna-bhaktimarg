import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { API_BASE_URL } from "../api/api";
import {
  Sparkles,
  RotateCcw,
  Volume2,
  VolumeX,
  Award,
  User,
  Undo2,
  Heart,
} from "lucide-react";
import "./NaamJap.css";

export default function NaamJap() {
  const { devotee } = useAuth();
  const [userName, setUserName] = useState(() => {
    return (
      devotee?.name || localStorage.getItem("bhakti_devotee_name") || "Devotee"
    );
  });

  const [beadCount, setBeadCount] = useState(0); // 0 to 108
  const [todayMalas, setTodayMalas] = useState(0);
  const [lifetimeJap, setLifetimeJap] = useState(0);
  const [syncError, setSyncError] = useState("");
  const pendingSyncRef = useRef(null);

  const [audioEnabled, setAudioEnabled] = useState(true);
  const [targetMala, setTargetMala] = useState(1);
  const [isPressing, setIsPressing] = useState(false);
  const audioCtxRef = useRef(null);

  const getToken = () => {
    const storedUser = localStorage.getItem("bhakti_devotee");
    return devotee?.token || (storedUser ? JSON.parse(storedUser).token : null);
  };

  // Fetch current database totals on mount
  useEffect(() => {
    const fetchLatestStats = async () => {
      const token = getToken();
      if (!token) return;
      try {
        const res = await fetch(`${API_BASE_URL}/jap/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) {
          setTodayMalas(data.todayCompletedMalas);
          setLifetimeJap(data.lifetimeJap);
        }
      } catch (err) {
        console.error("Failed to fetch initial stats:", err);
      }
    };

    if (devotee?.name) {
      setUserName(devotee.name);
    }
    fetchLatestStats();
  }, [devotee]);

  // Send delta (+1 mala or -1 mala) to backend
  const syncDeltaWithBackend = async (
    deltaMalas,
    deltaBeads,
    operationId,
  ) => {
    const token = getToken();
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE_URL}/jap/sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ deltaMalas, deltaBeads, operationId }),
      });

      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "Naam Jap sync failed.");
      }
      if (data?.success && data.devotee) {
        setTodayMalas(data.devotee.todayCompletedMalas);
        setLifetimeJap(data.devotee.lifetimeJap);
      }
      pendingSyncRef.current = null;
      setSyncError("");
    } catch (err) {
      console.error("Sync delta error:", err);
      pendingSyncRef.current = { deltaMalas, deltaBeads, operationId };
      setSyncError(
        "Points sync nahi ho paye. Retry karein; current action dobara count nahi hoga.",
      );
    }
  };

  const createOperationId = () =>
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const retrySync = () => {
    const pendingSync = pendingSyncRef.current;
    if (pendingSync) {
      syncDeltaWithBackend(
        pendingSync.deltaMalas,
        pendingSync.deltaBeads,
        pendingSync.operationId,
      );
    }
  };

  const playChantTone = (isCompletion = false) => {
    if (!audioEnabled) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (
          window.AudioContext || window.webkitAudioContext
        )();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      if (isCompletion) {
        osc.type = "sine";
        osc.frequency.setValueAtTime(587.33, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 1.2);
      } else {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(261.63, ctx.currentTime);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.09);
      }
    } catch {
      // Audio autoplay policy fallback
    }
  };

  const handleBeadClick = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setIsPressing(true);
    setTimeout(() => setIsPressing(false), 140);

    const nextBead = beadCount + 1;
    setLifetimeJap((prev) => prev + 1);

    if (nextBead >= 108) {
      setBeadCount(0);
      setTodayMalas((prev) => prev + 1);
      playChantTone(true);
      // Increment 1 mala and 108 beads in database
      syncDeltaWithBackend(1, 108, createOperationId());
    } else {
      setBeadCount(nextBead);
      playChantTone(false);
    }
  };

  const handleUndo = () => {
    if (beadCount > 0) {
      setBeadCount((prev) => prev - 1);
      setLifetimeJap((prev) => Math.max(0, prev - 1));
    } else if (todayMalas > 0) {
      setTodayMalas((prev) => Math.max(0, prev - 1));
      setBeadCount(107);
      setLifetimeJap((prev) => Math.max(0, prev - 1));
      // Decrement 1 mala and 1 bead in database
      syncDeltaWithBackend(-1, -1, createOperationId());
    }
  };

  const handleResetSession = () => {
    if (
      window.confirm(
        "Kya aap vartaman mala ke beads ko 0 par reset karna chahte hain?",
      )
    ) {
      setBeadCount(0);
    }
  };

  const radius = 110;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (beadCount / 108) * circumference;

  return (
    <div className="jap-page">
      <div className="jap-container">
        {/* Header */}
        <header className="jap-header">
          <span className="jap-badge">
            <Sparkles size={13} /> NITYA NAAM JAP SADHANA
          </span>
          <h1>Shri Radha Rani &amp; Krishn Jap</h1>
          <p>
            "Radhe Radhe" smaran karein. Har mala par 5 points leaderboard par
            jodein.
          </p>
        </header>

        {/* Main Jap Plaque */}
        <div className="jap-card">
          <div className="jap-devotee-strip">
            <div className="jap-devotee-field">
              <User size={16} />
              <span className="jap-logged-name">{userName}</span>
            </div>

            <div className="jap-quick-actions">
              <button
                type="button"
                onClick={() => setAudioEnabled(!audioEnabled)}
                className={`jap-icon-btn ${audioEnabled ? "active" : ""}`}
                title={audioEnabled ? "Sound On" : "Muted"}
              >
                {audioEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
              </button>

              <button
                type="button"
                onClick={handleResetSession}
                className="jap-icon-btn reset-btn"
                title="Reset Current Beads"
              >
                <RotateCcw size={15} />
              </button>
            </div>
          </div>

          <div className="jap-target-row">
            <span className="jap-target-label">Lakshya:</span>
            {[1, 11, 16, 21].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setTargetMala(m)}
                className={`jap-target-chip ${targetMala === m ? "active" : ""}`}
              >
                {m} {m === 1 ? "Mala" : "Malas"}
              </button>
            ))}
          </div>

          <div className="jap-dial-area">
            <div className="jap-ring-wrapper">
              <svg className="jap-svg-ring" viewBox="0 0 250 250">
                <circle className="jap-ring-bg" cx="125" cy="125" r={radius} />
                <circle
                  className="jap-ring-progress"
                  cx="125"
                  cy="125"
                  r={radius}
                  style={{
                    strokeDasharray: circumference,
                    strokeDashoffset: strokeDashoffset,
                  }}
                />
              </svg>

              <button
                type="button"
                onClick={handleBeadClick}
                className={`jap-central-disc ${isPressing ? "pressed" : ""}`}
                aria-label="Chant Bead"
              >
                <div className="disc-inner-content">
                  <Heart size={20} className="disc-lotus-icon" />
                  <span className="disc-mantra-title">श्री राधा</span>
                  <strong className="disc-live-count">{beadCount}</strong>
                  <span className="disc-out-of">of 108 Beads</span>
                </div>
              </button>
            </div>
          </div>

          <div className="jap-metrics-bar">
            <div className="jap-metric-item">
              <span className="metric-title">Aaj Ki Malas</span>
              <strong className="metric-val highlight">
                {todayMalas} <small>/ {targetMala}</small>
              </strong>
            </div>
            {syncError && (
              <div
                role="alert"
                style={{
                  color: "#7a1f1f",
                  background: "#fff1e8",
                  border: "1px solid #e2a77d",
                  borderRadius: "10px",
                  margin: "12px 0",
                  padding: "10px",
                  textAlign: "center",
                }}
              >
                <span>{syncError}</span>
                <button type="button" onClick={retrySync}>
                  Retry sync
                </button>
              </div>
            )}

            <div className="jap-metric-divider" />

            <div className="jap-metric-item">
              <span className="metric-title">Jap Points (5 Pts/Mala)</span>
              <strong className="metric-val">
                {todayMalas * 5} <small>Pts</small>
              </strong>
            </div>

            <div className="jap-metric-divider" />

            <div className="jap-metric-item">
              <span className="metric-title">Lifetime Jap</span>
              <strong className="metric-val">{lifetimeJap}</strong>
            </div>
          </div>

          <div className="jap-actions-footer">
            <button
              type="button"
              onClick={handleUndo}
              disabled={beadCount === 0 && todayMalas === 0}
              className="jap-footer-btn undo-btn"
            >
              <Undo2 size={16} />
              <span>Undo Last</span>
            </button>

            <Link to="/leaderboard" className="jap-footer-btn lb-btn">
              <Award size={16} />
              <span>View Leaderboard</span>
            </Link>
          </div>
        </div>

        <div className="jap-footer-decor">
          Shri Radha Raman &amp; Banke Bihari Ji ki kripa se sanchalit
        </div>
      </div>
    </div>
  );
}

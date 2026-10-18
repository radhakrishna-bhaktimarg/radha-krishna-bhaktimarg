import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Sparkles,
  BookOpen,
  HelpCircle,
  User,
  CheckCircle2,
  Trophy,
  ArrowRight,
  ArrowLeft,
  Award,
  Loader2,
  Clock,
  PlayCircle,
  Globe,
  Zap,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { API_BASE_URL } from "../api/api";
import "./Quiz.css";

const LANG_CONFIG = [
  { code: "hi", label: "हिन्दी" },
  { code: "en", label: "English" },
  { code: "mr", label: "मराठी" },
  { code: "sa", label: "संस्कृतम्" },
];

const QUIZ_CACHE_TTL_MS = 5 * 60 * 1000;
const getTodayDateString = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
const getQuizCacheKey = (devotee) =>
  `daily_quiz_katha_${devotee?._id || devotee?.email || "user"}_${getTodayDateString()}`;
const getActiveQuizKey = (devotee) =>
  `daily_quiz_active_${devotee?._id || devotee?.email || "user"}_${getTodayDateString()}`;

export default function Quiz() {
  const { devotee } = useAuth();
  const navigate = useNavigate();
  const submitAttemptRef = useRef(null);
  const [userName, setUserName] = useState(() => {
    return (
      devotee?.name || localStorage.getItem("bhakti_devotee_name") || "Devotee"
    );
  });

  const [loading, setLoading] = useState(true);
  const [hasKatha, setHasKatha] = useState(false);
  const [blankMessage, setBlankMessage] = useState("");
  const [alreadyAttempted, setAlreadyAttempted] = useState(false);
  const [dailyQuizScore, setDailyQuizScore] = useState(0);

  const [rawKatha, setRawKatha] = useState(null);
  const [languagesData, setLanguagesData] = useState(null);
  const [currentLang, setCurrentLang] = useState("hi");

  const [flowState, setFlowState] = useState("reading");
  const [currentStep, setCurrentStep] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [earnedScore, setEarnedScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);

  // Timer states for speed tie-breaker ranking
  const [quizStartTime, setQuizStartTime] = useState(null);
  const [completedDuration, setCompletedDuration] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [pendingLeave, setPendingLeave] = useState(null);

  useEffect(() => {
    if (devotee?.name) {
      setUserName(devotee.name);
    }
  }, [devotee]);

  // Live stopwatch effect during the quiz phase
  useEffect(() => {
    let timer;
    if (flowState === "quiz" && quizStartTime) {
      timer = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - quizStartTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [flowState, quizStartTime]);

  const formatTimerClock = (totalSec) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const fetchTodayKathaQuiz = async () => {
    try {
      setLoading(true);
      const cacheKey = getQuizCacheKey(devotee);
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Date.now() - parsed.savedAt < QUIZ_CACHE_TTL_MS) {
            const cachedData = parsed.data;
            if (cachedData.success && cachedData.hasKatha) {
              setHasKatha(true);
              setRawKatha(cachedData.katha);
              setLanguagesData(cachedData.languages || null);
              setAlreadyAttempted(Boolean(cachedData.alreadyAttempted));
              setDailyQuizScore(cachedData.dailyQuizScore || 0);
              if (cachedData.alreadyAttempted) setFlowState("result");
            } else {
              setHasKatha(false);
              setBlankMessage(
                cachedData.message ||
                  "Till this time no Katha or Quiz is added, please come back after some time.",
              );
            }
            setLoading(false);
            return;
          }
        } catch {
          sessionStorage.removeItem(cacheKey);
        }
        sessionStorage.removeItem(cacheKey);
      }
      const storedUser = localStorage.getItem("bhakti_devotee");
      const token =
        devotee?.token || (storedUser ? JSON.parse(storedUser).token : null);

      const res = await fetch(`${API_BASE_URL}/quiz/today-katha`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (data.success) {
        sessionStorage.setItem(
          cacheKey,
          JSON.stringify({ savedAt: Date.now(), data }),
        );
      }

      if (data.success) {
        if (!data.hasKatha) {
          setHasKatha(false);
          setBlankMessage(
            data.message ||
              "Till this time no Katha or Quiz is added, please come back after some time.",
          );
        } else {
          setHasKatha(true);
          setRawKatha(data.katha);
          setLanguagesData(data.languages || null);
          setAlreadyAttempted(Boolean(data.alreadyAttempted));
          setDailyQuizScore(data.dailyQuizScore || 0);

          if (data.alreadyAttempted) {
            setFlowState("result");
          }
        }
      } else {
        setHasKatha(false);
        setBlankMessage(
          data.message ||
            "Till this time no Katha or Quiz is added, please come back after some time.",
        );
      }
    } catch (err) {
      console.error("Error loading today's katha & quiz:", err);
      setHasKatha(false);
      setBlankMessage(
        "Server se sampark nahi ho saka. Kripya thodi der baad prayas karein.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodayKathaQuiz();
  }, [devotee]);

  useEffect(() => {
    if (loading || !hasKatha || alreadyAttempted || flowState !== "quiz") {
      return;
    }

    sessionStorage.setItem(
      getActiveQuizKey(devotee),
      JSON.stringify({
        currentLang,
        currentStep,
        quizStartTime,
        userAnswers,
      }),
    );
  }, [
    alreadyAttempted,
    currentLang,
    currentStep,
    devotee,
    flowState,
    hasKatha,
    loading,
    quizStartTime,
    userAnswers,
  ]);

  useEffect(() => {
    if (loading || !hasKatha || alreadyAttempted) return;

    const activeQuiz = sessionStorage.getItem(getActiveQuizKey(devotee));
    if (!activeQuiz) return;

    try {
      const parsed = JSON.parse(activeQuiz);
      setCurrentLang(parsed.currentLang || "hi");
      setCurrentStep(
        Number.isInteger(parsed.currentStep) ? parsed.currentStep : 0,
      );
      setQuizStartTime(parsed.quizStartTime || Date.now());
      setUserAnswers(
        parsed.userAnswers && typeof parsed.userAnswers === "object"
          ? parsed.userAnswers
          : {},
      );
      setFlowState("quiz");
      setPendingLeave("__reload__");
    } catch {
      sessionStorage.removeItem(getActiveQuizKey(devotee));
    }
  }, [alreadyAttempted, devotee, hasKatha, loading]);

  // Derive active content and questions based on language selection
  const activeContent =
    languagesData?.[currentLang] || languagesData?.hi || rawKatha;
  const questions = activeContent?.questions || rawKatha?.questions || [];

  const currentQ = questions[currentStep];
  const isLastQuestion =
    questions.length > 0 && currentStep === questions.length - 1;
  const progressPercent =
    questions.length > 0 ? ((currentStep + 1) / questions.length) * 100 : 0;
  const pointsPerQuestion =
    questions.length > 0 ? (100 / questions.length).toFixed(1) : 0;

  // Track selection by step index
  const handleOptionSelect = (optIdx) => {
    setUserAnswers((prev) => ({
      ...prev,
      [currentStep]: optIdx,
    }));
  };

  const handleNext = () => {
    if (userAnswers[currentStep] === undefined) {
      alert("Kripya aage badhne se pehle ek vikalp chunein!");
      return;
    }
    if (!isLastQuestion) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleSubmit();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      const storedUser = localStorage.getItem("bhakti_devotee");
      const token =
        devotee?.token || (storedUser ? JSON.parse(storedUser).token : null);

      // Calculate time taken in seconds
      const timeTakenSeconds = quizStartTime
        ? Math.max(1, Math.round((Date.now() - quizStartTime) / 1000))
        : 1;

      // Map answers with both questionIndex and MongoDB _id
      const payloadAnswers = questions.map((q, idx) => ({
        questionIndex: idx,
        questionId: q._id ? q._id.toString() : null,
        selectedIndex: userAnswers[idx] !== undefined ? userAnswers[idx] : -1,
      }));

      const res = await fetch(`${API_BASE_URL}/quiz/submit-daily`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          answers: payloadAnswers,
          timeTakenSeconds,
        }),
      });

      const data = await res.json();

      if (data.success) {
        sessionStorage.removeItem(getQuizCacheKey(devotee));
        sessionStorage.removeItem(getActiveQuizKey(devotee));
        setEarnedScore(data.earnedScore);
        setCorrectCount(
          data.correctCount !== undefined ? data.correctCount : null,
        );
        setDailyQuizScore(data.dailyQuizScore);
        setCompletedDuration(timeTakenSeconds);
        setAlreadyAttempted(true);
        setFlowState("result");
        return true;
      } else {
        alert(data.message || "Submission failed");
        return false;
      }
    } catch (err) {
      console.error(err);
      alert("Submission me samasya aayi. Kripya punah prayas karein.");
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    submitAttemptRef.current = handleSubmit;
  });

  useEffect(() => {
    if (flowState !== "quiz") return undefined;

    const handleRouteLeave = (event) => {
      const link = event.target.closest?.("a[href]");
      if (!link || link.target === "_blank" || link.hasAttribute("download")) {
        return;
      }
      const destination = new URL(link.href, window.location.href);
      if (
        destination.origin !== window.location.origin ||
        destination.pathname === window.location.pathname
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      setPendingLeave(
        `${destination.pathname}${destination.search}${destination.hash}`,
      );
    };

    document.addEventListener("click", handleRouteLeave, true);
    return () => document.removeEventListener("click", handleRouteLeave, true);
  }, [flowState, navigate]);

  useEffect(() => {
    if (flowState !== "quiz") return undefined;

    const handleQuizNavigationAttempt = (event) => {
      if (!event.detail?.destination) return;
      event.preventDefault();
      setPendingLeave(event.detail.destination);
    };

    window.addEventListener(
      "quiz-navigation-attempt",
      handleQuizNavigationAttempt,
    );
    return () =>
      window.removeEventListener(
        "quiz-navigation-attempt",
        handleQuizNavigationAttempt,
      );
  }, [flowState]);

  useEffect(() => {
    if (flowState !== "quiz") return undefined;
    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [flowState]);

  const formatSeconds = (sec) => {
    if (!sec) return null;
    if (sec < 60) return `${sec}s`;
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s}s`;
  };

  const renderLanguagePills = () => (
    <div
      className="quiz-lang-selector"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        margin: "14px 0 20px",
      }}
    >
      <span
        style={{
          display: "flex",
          alignItems: "center",
          gap: "4px",
          fontSize: "0.82rem",
          color: "#8c5825",
          fontWeight: 700,
        }}
      >
        <Globe size={14} /> Bhasha:
      </span>
      {LANG_CONFIG.map((lang) => (
        <button
          key={lang.code}
          type="button"
          onClick={() => setCurrentLang(lang.code)}
          style={{
            background: currentLang === lang.code ? "#5c141d" : "#ffffff",
            color: currentLang === lang.code ? "#ffffff" : "#634336",
            border: "1px solid #ebd4ab",
            borderRadius: "14px",
            padding: "4px 12px",
            fontSize: "0.78rem",
            fontWeight: 700,
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
        >
          {lang.label}
        </button>
      ))}
    </div>
  );

  const confirmLeaveQuiz = async () => {
    if (!pendingLeave) return;
    const destination = pendingLeave;
    setPendingLeave(null);
    const submitted = await submitAttemptRef.current?.();
    if (submitted && destination !== "__reload__") navigate(destination);
  };

  const renderLeaveModal = () =>
    pendingLeave && (
      <div className="quiz-leave-modal-backdrop" role="presentation">
        <div
          className="quiz-leave-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="quiz-leave-title"
        >
          <div className="quiz-leave-icon">
            <Clock size={24} />
          </div>
          <h2 id="quiz-leave-title">Quiz chhodna hai?</h2>
          <p>
            Aapka quiz abhi chal raha hai. Leave karne par aapke current
            answers automatically submit ho jayenge.
          </p>
          <div className="quiz-leave-actions">
            <button
              type="button"
              className="quiz-leave-stay-btn"
              onClick={() => setPendingLeave(null)}
            >
              Quiz par wapas jayein
            </button>
            <button
              type="button"
              className="quiz-leave-confirm-btn"
              onClick={confirmLeaveQuiz}
              disabled={submitting}
            >
              {submitting ? "Submit ho raha hai..." : "Submit & Leave"}
            </button>
          </div>
        </div>
      </div>
    );

  if (loading) {
    return (
      <div className="quiz-page">
        <div
          className="quiz-container"
          style={{ textAlign: "center", padding: "80px 20px" }}
        >
          <Loader2
            size={38}
            className="animate-spin"
            style={{ margin: "0 auto 16px", color: "#b85b00" }}
          />
          <h2 style={{ fontFamily: "Georgia, serif", color: "#4a0e17" }}>
            Aaj ki pavitra Katha prapt ho rahi hai... 🌸
          </h2>
        </div>
      </div>
    );
  }

  // 1. BLANK STATE
  if (!hasKatha) {
    return (
      <div className="quiz-page">
        <div className="quiz-container">
          <div className="quiz-blank-card">
            <Clock size={46} color="#b85b00" style={{ margin: "0 auto" }} />
            <h2>Radhe Radhe, {userName}!</h2>
            <p className="quiz-blank-message">{blankMessage}</p>
            <div
              style={{
                marginTop: "24px",
                display: "flex",
                justifyContent: "center",
                width: "100%",
              }}
            >
              <Link to="/leaderboard" className="result-btn-leaderboard">
                <Award size={18} />
                <span>Leaderboard Dekhein</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. RESULT STATE
  if (flowState === "result" || alreadyAttempted) {
    return (
      <div className="quiz-page">
        <div className="quiz-container">
          <div
            className="quiz-card quiz-result-card"
            style={{ textAlign: "center", padding: "50px 24px" }}
          >
            <div className="result-trophy-icon">
              <Trophy size={48} color="#d4af37" />
            </div>
            <h2>Jai Shri Radhe, {userName}!</h2>
            <p
              className="result-subtext"
              style={{ fontSize: "1.05rem", margin: "14px 0 20px" }}
            >
              Aapne aaj ki Katha par aadharit daily quiz purna kar liya hai. Ek
              din me keval ek (1) attempt anumat hai.
            </p>
            <div
              className="result-score-box"
              style={{ maxWidth: "360px", margin: "0 auto 24px" }}
            >
              <span className="result-score-label">
                Aaj Ka Registered Score
              </span>
              <strong className="result-score-points">
                {earnedScore || dailyQuizScore} / 100 Pts
              </strong>
              {correctCount !== null && (
                <div
                  style={{
                    fontSize: "0.88rem",
                    color: "#8c5825",
                    marginTop: "4px",
                    fontWeight: 600,
                  }}
                >
                  ({correctCount} of {questions.length} Sahi Uttar)
                </div>
              )}
              {completedDuration && (
                <div
                  style={{
                    marginTop: "8px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    background: "#faeed1",
                    color: "#8c5825",
                    padding: "3px 10px",
                    borderRadius: "999px",
                    fontSize: "0.76rem",
                    fontWeight: 700,
                  }}
                >
                  <Zap size={12} fill="#8c5825" />
                  <span>Samay: {formatSeconds(completedDuration)}</span>
                </div>
              )}
              <span className="result-score-sub" style={{ marginTop: "8px" }}>
                Score aur completion time tie-breaker ke sath leaderboard par
                darj ho gaya hai.
              </span>
            </div>
            <div
              className="result-actions"
              style={{ justifyContent: "center" }}
            >
              <Link to="/leaderboard" className="result-btn-leaderboard">
                <Award size={18} />
                <span>Leaderboard Rankings Dekhein</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3. READING PHASE
  if (flowState === "reading") {
    return (
      <div className="quiz-page">
        <div className="quiz-container">
          <header className="quiz-header">
            <span className="quiz-badge">
              <BookOpen size={14} /> NITYA KATHA PATH
            </span>
            <h1>{activeContent?.title || rawKatha?.title}</h1>
            <p>
              Pehle aaj ki pavitra katha ka adhyayan karein, fir prashno ka
              uttar dein.
            </p>
            {renderLanguagePills()}
          </header>

          <article className="katha-reading-card">
            {rawKatha?.mediaUrl && (
              <div className="katha-media-banner">
                <PlayCircle size={20} />
                <a href={rawKatha.mediaUrl} target="_blank" rel="noreferrer">
                  Audio / Video Recitation Sunne Ke Liye Yahan Click Karein
                </a>
              </div>
            )}

            <div className="katha-body-text">
              {(activeContent?.content || rawKatha?.content || "")
                .split("\n")
                .map((para, i) => {
                  const trimmed = para.trim();
                  if (!trimmed) return null;

                  // Render couplets or lines starting with quotes in a highlighted box
                  if (
                    trimmed.startsWith('"') ||
                    trimmed.startsWith("“") ||
                    trimmed.includes("॥")
                  ) {
                    return (
                      <div key={i} className="katha-verse-box">
                        {trimmed}
                      </div>
                    );
                  }

                  return <p key={i}>{trimmed}</p>;
                })}
            </div>

            <div className="katha-footer-action">
              <div className="katha-instruction">
                <HelpCircle size={18} color="#8c5825" />
                <span>
                  Katha par aadharit {questions.length} prashna taiyar hain
                  (Total 100 Pts). Keval 1 attempt uplabdh hai.
                </span>
              </div>
              <button
                type="button"
                className="start-quiz-btn"
                onClick={() => {
                  setQuizStartTime(Date.now());
                  setElapsedSeconds(0);
                  setFlowState("quiz");
                }}
              >
                <span>Prashnotari (Quiz) Shuru Karein</span>
                <ArrowRight size={18} />
              </button>
            </div>
          </article>
        </div>
      </div>
    );
  }

  // 4. QUIZ PHASE
  return (
    <div className="quiz-page">
      {renderLeaveModal()}
      <div className="quiz-container">
        <header className="quiz-header">
          <span className="quiz-badge">
            <Sparkles size={14} /> KATHA PRASHNOTARI ({questions.length}{" "}
            PRASHNA)
          </span>
          <h1>{activeContent?.title || rawKatha?.title}</h1>
          {renderLanguagePills()}
        </header>

        <div className="quiz-stepper-box">
          <div className="quiz-meta-strip">
            <div
              className="quiz-name-inline"
              style={{
                display: "flex",
                gap: "10px",
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <User size={16} />
              <span className="quiz-logged-name">{userName}</span>
              <span className="attempt-pill">Attempt 1 of 1</span>

              {/* LIVE REAL-TIME RUNNING STOPWATCH */}
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  background: "#fff8e6",
                  color: "#8c5825",
                  border: "1px solid #d4af37",
                  padding: "3px 10px",
                  borderRadius: "999px",
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  boxShadow: "0 2px 6px rgba(212, 175, 55, 0.15)",
                }}
              >
                <Clock size={13} color="#b85b00" />
                <span>{formatTimerClock(elapsedSeconds)}</span>
              </span>
            </div>

            <div className="quiz-step-indicators">
              {questions.map((q, idx) => {
                const isAnswered = userAnswers[idx] !== undefined;
                const isCurrent = idx === currentStep;
                return (
                  <button
                    type="button"
                    key={q._id || idx}
                    onClick={() => setCurrentStep(idx)}
                    className={`step-pill ${isCurrent ? "current" : ""} ${isAnswered ? "done" : ""}`}
                    title={`Prashna ${idx + 1}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="quiz-stepper-bar-bg">
            <div
              className="quiz-stepper-bar-fill"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>

          <article className="quiz-card single-question-card">
            <div className="question-header">
              <span className="question-pill">
                Prashna {currentStep + 1} of {questions.length}
              </span>
              <span className="points-pill">≈ {pointsPerQuestion} Points</span>
            </div>

            <h2 className="question-title">{currentQ?.question}</h2>

            <div className="options-grid">
              {currentQ?.options?.map((optionText, optIdx) => {
                const isChecked = userAnswers[currentStep] === optIdx;
                const letter = String.fromCharCode(65 + optIdx);
                return (
                  <div
                    key={optIdx}
                    onClick={() => handleOptionSelect(optIdx)}
                    className={`option-card ${isChecked ? "option-checked" : ""}`}
                  >
                    <span className="option-letter-badge">{letter}</span>
                    <span className="option-label-text">{optionText}</span>
                    {isChecked && (
                      <CheckCircle2 size={20} className="option-check-icon" />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="quiz-card-footer">
              <button
                type="button"
                onClick={handlePrev}
                disabled={currentStep === 0}
                className="step-btn prev-btn"
              >
                <ArrowLeft size={16} />
                <span>Previous</span>
              </button>

              <button
                type="button"
                onClick={handleNext}
                disabled={submitting}
                className="step-btn next-btn"
              >
                <span>
                  {isLastQuestion
                    ? submitting
                      ? "Submitting..."
                      : "Submit Answers (100 Pts)"
                    : "Next Question"}
                </span>
                <ArrowRight size={16} />
              </button>
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}

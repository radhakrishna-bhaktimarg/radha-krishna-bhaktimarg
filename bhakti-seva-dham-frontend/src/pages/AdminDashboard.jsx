import React, { useState, useEffect } from "react";
import {
  Calendar,
  BookOpen,
  Video,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  WalletCards,
  Check,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { API_BASE_URL } from "../api/api";
import "./AdminDashboard.css";

export default function AdminDashboard() {
  const { devotee } = useAuth();
  const [activeTab, setActiveTab] = useState("katha"); // 'katha' | 'bhajans'

  const todayStr = new Date().toISOString().split("T")[0];
  const maxDateObj = new Date();
  maxDateObj.setDate(maxDateObj.getDate() + 30);
  const maxDateStr = maxDateObj.toISOString().split("T")[0];

  // ---------------- KATHA STATE ----------------
  const [scheduledDate, setScheduledDate] = useState(todayStr);
  const [kathaTitle, setKathaTitle] = useState("");
  const [kathaContent, setKathaContent] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");

  const [questions, setQuestions] = useState(
    Array.from({ length: 5 }, () => ({
      question: "",
      options: ["", "", "", ""],
      correctIndex: 0,
      explanation: "",
    })),
  );

  const [kathaSubmitting, setKathaSubmitting] = useState(false);
  const [kathaMsg, setKathaMsg] = useState({ type: "", text: "" });

  // ---------------- BHAJAN STATE ----------------
  const [bhajans, setBhajans] = useState([]);
  const [videoTitle, setVideoTitle] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [videoCategory, setVideoCategory] = useState("Bhajan");
  const [bhajanSubmitting, setBhajanSubmitting] = useState(false);
  const [bhajanMsg, setBhajanMsg] = useState({ type: "", text: "" });
  const [pendingTransactions, setPendingTransactions] = useState([]);
  const [sevaLoading, setSevaLoading] = useState(false);
  const [sevaMsg, setSevaMsg] = useState({ type: "", text: "" });
  const [sevaAnalytics, setSevaAnalytics] = useState(null);

  const getToken = () => {
    const storedUser = localStorage.getItem("bhakti_devotee");
    return devotee?.token || (storedUser ? JSON.parse(storedUser).token : null);
  };

  const fetchSevaAnalytics = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/seva/admin/analytics`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || "Seva analytics load nahi ho saka.");
      }
      setSevaAnalytics(data.analytics);
    } catch (err) {
      setSevaMsg({ type: "error", text: err.message });
    }
  };

  const fetchBhajans = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/bhajans?limit=500`);
      const data = await res.json();
      if (data.success) {
        setBhajans(data.bhajans || []);
      }
    } catch (err) {
      console.error("Failed to load bhajans:", err);
    }
  };

  useEffect(() => {
    fetchBhajans();
    fetchPendingTransactions();
    fetchSevaAnalytics();
  }, []);

  const fetchPendingTransactions = async () => {
    try {
      setSevaLoading(true);
      const res = await fetch(`${API_BASE_URL}/seva/admin/pending`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || "Pending payments load nahi ho sake.");
      }
      setPendingTransactions(data.transactions || []);
    } catch (err) {
      setSevaMsg({ type: "error", text: err.message });
    } finally {
      setSevaLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "seva") {
      fetchPendingTransactions();
    }
  }, [activeTab]);

  const handleSevaVerification = async (transactionId, action) => {
    try {
      setSevaMsg({ type: "", text: "" });
      const res = await fetch(
        `${API_BASE_URL}/seva/admin/verify/${transactionId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify({ action }),
        },
      );
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || "Transaction update nahi ho saka.");
      }
      setSevaMsg({ type: "success", text: data.message });
      fetchPendingTransactions();
      fetchSevaAnalytics();
    } catch (err) {
      setSevaMsg({ type: "error", text: err.message });
    }
  };

  // ---------------- DYNAMIC QUESTION HANDLERS ----------------
  const handleAddQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      {
        question: "",
        options: ["", "", "", ""],
        correctIndex: 0,
        explanation: "",
      },
    ]);
  };

  const handleRemoveQuestion = (indexToRemove) => {
    if (questions.length <= 1) {
      alert("Kam se kam ek (1) prashna hona zaroori hai!");
      return;
    }
    setQuestions((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleQuestionTextChange = (qIndex, text) => {
    const updated = [...questions];
    updated[qIndex].question = text;
    setQuestions(updated);
  };

  const handleOptionChange = (qIndex, optIndex, val) => {
    const updated = [...questions];
    updated[qIndex].options[optIndex] = val;
    setQuestions(updated);
  };

  const handleCorrectIndexChange = (qIndex, val) => {
    const updated = [...questions];
    updated[qIndex].correctIndex = Number(val);
    setQuestions(updated);
  };

  const handleExplanationChange = (qIndex, val) => {
    const updated = [...questions];
    updated[qIndex].explanation = val;
    setQuestions(updated);
  };

  const handleKathaSubmit = async (e) => {
    e.preventDefault();
    setKathaMsg({ type: "", text: "" });

    if (questions.length === 0) {
      setKathaMsg({
        type: "error",
        text: "Kam se kam 1 prashna hona anivarya hai!",
      });
      return;
    }

    for (let i = 0; i < questions.length; i++) {
      if (!questions[i].question.trim()) {
        setKathaMsg({
          type: "error",
          text: `Prashna #${i + 1} ka prashna text khali hai!`,
        });
        return;
      }
      for (let j = 0; j < 4; j++) {
        if (!questions[i].options[j].trim()) {
          setKathaMsg({
            type: "error",
            text: `Prashna #${i + 1} ka Vikalp ${String.fromCharCode(65 + j)} khali hai!`,
          });
          return;
        }
      }
    }

    try {
      setKathaSubmitting(true);
      const res = await fetch(`${API_BASE_URL}/quiz/admin/katha`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          title: kathaTitle,
          content: kathaContent,
          mediaUrl,
          scheduledDate,
          questions,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setKathaMsg({
          type: "success",
          text: `Katha aur ${questions.length} prashna din ${scheduledDate} ke liye schedule ho gaye (Total: 100 Pts)!`,
        });
      } else {
        setKathaMsg({
          type: "error",
          text: data.message || "Katha schedule karne me truti aayi.",
        });
      }
    } catch (err) {
      setKathaMsg({
        type: "error",
        text: "Server se sampark nahi ho saka.",
      });
    } finally {
      setKathaSubmitting(false);
    }
  };

  // ---------------- BHAJAN HANDLERS ----------------
  const handleAddBhajan = async (e) => {
    e.preventDefault();
    setBhajanMsg({ type: "", text: "" });

    if (bhajans.length >= 500) {
      setBhajanMsg({
        type: "error",
        text: "Adhiktam 500 videos ki seema poori ho chuki hai. Pehle ek delete karein.",
      });
      return;
    }

    try {
      setBhajanSubmitting(true);
      const res = await fetch(`${API_BASE_URL}/bhajans/admin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          title: videoTitle,
          youtubeUrl,
          category: videoCategory,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setBhajanMsg({ type: "success", text: "Video safalpurvak jud gaya!" });
        setVideoTitle("");
        setYoutubeUrl("");
        fetchBhajans();
      } else {
        setBhajanMsg({
          type: "error",
          text: data.message || "Video jodne me samasya aayi.",
        });
      }
    } catch (err) {
      setBhajanMsg({ type: "error", text: "Server se sampark nahi ho saka." });
    } finally {
      setBhajanSubmitting(false);
    }
  };

  const handleDeleteBhajan = async (id) => {
    if (!window.confirm("Kya aap sach me ye video hatana chahte hain?")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/bhajans/admin/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        setBhajanMsg({
          type: "success",
          text: "Video safalta purvak hataya gaya!",
        });
        fetchBhajans();
      } else {
        alert(data.message || "Video delete karne me samasya aayi.");
      }
    } catch (err) {
      alert("Server error");
    }
  };

  const pointsPerQuestion =
    questions.length > 0 ? (100 / questions.length).toFixed(1) : 0;

  return (
    <div className="admin-page">
      <div className="admin-container">
        <header className="admin-header">
          <span className="admin-badge">
            <Sparkles size={13} /> ONLINE SEVA ADMIN
          </span>
          <h1>Admin Management Console</h1>
          <p>
            Nitya Katha, Dynamic Prashna Quiz aur Bhajans/Mantras video pipeline
            yahan se sanchalit karein.
          </p>

          <div className="admin-tabs">
            <button
              type="button"
              className={`admin-tab-btn ${activeTab === "katha" ? "active" : ""}`}
              onClick={() => setActiveTab("katha")}
            >
              <BookOpen size={15} />
              <span>Nitya Katha &amp; Quiz ({questions.length} Prashna)</span>
            </button>
            <button
              type="button"
              className={`admin-tab-btn ${activeTab === "bhajans" ? "active" : ""}`}
              onClick={() => setActiveTab("bhajans")}
            >
              <Video size={15} />
              <span>Bhajans &amp; Mantras ({bhajans.length}/500)</span>
            </button>
            <button
              type="button"
              className={`admin-tab-btn ${activeTab === "seva" ? "active" : ""}`}
              onClick={() => setActiveTab("seva")}
            >
              <WalletCards size={15} />
              <span>Pending Seva ({pendingTransactions.length})</span>
            </button>
          </div>

        </header>

        {/* ----------------- TAB 1: KATHA & QUESTIONS ----------------- */}
        {activeTab === "katha" && (
          <form onSubmit={handleKathaSubmit} className="admin-form-card">
            <div className="section-title-strip">
              <h2>Schedule Daily Katha &amp; Prashnotari</h2>
              <span className="info-chip">
                Advance scheduling: Agle 30 dino tak uplabdh
              </span>
            </div>

            {kathaMsg.text && (
              <div
                className={`admin-alert ${kathaMsg.type === "error" ? "alert-error" : "alert-success"}`}
              >
                {kathaMsg.type === "error" ? (
                  <AlertCircle size={18} />
                ) : (
                  <CheckCircle2 size={18} />
                )}
                <span>{kathaMsg.text}</span>
              </div>
            )}

            <div className="form-grid-top">
              <div className="form-group">
                <label>
                  <Calendar size={15} /> Scheduled Date
                </label>
                <input
                  type="date"
                  value={scheduledDate}
                  min={todayStr}
                  max={maxDateStr}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Katha Ka Shirshak (Title)</label>
                <input
                  type="text"
                  placeholder="Jaise: Shri Radha Raman Ji Ke Prakatya Ki Katha"
                  value={kathaTitle}
                  onChange={(e) => setKathaTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-group full-width">
                <label>Media / Audio Recitation Link (Optional)</label>
                <input
                  type="url"
                  placeholder="https://... (SoundCloud, Drive ya YouTube recitation audio link)"
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                />
              </div>

              <div className="form-group full-width">
                <label>Pavitra Katha Path (Story Text)</label>
                <textarea
                  rows={5}
                  placeholder="Katha ka purna vivaran yahan darj karein jise bhakt padhenge..."
                  value={kathaContent}
                  onChange={(e) => setKathaContent(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Questions Header Strip */}
            <div className="questions-builder-strip">
              <div className="q-strip-content">
                <div>
                  <h3>
                    <HelpCircle size={17} /> Katha Prashnotari (
                    {questions.length} Prashna)
                  </h3>
                  <p>
                    Har prashna ≈ <strong>{pointsPerQuestion} Pts</strong>{" "}
                    (Total Normalized: 100 Pts).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddQuestion}
                  className="add-q-btn"
                >
                  <Plus size={15} /> Naya Prashna Jodein
                </button>
              </div>
            </div>

            {/* Question Cards Stack */}
            <div className="questions-stack">
              {questions.map((q, qIdx) => (
                <div key={qIdx} className="question-admin-card">
                  <div className="q-card-header">
                    <span className="q-badge">Prashna #{qIdx + 1}</span>
                    <div className="q-header-right">
                      <span className="q-points">
                        ≈ {pointsPerQuestion} Pts
                      </span>
                      {questions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveQuestion(qIdx)}
                          className="q-delete-btn"
                          title="Is prashna ko hatayein"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  <input
                    type="text"
                    className="q-input-title"
                    placeholder={`Prashna #${qIdx + 1} ka text likhein...`}
                    value={q.question}
                    onChange={(e) =>
                      handleQuestionTextChange(qIdx, e.target.value)
                    }
                    required
                  />

                  <div className="options-admin-grid">
                    {q.options.map((opt, optIdx) => {
                      const letter = String.fromCharCode(65 + optIdx);
                      return (
                        <div key={optIdx} className="opt-admin-field">
                          <span className="opt-letter">{letter}</span>
                          <input
                            type="text"
                            placeholder={`Vikalp ${letter}`}
                            value={opt}
                            onChange={(e) =>
                              handleOptionChange(qIdx, optIdx, e.target.value)
                            }
                            required
                          />
                        </div>
                      );
                    })}
                  </div>

                  <div className="correct-answer-row">
                    <label>Sahi Uttar:</label>
                    <select
                      value={q.correctIndex}
                      onChange={(e) =>
                        handleCorrectIndexChange(qIdx, e.target.value)
                      }
                    >
                      <option value={0}>Option A</option>
                      <option value={1}>Option B</option>
                      <option value={2}>Option C</option>
                      <option value={3}>Option D</option>
                    </select>

                    <input
                      type="text"
                      className="explanation-input"
                      placeholder="Spashtikaran / Explanation (Optional)"
                      value={q.explanation}
                      onChange={(e) =>
                        handleExplanationChange(qIdx, e.target.value)
                      }
                    />
                  </div>
                </div>
              ))}
            </div>

            <button
              type="submit"
              disabled={kathaSubmitting}
              className="admin-submit-btn"
            >
              <Save size={18} />
              <span>
                {kathaSubmitting
                  ? "Saving Katha..."
                  : `Save Daily Katha & ${questions.length} Questions (100 Pts)`}
              </span>
            </button>
          </form>
        )}

        {/* ----------------- TAB 2: BHAJANS & MANTRAS ----------------- */}
        {activeTab === "bhajans" && (
          <div className="admin-bhajan-section">
            <div className="admin-form-card">
              <div className="section-title-strip">
                <h2>Add YouTube Video (Max 500 Allowed)</h2>
                <span className="info-chip">
                  Current Videos: {bhajans.length} / 500
                </span>
              </div>

              {bhajanMsg.text && (
                <div
                  className={`admin-alert ${bhajanMsg.type === "error" ? "alert-error" : "alert-success"}`}
                >
                  {bhajanMsg.type === "error" ? (
                    <AlertCircle size={18} />
                  ) : (
                    <CheckCircle2 size={18} />
                  )}
                  <span>{bhajanMsg.text}</span>
                </div>
              )}

              <form onSubmit={handleAddBhajan} className="form-grid-top">
                <div className="form-group">
                  <label>Video Title</label>
                  <input
                    type="text"
                    placeholder="Jaise: Shri Radhe Govinda Dhun by Poojya Maharaj Ji"
                    value={videoTitle}
                    onChange={(e) => setVideoTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Category</label>
                  <select
                    value={videoCategory}
                    onChange={(e) => setVideoCategory(e.target.value)}
                  >
                    <option value="Bhajan">Bhajan</option>
                    <option value="Mantra">Mantra</option>
                    <option value="Namavali">Namavali</option>
                    <option value="Aarti">Aarti</option>
                    <option value="Kirtan">Kirtan</option>
                  </select>
                </div>

                <div className="form-group full-width">
                  <label>YouTube Link (Watch or Short URL)</label>
                  <input
                    type="url"
                    placeholder="https://www.youtube.com/watch?v=... ya https://youtu.be/..."
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    required
                  />
                </div>

                <div
                  className="form-group full-width"
                  style={{ marginTop: "6px" }}
                >
                  <button
                    type="submit"
                    disabled={bhajanSubmitting || bhajans.length >= 500}
                    className="admin-submit-btn"
                  >
                    <Plus size={18} />
                    <span>
                      {bhajanSubmitting
                        ? "Adding Video..."
                        : "Add YouTube Video"}
                    </span>
                  </button>
                </div>
              </form>
            </div>

            {/* List of Active Videos */}
            <div className="admin-bhajan-list-card">
              <h3>Active Video Gallery ({bhajans.length}/500)</h3>
              {bhajans.length === 0 ? (
                <p
                  style={{
                    color: "#7a5832",
                    textAlign: "center",
                    padding: "16px 0",
                    fontSize: "0.92rem",
                  }}
                >
                  Abhi koi video add nahi kiya gaya hai.
                </p>
              ) : (
                <div className="admin-video-table">
                  {bhajans.map((v, idx) => (
                    <div key={v._id} className="admin-video-row">
                      <span className="v-idx">#{idx + 1}</span>
                      <img
                        src={v.thumbnailUrl}
                        alt={v.title}
                        className="v-thumb"
                      />
                      <div className="v-info">
                        <strong>{v.title}</strong>
                        <span className="v-badge">{v.category}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteBhajan(v._id)}
                        className="v-delete-btn"
                        title="Delete video"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

            </div>
          </div>
        )}

        {activeTab === "seva" && (
          <div className="admin-seva-section">
            <div className="admin-form-card">
              <div className="section-title-strip">
                <h2>Pending Seva Payments</h2>
                <button
                  type="button"
                  className="seva-refresh-btn"
                  onClick={fetchPendingTransactions}
                  disabled={sevaLoading}
                >
                  Refresh
                </button>
              </div>

              {sevaAnalytics && (
                <div className="seva-analytics-grid">
                  <div className="seva-analytics-card pending">
                    <span>Pending Requests</span>
                    <strong>{sevaAnalytics.pending.count}</strong>
                    <small>₹{sevaAnalytics.pending.amount}</small>
                  </div>
                  <div className="seva-analytics-card verified">
                    <span>Accepted Payments</span>
                    <strong>{sevaAnalytics.verified.count}</strong>
                    <small>₹{sevaAnalytics.verified.amount}</small>
                  </div>
                  <div className="seva-analytics-card rejected">
                    <span>Rejected Requests</span>
                    <strong>{sevaAnalytics.rejected.count}</strong>
                    <small>₹{sevaAnalytics.rejected.amount}</small>
                  </div>
                </div>
              )}

              {sevaMsg.text && (
                <div
                  className={`admin-alert ${sevaMsg.type === "error" ? "alert-error" : "alert-success"}`}
                >
                  {sevaMsg.type === "error" ? (
                    <AlertCircle size={18} />
                  ) : (
                    <CheckCircle2 size={18} />
                  )}
                  <span>{sevaMsg.text}</span>
                </div>
              )}

              {sevaLoading ? (
                <p className="seva-empty-state">Loading pending payments...</p>
              ) : pendingTransactions.length === 0 ? (
                <p className="seva-empty-state">
                  No pending payment requests.
                </p>
              ) : (
                <div className="seva-request-list">
                  {pendingTransactions.map((transaction) => (
                    <div className="seva-request-card" key={transaction._id}>
                      <div className="seva-request-details">
                        <strong>{transaction.devoteeName}</strong>
                        <span>Amount: ₹{transaction.amount}</span>
                        <span>UTR: {transaction.utrNumber}</span>
                        <small>
                          Submitted{" "}
                          {new Date(transaction.createdAt).toLocaleString()}
                        </small>
                      </div>
                      <div className="seva-request-actions">
                        <button
                          type="button"
                          className="seva-approve-btn"
                          onClick={() =>
                            handleSevaVerification(transaction._id, "approve")
                          }
                        >
                          <Check size={15} /> Verify
                        </button>
                        <button
                          type="button"
                          className="seva-reject-btn"
                          onClick={() =>
                            handleSevaVerification(transaction._id, "reject")
                          }
                        >
                          <X size={15} /> Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

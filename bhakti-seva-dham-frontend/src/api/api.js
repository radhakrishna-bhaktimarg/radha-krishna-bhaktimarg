// src/services/api.js

// Use configured backend locally, but never allow localhost configuration in production.
const configuredBackendUrl =
  import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL;
const productionBackendUrl =
  "https://radha-krishna-bhaktimarg-s3vn.vercel.app";
const configuredIsLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(
  configuredBackendUrl || "",
);
const BACKEND_URL = (
  import.meta.env.DEV && configuredBackendUrl
    ? configuredBackendUrl
    : configuredBackendUrl && !configuredIsLocalhost
      ? configuredBackendUrl
      : productionBackendUrl
)
  .replace(/\/+$/, "")
  .replace(/\/api$/, "");
export const API_BASE_URL = `${BACKEND_URL}/api`;

// Helper to retrieve auth headers with Bearer token
const getAuthHeaders = () => {
  const saved = localStorage.getItem("bhakti_devotee");
  let token = null;

  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      token = parsed?.token;
    } catch {
      token = null;
    }
  }

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const authAPI = {
  register: async (userData) => {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
    });
    return res.json();
  },
  login: async (credentials) => {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
    });
    return res.json();
  },
};

export const quizAPI = {
  submitScore: async (score) => {
    const res = await fetch(`${API_BASE_URL}/quiz/submit`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ score }),
    });
    return res.json();
  },
};

export const japAPI = {
  syncSadhana: async (completedMalas, lifetimeJap) => {
    const res = await fetch(`${API_BASE_URL}/jap/sync`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ completedMalas, lifetimeJap }),
    });
    return res.json();
  },
};

export const leaderboardAPI = {
  getLeaderboard: async (filter = "all") => {
    const res = await fetch(`${API_BASE_URL}/leaderboard?filter=${filter}`);
    return res.json();
  },
};

export const sevaAPI = {
  recordPledge: async (amount, utrNumber = "") => {
    const res = await fetch(`${API_BASE_URL}/seva/pledge`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ amount, utrNumber }),
    });
    return res.json();
  },
};

export const profileAPI = {
  getProfile: async () => {
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      method: "GET",
      headers: getAuthHeaders(),
    });
    return res.json();
  },
};

export const adminAPI = {
  getStats: async () => {
    const res = await fetch(`${API_BASE_URL}/admin/stats`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },
  getDevotees: async () => {
    const res = await fetch(`${API_BASE_URL}/admin/devotees`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },
  addQuestion: async (questionData) => {
    const res = await fetch(`${API_BASE_URL}/admin/questions`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(questionData),
    });
    return res.json();
  },
};

const express = require("express");
const router = express.Router();
const Bhajan = require("../models/Bhajan");
const { protect, adminOnly } = require("../middleware/authMiddleware");

// Helper to extract clean YouTube ID
const extractYouTubeId = (url) => {
  if (!url || typeof url !== "string") return null;

  try {
    const parsedUrl = new URL(url.trim());
    const hostname = parsedUrl.hostname.toLowerCase().replace(/^www\./, "");

    if (hostname === "youtu.be") {
      return parsedUrl.pathname.slice(1).match(/^[\w-]{11}$/)?.[0] || null;
    }

    if (hostname !== "youtube.com" && hostname !== "m.youtube.com") {
      return null;
    }

    const pathParts = parsedUrl.pathname.split("/").filter(Boolean);
    const pathId =
      pathParts[0] === "embed" ||
      pathParts[0] === "v" ||
      pathParts[0] === "live" ||
      pathParts[0] === "shorts"
        ? pathParts[1]
        : parsedUrl.searchParams.get("v");

    return pathId?.match(/^[\w-]{11}$/)?.[0] || null;
  } catch {
    return null;
  }
};

// @route   GET /api/bhajans
// @desc    Get all active bhajans and mantras
router.get("/", async (req, res) => {
  try {
    const category = req.query.category;
    const query = category && category !== "All" ? { category } : {};
    const bhajans = await Bhajan.find(query).sort({ createdAt: -1 }).lean();

    res.json({
      success: true,
      bhajans,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/bhajans/admin
// @desc    Admin: Add a new Bhajan/Mantra YouTube video
router.post("/admin", protect, adminOnly, async (req, res) => {
  try {
    const { title, youtubeUrl, category, description } = req.body;

    if (!title || !youtubeUrl) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Title aur YouTube URL anivarya hain.",
        });
    }

    const youtubeId = extractYouTubeId(youtubeUrl);
    if (!youtubeId) {
      return res.status(400).json({
        success: false,
        message: "Kripya ek manya (valid) YouTube URL darj karein.",
      });
    }

    const thumbnailUrl = `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;

    const newBhajan = await Bhajan.create({
      title,
      youtubeUrl,
      youtubeId,
      thumbnailUrl,
      category: category || "Bhajan",
      description: description || "",
    });

    res.status(201).json({
      success: true,
      message: "Bhajan / Mantra safalta purvak joda gaya!",
      bhajan: newBhajan,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   DELETE /api/bhajans/admin/:id
// @desc    Admin: Remove a video
router.delete("/admin/:id", protect, adminOnly, async (req, res) => {
  try {
    await Bhajan.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Video safalta purvak hataya gaya!" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;

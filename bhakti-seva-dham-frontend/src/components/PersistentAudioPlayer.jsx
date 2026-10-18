import React, { useEffect, useState } from "react";
import {
  Headphones,
  Pause,
  Play,
  Repeat,
  Shuffle,
  SkipBack,
  SkipForward,
  X,
} from "lucide-react";
import { useAudioPlayer } from "../context/AudioPlayerContext";
import "../pages/Bhajans.css";

export default function PersistentAudioPlayer() {
  const {
    currentItem,
    playlist,
    playbackMode,
    isPlaying,
    play,
    pause,
    setPlaybackMode,
    playNext,
    playPrevious,
    stop,
  } = useAudioPlayer();
  const [resumeKey, setResumeKey] = useState(0);

  useEffect(() => {
    if (!currentItem || !("mediaSession" in navigator)) return undefined;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentItem.title,
      artist: "Radha Krishna Bhaktimarg",
      album: "Bhajans & Mantras",
      artwork: currentItem.thumbnailUrl
        ? [{ src: currentItem.thumbnailUrl, sizes: "512x512" }]
        : [],
    });
    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
    ["play", "pause", "nexttrack", "previoustrack", "stop"].forEach((action) => {
      try {
        navigator.mediaSession.setActionHandler(
          action,
          action === "play"
            ? play
            : action === "pause"
              ? pause
              : action === "nexttrack"
            ? playNext
            : action === "previoustrack"
              ? playPrevious
              : stop,
        );
      } catch {
        // Media-session actions vary by browser and operating system.
      }
    });

    return () => {
      navigator.mediaSession.metadata = null;
      ["play", "pause", "nexttrack", "previoustrack", "stop"].forEach((action) => {
        try {
          navigator.mediaSession.setActionHandler(action, null);
        } catch {
          // Some browsers do not support clearing every action handler.
        }
      });
    };
  }, [currentItem, isPlaying, pause, play, playNext, playPrevious, stop]);

  useEffect(() => {
    if (!currentItem) return undefined;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && isPlaying) {
        setResumeKey((key) => key + 1);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [currentItem, isPlaying]);

  if (!currentItem) return null;

  const getAudioEmbedUrl = () => {
    const base = `https://www.youtube.com/embed/${currentItem.youtubeId}?autoplay=1&rel=0`;
    return playbackMode === "loop-one"
      ? `${base}&loop=1&playlist=${currentItem.youtubeId}`
      : base;
  };

  return (
    <aside className="mini-audio-bar" aria-label="Background audio player">
      <div className="mini-audio-left">
        <img
          src={currentItem.thumbnailUrl}
          alt=""
          className="mini-audio-thumb"
        />
        <Headphones size={15} color="#5c141d" />
        <span className="mini-audio-title">{currentItem.title}</span>
      </div>

      <div className="mini-audio-right">
        {playlist.length > 1 && (
          <button
            type="button"
            className="btn-mini-control"
            onClick={playPrevious}
            title="Previous"
            aria-label="Previous"
          >
            <SkipBack size={14} />
          </button>
        )}
        <button
          type="button"
          className="btn-mini-control"
          onClick={isPlaying ? pause : play}
          title={isPlaying ? "Pause audio" : "Start audio"}
          aria-label={isPlaying ? "Pause audio" : "Start audio"}
        >
          {isPlaying ? <Pause size={14} /> : <Play size={14} fill="currentColor" />}
        </button>
        {playlist.length > 1 && (
          <button
            type="button"
            className="btn-mini-control"
            onClick={playNext}
            title="Next"
            aria-label="Next"
          >
            <SkipForward size={14} />
          </button>
        )}
        <button
          type="button"
          className="mini-audio-mode"
          onClick={() =>
            setPlaybackMode((mode) =>
              mode === "loop-one" ? "auto-next" : "loop-one",
            )
          }
          title={playbackMode === "loop-one" ? "Repeat 1" : "Cycle"}
        >
          {playbackMode === "loop-one" ? (
            <><Repeat size={11} /><span>Repeat 1</span></>
          ) : (
            <><Shuffle size={11} /><span>Cycle</span></>
          )}
        </button>
        <button
          type="button"
          className="mini-audio-stop"
          onClick={stop}
          title="Stop audio"
        >
          Stop
        </button>
        <button
          type="button"
          className="btn-mini-close"
          onClick={stop}
          title="Stop audio"
          aria-label="Stop audio"
        >
          <X size={16} />
        </button>
      </div>

      {isPlaying && (
        <iframe
          key={`${currentItem.youtubeId}-${playbackMode}-${isPlaying}-${resumeKey}`}
          src={getAudioEmbedUrl()}
          title="Background Audio"
          allow="autoplay"
          style={{
            position: "absolute",
            width: "1px",
            height: "1px",
            opacity: 0,
            pointerEvents: "none",
          }}
        />
      )}
    </aside>
  );
}

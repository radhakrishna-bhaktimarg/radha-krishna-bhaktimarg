import React, { useEffect, useRef, useState } from "react";
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
    setPlaying,
    play,
    pause,
    setPlaybackMode,
    playNext,
    playPrevious,
    stop,
  } = useAudioPlayer();
  const [resumeKey, setResumeKey] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const playerRef = useRef(null);
  const playerHostRef = useRef(null);
  const isPlayingRef = useRef(isPlaying);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    if (!currentItem) return undefined;

    let interval;
    let cancelled = false;
    const loadPlayerApi = () =>
      new Promise((resolve) => {
        if (window.YT?.Player) {
          resolve(window.YT);
          return;
        }
        const previousReady = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
          previousReady?.();
          resolve(window.YT);
        };
        if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
          const script = document.createElement("script");
          script.src = "https://www.youtube.com/iframe_api";
          document.body.appendChild(script);
        }
      });

    loadPlayerApi().then((YT) => {
      if (cancelled || !playerHostRef.current) return;
      playerRef.current = new YT.Player(playerHostRef.current, {
        videoId: currentItem.youtubeId,
        playerVars: {
          autoplay: isPlayingRef.current ? 1 : 0,
          controls: 0,
          loop: playbackMode === "loop-one" ? 1 : 0,
          playlist: playbackMode === "loop-one" ? currentItem.youtubeId : "",
          origin: window.location.origin,
        },
        events: {
          onReady: (event) => {
            setDuration(event.target.getDuration() || 0);
            if (isPlayingRef.current) event.target.playVideo();
          },
          onStateChange: (event) => {
            if (event.data === YT.PlayerState.PLAYING) setPlaying(true);
            if (event.data === YT.PlayerState.PAUSED) setPlaying(false);
          },
        },
      });
      interval = window.setInterval(() => {
        const player = playerRef.current;
        if (player?.getCurrentTime && player?.getDuration) {
          setCurrentTime(player.getCurrentTime() || 0);
          setDuration(player.getDuration() || 0);
        }
      }, 500);
    });

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      playerRef.current?.destroy?.();
      playerRef.current = null;
      setCurrentTime(0);
      setDuration(0);
    };
  }, [currentItem, playbackMode, resumeKey, setPlaying]);

  useEffect(() => {
    if (!playerRef.current) return;
    if (isPlaying) playerRef.current.playVideo?.();
    else playerRef.current.pauseVideo?.();
  }, [isPlaying]);

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

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60)
      .toString()
      .padStart(2, "0");
    return `${minutes}:${remainingSeconds}`;
  };

  const seekTo = (event) => {
    const nextTime = Number(event.target.value);
    setCurrentTime(nextTime);
    playerRef.current?.seekTo?.(nextTime, true);
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

      <div className="mini-audio-progress">
        <input
          type="range"
          min="0"
          max={duration || 0}
          step="1"
          value={Math.min(currentTime, duration || 0)}
          onChange={seekTo}
          aria-label="Song progress"
          disabled={!duration}
        />
        <span>
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
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
          className="btn-mini-close"
          onClick={stop}
          title="Stop audio"
          aria-label="Stop audio"
        >
          <X size={16} />
        </button>
      </div>

      <div
        ref={playerHostRef}
        className="youtube-audio-host"
        aria-hidden="true"
      />
    </aside>
  );
}

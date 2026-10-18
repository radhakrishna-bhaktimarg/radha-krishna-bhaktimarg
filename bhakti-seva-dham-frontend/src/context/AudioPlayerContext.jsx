import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

const AudioPlayerContext = createContext(null);

export function AudioPlayerProvider({ children }) {
  const [currentItem, setCurrentItem] = useState(null);
  const [playlist, setPlaylist] = useState([]);
  const [playbackMode, setPlaybackMode] = useState("loop-one");

  const playNext = useCallback(() => {
    if (!currentItem || playlist.length === 0) return;
    const index = playlist.findIndex((item) => item._id === currentItem._id);
    setCurrentItem(playlist[(index + 1) % playlist.length]);
  }, [currentItem, playlist]);

  const playPrevious = useCallback(() => {
    if (!currentItem || playlist.length === 0) return;
    const index = playlist.findIndex((item) => item._id === currentItem._id);
    setCurrentItem(
      playlist[(index - 1 + playlist.length) % playlist.length],
    );
  }, [currentItem, playlist]);

  const value = useMemo(
    () => ({
      currentItem,
      playlist,
      playbackMode,
      playItem: (item, items = playlist) => {
        setPlaylist(items);
        setCurrentItem(item);
      },
      stop: () => setCurrentItem(null),
      setPlaybackMode,
      playNext,
      playPrevious,
    }),
    [currentItem, playbackMode, playNext, playPrevious, playlist],
  );

  return (
    <AudioPlayerContext.Provider value={value}>
      {children}
    </AudioPlayerContext.Provider>
  );
}

export function useAudioPlayer() {
  const context = useContext(AudioPlayerContext);
  if (!context) {
    throw new Error("useAudioPlayer must be used inside AudioPlayerProvider");
  }
  return context;
}

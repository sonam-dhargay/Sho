import React, { useState, useEffect, useRef } from 'react';

interface Track {
  id: string;
  title: string;
  url: string;
  tibetanTitle: string;
}

const TRACKS: Track[] = [
  { 
    id: '1', 
    title: 'Himalayan Morning', 
    tibetanTitle: 'ཧི་མ་ལ་ཡའི་ཞོགས་པ།', 
    url: 'https://cdn.pixabay.com/audio/2021/11/25/audio_10681127d1.mp3' 
  },
  { 
    id: '2', 
    title: 'Spirit of Tibet', 
    tibetanTitle: 'བོད་ཀྱི་བླ་སྲོག', 
    url: 'https://cdn.pixabay.com/audio/2022/03/10/audio_f54787a276.mp3' 
  },
  { 
    id: '3', 
    title: 'Temple Bells', 
    tibetanTitle: 'ལྷ་ཁང་གི་དྲིལ་བུ།', 
    url: 'https://cdn.pixabay.com/audio/2021/11/23/audio_31743c58bc.mp3' 
  }
];

interface MusicPlayerProps {
  isEnabled: boolean;
  onToggle: () => void;
}

export const MusicPlayer: React.FC<MusicPlayerProps> = ({ isEnabled, onToggle }) => {
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [volume, setVolume] = useState(0.5);
  const [showTracklist, setShowTracklist] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playCurrentTrack = async () => {
    if (!audioRef.current) return;
    try {
      setError(null);
      await audioRef.current.play();
    } catch (err) {
      console.warn("Autoplay/Play blocked or failed:", err);
      setError("Playback failed");
    }
  };

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio(TRACKS[currentTrackIndex].url);
      audioRef.current.loop = true;
      audioRef.current.crossOrigin = "anonymous";
    }

    const audio = audioRef.current;
    audio.volume = volume;

    const handleError = (e: any) => {
      console.error("Audio playback error:", e);
      setError("Failed to load audio");
    };

    audio.addEventListener('error', handleError);

    if (isEnabled) {
      playCurrentTrack();
    } else {
      audio.pause();
    }

    return () => {
      audio.removeEventListener('error', handleError);
      audio.pause();
    };
  }, [isEnabled]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.src = TRACKS[currentTrackIndex].url;
      audioRef.current.load();
      if (isEnabled) {
        playCurrentTrack();
      }
    }
  }, [currentTrackIndex]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const nextTrack = () => setCurrentTrackIndex((prev) => (prev + 1) % TRACKS.length);
  const prevTrack = () => setCurrentTrackIndex((prev) => (prev - 1 + TRACKS.length) % TRACKS.length);

  return (
    <div className="bg-stone-900 border border-stone-800 rounded-lg p-2 md:p-3 flex flex-col gap-2 shadow-2xl">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 overflow-hidden flex-grow">
          <button 
            onClick={onToggle}
            className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all ${isEnabled ? 'bg-amber-600 text-white animate-pulse' : 'bg-stone-800 text-stone-500'}`}
          >
            {isEnabled ? '⏸' : '▶'}
          </button>
          <div className="flex flex-col truncate">
            <span className={`text-[9px] md:text-[11px] font-bold truncate leading-none ${error ? 'text-red-500' : 'text-amber-500'}`}>
              {error ? 'Load Error' : TRACKS[currentTrackIndex].title}
            </span>
            <span className="hidden md:block text-[9px] text-stone-600 font-serif truncate mt-1">
              {error ? 'Try another track' : TRACKS[currentTrackIndex].tibetanTitle}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={prevTrack} className="text-stone-600 hover:text-amber-500 text-xs">⏮</button>
          <button onClick={nextTrack} className="text-stone-600 hover:text-amber-500 text-xs">⏭</button>
          <button 
            onClick={() => setShowTracklist(!showTracklist)}
            className={`w-5 h-5 rounded flex items-center justify-center text-[10px] transition-colors ${showTracklist ? 'bg-amber-800/30 text-amber-400' : 'text-stone-500 hover:text-amber-500'}`}
          >
            ☰
          </button>
        </div>
      </div>

      {showTracklist && (
        <div className="flex flex-col gap-1 border-t border-stone-800 pt-2 max-h-24 overflow-y-auto no-scrollbar">
          {TRACKS.map((track, idx) => (
            <button
              key={track.id}
              onClick={() => { setCurrentTrackIndex(idx); setShowTracklist(false); if(!isEnabled) onToggle(); }}
              className={`text-left px-2 py-1 rounded text-[10px] transition-all truncate ${currentTrackIndex === idx ? 'bg-amber-900/40 text-amber-400' : 'text-stone-600 hover:bg-stone-800 hover:text-stone-300'}`}
            >
              {idx + 1}. {track.title}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 border-t border-stone-800/30 pt-2">
        <span className="text-[10px] text-stone-700">🔈</span>
        <input 
          type="range" 
          min="0" 
          max="1" 
          step="0.05" 
          value={volume} 
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          className="flex-grow h-1 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-amber-600"
        />
        <span className="text-[10px] text-stone-700">🔊</span>
      </div>
      
      {error && !showTracklist && (
        <button 
          onClick={() => { setError(null); audioRef.current?.load(); if(isEnabled) playCurrentTrack(); }}
          className="text-[8px] uppercase font-bold text-amber-600 hover:text-amber-400 text-center mt-1"
        >
          Retry Connection
        </button>
      )}
    </div>
  );
};

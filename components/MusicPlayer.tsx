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
    url: 'https://cdn.pixabay.com/audio/2022/10/16/audio_10681127d1.mp3' 
  },
  { 
    id: '2', 
    title: 'Spirit of Tibet', 
    tibetanTitle: 'བོད་ཀྱི་བླ་སྲོག', 
    url: 'https://cdn.pixabay.com/audio/2023/11/21/audio_404787a276.mp3' 
  },
  { 
    id: '3', 
    title: 'Temple Bells', 
    tibetanTitle: 'ལྷ་ཁང་གི་དྲིལ་བུ།', 
    url: 'https://cdn.pixabay.com/audio/2022/01/21/audio_31743c58bc.mp3' 
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

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio(TRACKS[currentTrackIndex].url);
      audioRef.current.loop = true;
    }

    const audio = audioRef.current;
    audio.volume = volume;

    const handleError = () => {
      console.error("Audio playback error");
      setError("Failed to load audio");
      if (isEnabled) onToggle();
    };

    audio.addEventListener('error', handleError);

    if (isEnabled) {
      setError(null);
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn("Autoplay/Play blocked or failed:", err);
          if (isEnabled) onToggle(); 
        });
      }
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
      setError(null);
      if (isEnabled) {
        audioRef.current.play().catch(err => {
          console.error("Error switching track:", err);
        });
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
    <div className="bg-stone-900/90 border border-stone-800 rounded-lg p-1 md:p-3 flex flex-col gap-1 shadow-2xl backdrop-blur-md">
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1 overflow-hidden flex-grow">
          <button 
            onClick={onToggle}
            className={`flex-shrink-0 w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center transition-all ${isEnabled ? 'bg-amber-600 text-white animate-pulse shadow-[0_0_10px_rgba(217,119,6,0.5)]' : 'bg-stone-800 text-stone-500'}`}
          >
            {isEnabled ? '⏸' : '▶'}
          </button>
          <div className="flex flex-col truncate">
            <span className={`text-[7px] md:text-[11px] font-bold truncate leading-none ${error ? 'text-red-500' : 'text-amber-500'}`}>
              {error ? 'Error' : TRACKS[currentTrackIndex].title}
            </span>
            <span className="hidden md:block text-[9px] text-stone-500 font-serif truncate">
              {error ? 'Could not play track' : TRACKS[currentTrackIndex].tibetanTitle}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button onClick={prevTrack} className="text-[8px] md:text-[12px] text-stone-600 hover:text-amber-500">⏮</button>
          <button onClick={nextTrack} className="text-[8px] md:text-[12px] text-stone-600 hover:text-amber-500">⏭</button>
          <button 
            onClick={() => setShowTracklist(!showTracklist)}
            className={`w-4 h-4 md:w-5 md:h-5 rounded flex items-center justify-center text-[8px] transition-colors ${showTracklist ? 'bg-amber-800/30 text-amber-400' : 'text-stone-500 hover:text-amber-500'}`}
          >
            ☰
          </button>
        </div>
      </div>

      {showTracklist && (
        <div className="flex flex-col gap-0.5 border-t border-stone-800 pt-1 max-h-16 overflow-y-auto no-scrollbar">
          {TRACKS.map((track, idx) => (
            <button
              key={track.id}
              onClick={() => { setCurrentTrackIndex(idx); setShowTracklist(false); if(!isEnabled) onToggle(); }}
              className={`text-left px-1.5 py-0.5 rounded text-[7px] md:text-[10px] transition-all truncate ${currentTrackIndex === idx ? 'bg-amber-900/30 text-amber-400' : 'text-stone-600 hover:bg-stone-800 hover:text-stone-300'}`}
            >
              {idx + 1}. {track.title}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-1.5 border-t border-stone-800/30 pt-1">
        <span className="text-[6px] text-stone-700">🔈</span>
        <input 
          type="range" 
          min="0" 
          max="1" 
          step="0.05" 
          value={volume} 
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          className="flex-grow h-0.5 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-amber-600"
        />
        <span className="text-[6px] text-stone-700">🔊</span>
      </div>
    </div>
  );
};

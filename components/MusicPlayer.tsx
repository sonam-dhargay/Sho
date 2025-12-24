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
    url: 'https://cdn.pixabay.com/audio/2022/05/27/audio_1808d30d8a.mp3' 
  },
  { 
    id: '2', 
    title: 'Spirit of Tibet', 
    tibetanTitle: 'བོད་ཀྱི་བླ་སྲོག', 
    url: 'https://cdn.pixabay.com/audio/2022/01/18/audio_d0a13f69d2.mp3' 
  },
  { 
    id: '3', 
    title: 'Temple Bells', 
    tibetanTitle: 'ལྷ་ཁང་གི་དྲིལ་བུ།', 
    url: 'https://cdn.pixabay.com/audio/2021/11/25/audio_91b32e02f9.mp3' 
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
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio(TRACKS[currentTrackIndex].url);
      audioRef.current.loop = true;
    }

    const audio = audioRef.current;
    audio.volume = volume;

    if (isEnabled) {
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Auto-play might be blocked by browser
          if (isEnabled) onToggle(); 
        });
      }
    } else {
      audio.pause();
    }

    return () => {
      audio.pause();
    };
  }, [isEnabled]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.src = TRACKS[currentTrackIndex].url;
      audioRef.current.load();
      if (isEnabled) {
        audioRef.current.play().catch(console.error);
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
    <div className="bg-stone-900/90 border border-stone-800 rounded-xl p-1.5 md:p-3 flex flex-col gap-1.5 shadow-2xl backdrop-blur-md">
      {/* Top Bar: Play Toggle and Title */}
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5 overflow-hidden flex-grow">
          <button 
            onClick={onToggle}
            className={`flex-shrink-0 w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center transition-all ${isEnabled ? 'bg-amber-600 text-white animate-pulse shadow-[0_0_10px_rgba(217,119,6,0.5)]' : 'bg-stone-800 text-stone-500'}`}
          >
            {isEnabled ? '⏸' : '▶'}
          </button>
          <div className="flex flex-col truncate">
            <span className="text-[8px] md:text-[11px] font-bold text-amber-500 truncate leading-tight">{TRACKS[currentTrackIndex].title}</span>
            <span className="text-[6px] md:text-[9px] text-stone-500 font-serif truncate leading-tight">{TRACKS[currentTrackIndex].tibetanTitle}</span>
          </div>
        </div>

        <button 
          onClick={() => setShowTracklist(!showTracklist)}
          className={`w-5 h-5 rounded flex items-center justify-center text-[10px] transition-colors ${showTracklist ? 'bg-amber-800/30 text-amber-500' : 'text-stone-500 hover:text-amber-500'}`}
        >
          ☰
        </button>
      </div>

      {/* Tracklist Popover-style content */}
      {showTracklist && (
        <div className="flex flex-col gap-1 border-t border-stone-800 pt-1.5 max-h-20 overflow-y-auto no-scrollbar">
          {TRACKS.map((track, idx) => (
            <button
              key={track.id}
              onClick={() => { setCurrentTrackIndex(idx); setShowTracklist(false); if(!isEnabled) onToggle(); }}
              className={`text-left px-2 py-0.5 rounded text-[7px] md:text-[10px] transition-all truncate ${currentTrackIndex === idx ? 'bg-amber-900/30 text-amber-400' : 'text-stone-600 hover:bg-stone-800 hover:text-stone-300'}`}
            >
              {idx + 1}. {track.title}
            </button>
          ))}
        </div>
      )}

      {/* Combined Controls & Volume Bar */}
      <div className="flex items-center gap-2 border-t border-stone-800/50 pt-1.5">
        <div className="flex items-center gap-1.5">
          <button onClick={prevTrack} className="text-[9px] md:text-[12px] text-stone-600 hover:text-amber-500 active:scale-90 transition-all">⏮</button>
          <button onClick={nextTrack} className="text-[9px] md:text-[12px] text-stone-600 hover:text-amber-500 active:scale-90 transition-all">⏭</button>
        </div>
        
        <div className="flex items-center gap-1.5 flex-grow">
          <span className="text-[7px] text-stone-700">🔈</span>
          <input 
            type="range" 
            min="0" 
            max="1" 
            step="0.05" 
            value={volume} 
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="flex-grow h-0.5 md:h-1 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-amber-600"
          />
          <span className="text-[7px] text-stone-700">🔊</span>
        </div>
      </div>
    </div>
  );
};

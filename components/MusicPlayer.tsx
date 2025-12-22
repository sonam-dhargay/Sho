import React, { useState, useEffect, useRef } from 'react';

interface Track {
  id: string;
  title: string;
  tibetanTitle: string;
  url: string;
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
          onToggle(); 
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
    <div className="bg-stone-900/80 border border-stone-800 rounded-xl p-2 md:p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 overflow-hidden">
          <button 
            onClick={onToggle}
            className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all ${isEnabled ? 'bg-amber-600 text-white animate-pulse' : 'bg-stone-800 text-stone-500'}`}
          >
            {isEnabled ? '⏸' : '▶'}
          </button>
          <div className="flex flex-col truncate">
            <span className="text-[9px] md:text-[11px] font-bold text-amber-500 truncate">{TRACKS[currentTrackIndex].title}</span>
            <span className="text-[7px] md:text-[9px] text-stone-500 font-serif truncate">{TRACKS[currentTrackIndex].tibetanTitle}</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button 
            onClick={() => setShowTracklist(!showTracklist)}
            className="w-6 h-6 rounded flex items-center justify-center text-stone-400 hover:text-amber-500 text-xs transition-colors"
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
              className={`text-left px-2 py-1 rounded text-[8px] md:text-[10px] transition-all ${currentTrackIndex === idx ? 'bg-amber-900/30 text-amber-400' : 'text-stone-500 hover:bg-stone-800 hover:text-stone-300'}`}
            >
              {idx + 1}. {track.title}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 px-1">
        <span className="text-[8px] text-stone-600">🔈</span>
        <input 
          type="range" 
          min="0" 
          max="1" 
          step="0.05" 
          value={volume} 
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          className="flex-grow h-1 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-amber-600"
        />
        <span className="text-[8px] text-stone-600">🔊</span>
      </div>

      <div className="flex justify-between items-center px-1">
        <button onClick={prevTrack} className="text-[10px] text-stone-500 hover:text-amber-500">⏮</button>
        <button onClick={nextTrack} className="text-[10px] text-stone-500 hover:text-amber-500">⏭</button>
      </div>
    </div>
  );
};

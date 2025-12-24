import React, { useState, useEffect, useRef } from 'react';

interface Track {
  id: string;
  title: string;
  url: string;
  tibetanTitle: string;
}

// Using highly reliable Pixabay CDN URLs which are optimized for web streaming
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
  const [loading, setLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Helper to completely reset and initialize the audio object
  const initializeAudio = (forceNew = false) => {
    if (forceNew || !audioRef.current) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current.remove();
      }
      audioRef.current = new Audio();
      audioRef.current.loop = true;
    }

    const audio = audioRef.current;
    audio.volume = volume;
    
    // Set source if different or new
    if (audio.src !== TRACKS[currentTrackIndex].url) {
      audio.src = TRACKS[currentTrackIndex].url;
      audio.load();
    }
  };

  const playCurrentTrack = async () => {
    if (!audioRef.current) return;
    try {
      setLoading(true);
      setError(null);
      await audioRef.current.play();
      setLoading(false);
    } catch (err) {
      console.warn("Playback prevented:", err);
      // "Click to Play" often happens due to browser autoplay policies
      setError("Click Play to Start");
      setLoading(false);
    }
  };

  // Sync initialization and playback state
  useEffect(() => {
    initializeAudio();
    const audio = audioRef.current!;

    const handleError = (e: any) => {
      console.error("Audio Load Error:", e);
      setError("Network Error");
      setLoading(false);
    };

    const handleCanPlay = () => {
      setError(null);
      setLoading(false);
      if (isEnabled) playCurrentTrack();
    };

    const handleLoadStart = () => {
      setLoading(true);
      setError(null);
    };

    audio.addEventListener('error', handleError);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('loadstart', handleLoadStart);

    if (isEnabled) {
      playCurrentTrack();
    } else {
      audio.pause();
    }

    return () => {
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.pause();
    };
  }, [isEnabled, currentTrackIndex]);

  // Volume control sync
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const nextTrack = () => {
    setCurrentTrackIndex((prev) => (prev + 1) % TRACKS.length);
    setError(null);
  };
  
  const prevTrack = () => {
    setCurrentTrackIndex((prev) => (prev - 1 + TRACKS.length) % TRACKS.length);
    setError(null);
  };

  const handleRetry = () => {
    setError(null);
    initializeAudio(true); // Hard reset
    if (isEnabled) playCurrentTrack();
  };

  return (
    <div className="bg-stone-900 border border-stone-800 rounded-lg p-2 md:p-3 flex flex-col gap-2 shadow-2xl backdrop-blur-md relative overflow-hidden">
      {/* Loading Bar Overlay */}
      {loading && (
        <div className="absolute top-0 left-0 h-0.5 bg-amber-500 animate-[loading_1s_infinite_linear]" style={{ width: '40%' }}>
          <style dangerouslySetInnerHTML={{ __html: `@keyframes loading { 0% { left: -40%; } 100% { left: 100%; } }` }} />
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 overflow-hidden flex-grow">
          <button 
            onClick={onToggle}
            disabled={loading}
            className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all ${isEnabled ? 'bg-amber-600 text-white shadow-[0_0_15px_rgba(217,119,6,0.5)]' : 'bg-stone-800 text-stone-500 hover:text-stone-300'} ${loading ? 'opacity-50' : 'opacity-100'}`}
          >
            {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : isEnabled ? (
                <span className="text-lg">⏸</span>
            ) : (
                <span className="text-lg translate-x-0.5">▶</span>
            )}
          </button>
          
          <div className="flex flex-col truncate">
            <span className={`text-[11px] md:text-[13px] font-bold truncate leading-none ${error ? 'text-red-400' : 'text-amber-500'}`}>
              {error ? error : TRACKS[currentTrackIndex].title}
            </span>
            <span className="hidden md:block text-[10px] text-stone-500 font-serif truncate mt-1">
              {TRACKS[currentTrackIndex].tibetanTitle}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button onClick={prevTrack} className="text-stone-600 hover:text-amber-500 p-1.5 transition-colors">⏮</button>
          <button onClick={nextTrack} className="text-stone-600 hover:text-amber-500 p-1.5 transition-colors">⏭</button>
          <button 
            onClick={() => setShowTracklist(!showTracklist)}
            className={`w-8 h-8 rounded flex items-center justify-center transition-all ${showTracklist ? 'bg-amber-800/40 text-amber-400' : 'bg-stone-800/50 text-stone-500 hover:text-amber-500'}`}
          >
            ☰
          </button>
        </div>
      </div>

      {showTracklist && (
        <div className="flex flex-col gap-1 border-t border-stone-800 pt-2 max-h-40 overflow-y-auto no-scrollbar">
          {TRACKS.map((track, idx) => (
            <button
              key={track.id}
              onClick={() => { setCurrentTrackIndex(idx); setShowTracklist(false); if(!isEnabled) onToggle(); }}
              className={`text-left px-2 py-2 rounded text-[11px] transition-all truncate border ${currentTrackIndex === idx ? 'bg-amber-900/40 text-amber-400 border-amber-700/50' : 'text-stone-500 border-transparent hover:bg-stone-800 hover:text-stone-300'}`}
            >
              <div className="flex justify-between items-center">
                  <span className="font-bold">{idx + 1}. {track.title}</span>
                  <span className="text-[9px] font-serif opacity-60 ml-2">{track.tibetanTitle}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 border-t border-stone-800/30 pt-2">
        <span className="text-[14px] text-stone-700">🔈</span>
        <input 
          type="range" 
          min="0" 
          max="1" 
          step="0.05" 
          value={volume} 
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          className="flex-grow h-2 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-amber-600"
        />
        <span className="text-[14px] text-stone-700">🔊</span>
      </div>
      
      {error && (
        <button 
          onClick={handleRetry}
          className="text-[10px] uppercase font-bold text-amber-500 hover:text-amber-400 text-center mt-1 py-1.5 border border-amber-900/40 rounded-md bg-amber-900/20 transition-all hover:bg-amber-900/30"
        >
          RETRY CONNECTION
        </button>
      )}
    </div>
  );
};

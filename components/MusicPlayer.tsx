import React, { useState, useEffect, useRef } from 'react';

interface Track {
  id: string;
  title: string;
  url: string;
  tibetanTitle: string;
}

/**
 * Using stable, direct CDN links from Pixabay. 
 * These are highly optimized for web playback and have proper MIME types.
 */
const TRACKS: Track[] = [
  { 
    id: '1', 
    title: 'Himalayan Zen', 
    tibetanTitle: 'ཧི་མ་ལ་ཡའི་ཞི་བདེ།', 
    url: 'https://cdn.pixabay.com/audio/2022/02/11/audio_f5429188d8.mp3' // Meditation/Ambient
  },
  { 
    id: '2', 
    title: 'Mountain Flute', 
    tibetanTitle: 'གངས་རིའི་གླིང་བུ།', 
    url: 'https://cdn.pixabay.com/audio/2022/03/09/audio_6506305a41.mp3' // Flute Ambient
  },
  { 
    id: '3', 
    title: 'Temple Bells', 
    tibetanTitle: 'ལྷ་ཁང་གི་དྲིལ་བུ།', 
    url: 'https://cdn.pixabay.com/audio/2021/11/25/audio_91b32e01d9.mp3' // Deep Ambient
  }
];

interface MusicPlayerProps {
  isEnabled: boolean;
  onToggle: () => void;
}

export const MusicPlayer: React.FC<MusicPlayerProps> = ({ isEnabled, onToggle }) => {
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [volume, setVolume] = useState(0.4);
  const [showTracklist, setShowTracklist] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio object once
  useEffect(() => {
    const audio = new Audio();
    audio.loop = true;
    // REMOVED crossOrigin = "anonymous" as it often causes "Format Not Supported" 
    // when the remote server doesn't explicitly handle CORS for audio streams.
    audioRef.current = audio;

    const handleError = (e: any) => {
      console.error("Audio Error Event:", e);
      if (audio.error) {
        console.error("Specific Audio Error:", audio.error.code, audio.error.message);
        switch (audio.error.code) {
          case 1: setError("Playback Aborted"); break;
          case 2: setError("Network Timeout"); break;
          case 3: setError("Decoding Failed"); break;
          case 4: setError("Format Unsupported"); break;
          default: setError("Unknown Audio Error");
        }
      } else {
        setError("Connection Interrupted");
      }
      setLoading(false);
    };

    const handleCanPlay = () => {
      setError(null);
      setLoading(false);
    };

    const handleLoadStart = () => {
      setLoading(true);
      setError(null);
    };

    audio.addEventListener('error', handleError);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('loadstart', handleLoadStart);

    return () => {
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.pause();
      audio.src = "";
    };
  }, []);

  // Handle Track Source Changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const newUrl = TRACKS[currentTrackIndex].url;
    if (audio.src !== newUrl) {
      audio.src = newUrl;
      // Force reload on source change
      audio.load();
      
      if (isEnabled) {
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(err => {
            console.warn("Autoplay blocked or load failed:", err);
            // Don't set error here, let the 'error' listener handle real network/format issues
          });
        }
      }
    }
  }, [currentTrackIndex, isEnabled]);

  // Handle Play/Pause and Volume
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = volume;

    if (isEnabled) {
      if (audio.paused) {
        audio.play().catch(() => {
          // Silent catch for initial user interaction requirements
        });
      }
    } else {
      audio.pause();
    }
  }, [isEnabled, volume]);

  const nextTrack = () => {
    setCurrentTrackIndex((prev) => (prev + 1) % TRACKS.length);
  };
  
  const prevTrack = () => {
    setCurrentTrackIndex((prev) => (prev - 1 + TRACKS.length) % TRACKS.length);
  };

  const handleRetry = () => {
    const audio = audioRef.current;
    if (audio) {
      setError(null);
      audio.load();
      if (isEnabled) audio.play().catch(e => console.error("Retry play failed", e));
    }
  };

  return (
    <div className="bg-stone-900 border border-stone-800 rounded-lg p-2 md:p-3 flex flex-col gap-2 shadow-2xl backdrop-blur-md relative overflow-hidden">
      {loading && (
        <div className="absolute top-0 left-0 h-0.5 bg-amber-500 animate-loading-bar" style={{ width: '100%' }}>
          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes loading-bar { 
              0% { transform: translateX(-100%); } 
              50% { transform: translateX(0); }
              100% { transform: translateX(100%); } 
            }
            .animate-loading-bar { animation: loading-bar 2s infinite ease-in-out; }
          ` }} />
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 overflow-hidden flex-grow">
          <button 
            onClick={onToggle}
            className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all ${isEnabled ? 'bg-amber-600 text-white shadow-[0_0_15px_rgba(217,119,6,0.5)]' : 'bg-stone-800 text-stone-500 hover:text-stone-300'}`}
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
          className="flex-grow h-1.5 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-amber-600"
        />
        <span className="text-[14px] text-stone-700">🔊</span>
      </div>
      
      {error && (
        <button 
          onClick={handleRetry}
          className="text-[10px] uppercase font-bold text-red-400 hover:text-red-300 text-center mt-1 py-1.5 border border-red-900/40 rounded-md bg-red-900/20 transition-all hover:bg-red-900/30"
        >
          Retry Connection བསྐྱར་དུ་མཐུད།
        </button>
      )}
    </div>
  );
};

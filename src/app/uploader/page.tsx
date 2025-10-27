"use client";

import React, { useEffect, useRef, useState } from 'react';

/**
 * Multitrack Video Editor Component
 * 
 * A professional video editor that allows users to:
 * - Upload video files (MP4, MOV, AVI, MKV)
 * - Mix video audio with multiple audio tracks
 * - Drag and reposition audio tracks on timeline
 * - Adjust individual track volumes
 * - Control playback and zoom levels
 * 
 * @requires wavesurfer-multitrack - For multitrack audio visualization and control
 * @see https://wavesurfer.xyz/examples/?multitrack.js
 */

// Supported video file formats for upload validation
const VALID_VIDEO_TYPES = [
  'video/mp4',
  'video/quicktime',  // MOV
  'video/x-msvideo',  // AVI
  'video/x-matroska'  // MKV
];

/**
 * Volume envelope point for dynamic volume control
 * @property time - Time in seconds relative to track start
 * @property volume - Volume level at this point (0.0 to 1.0)
 */
interface EnvelopePoint {
  time: number;
  volume: number;
}

/**
 * Track interface represents an audio track in the multitrack editor
 * @property id - Unique identifier for the track
 * @property name - Display name of the track
 * @property volume - Volume level (0.0 to 1.0)
 * @property startPosition - Start time in seconds on the timeline
 * @property draggable - Whether the track can be repositioned on timeline
 * @property envelope - Array of volume control points for dynamic volume changes
 */
interface Track {
  id: number;
  name: string;
  volume: number;
  startPosition: number;
  draggable?: boolean;
  envelope?: EnvelopePoint[];
}

export default function Uploader() {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  
  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [error, setError] = useState('');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  // Multitrack editor references
  const containerRef = useRef<HTMLDivElement | null>(null); // DOM container for waveform display
  const multitrackRef = useRef<any>(null); // Wavesurfer-multitrack instance
  const trackRefsRef = useRef<Map<number, any>>(new Map()); // Individual track references (unused but kept for future)
  const videoRef = useRef<HTMLVideoElement | null>(null); // Video element reference
  
  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [zoom, setZoom] = useState(10); // Timeline zoom level (pixels per second)
  const [tracksReady, setTracksReady] = useState(false); // Whether all tracks are loaded
  
  /**
   * Track configuration state
   * - Track 0: Video's original audio (locked in position, with envelope)
   * - Track 1: Song 1 from /public/song1.mp3 (draggable, with envelope)
   * - Track 2: Song 2 from /public/song2.mp3 (draggable, with envelope)
   */
  const [tracks, setTracks] = useState<Track[]>([
    { id: 0, name: 'Video Audio', volume: 1, startPosition: 0, draggable: false, envelope: [] },
    { id: 1, name: 'Song 1', volume: 0.8, startPosition: 0, draggable: true, envelope: [] },
    { id: 2, name: 'Song 2', volume: 0.8, startPosition: 0, draggable: true, envelope: [] },
  ]);

  // ============================================================================
  // FILE HANDLING
  // ============================================================================
  
  /**
   * Validates uploaded video file
   * Checks file type and size constraints
   * @param file - The file to validate
   * @returns true if valid, false otherwise
   */
  const validateVideo = (file: File) => {
    // Check file type
    if (!VALID_VIDEO_TYPES.includes(file.type)) {
      setError('Invalid file type. Please upload MP4, MOV, AVI, or MKV.');
      return false;
    }

    // Check file size (max 320MB)
    const maxSize = 320 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('File is too large. Maximum size is 320MB.');
      return false;
    }

    return true;
  };

  /**
   * Handles file selection from input
   * Validates file and creates object URL for preview
   */
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setError(''); // Clear previous errors
      
      if (validateVideo(file)) {
        setSelectedFile(file);
        // Create object URL for video preview and audio extraction
        const url = URL.createObjectURL(file);
        setVideoUrl(url);
      }
    }
  };

  /**
   * Handles video upload action
   * In production, this would upload to a server
   * Currently shows success message only
   */
  const handleUpload = () => {
    if (!selectedFile) {
      setError('Please select a video file');
      return;
    }
    
    setError('');
    setUploadSuccess(true);
    
    // Auto-hide success message after 3 seconds
    setTimeout(() => setUploadSuccess(false), 3000);
  };

  /**
   * Resets the editor to initial state
   * Cleans up memory by:
   * - Revoking object URLs
   * - Destroying multitrack instance
   * - Clearing all references
   * - Resetting all state
   */
  const resetUpload = () => {
    // Stop playback first
    if (multitrackRef.current) {
      try {
        if (multitrackRef.current.isPlaying?.()) {
          multitrackRef.current.pause();
        }
        multitrackRef.current.destroy();
      } catch (e) {
        console.warn('Reset multitrack error:', e);
      }
      multitrackRef.current = null;
    }
    
    // Reset video element
    if (videoRef.current) {
      try {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
        videoRef.current.src = '';
        videoRef.current.load();
      } catch (e) {
        console.warn('Reset video error:', e);
      }
    }
    
    // Memory cleanup: Revoke object URL to free memory
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
    }
    
    // Clear track references
    trackRefsRef.current.clear();

    // Reset all state to initial values
    setSelectedFile(null);
    setUploadSuccess(false);
    setError('');
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setTracksReady(false);
    
    // Reset track configurations to defaults
    setTracks([
      { id: 0, name: 'Video Audio', volume: 1, startPosition: 0, draggable: false, envelope: [] },
      { id: 1, name: 'Song 1', volume: 0.8, startPosition: 0, draggable: true, envelope: [] },
      { id: 2, name: 'Song 2', volume: 0.8, startPosition: 0, draggable: true, envelope: [] },
    ]);
    
    // Small delay before clearing video URL to ensure cleanup completes
    setTimeout(() => {
      setVideoUrl(null);
    }, 50);
    
    // Clear file input to allow re-selecting the same file
    const fileInput = document.getElementById('video-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  // ============================================================================
  // MULTITRACK INITIALIZATION
  // ============================================================================
  
  /**
   * Initialize wavesurfer-multitrack when video is loaded or zoom changes
   * 
   * Creates a multitrack editor with three audio tracks:
   * 1. Video's original audio (blue waveform, locked position)
   * 2. Song 1 from /public/song1.mp3 (green waveform, draggable)
   * 3. Song 2 from /public/song2.mp3 (yellow waveform, draggable)
   * 
   * Handles:
   * - Dynamic loading of wavesurfer-multitrack library
   * - Syncing video playback with audio tracks
   * - Event listeners for track position/volume changes
   * - Memory cleanup on unmount
   * 
   * Dependencies: [videoUrl, zoom]
   * - videoUrl: Triggers setup when video is loaded
   * - zoom: Recreates multitrack with new zoom level
   */
  useEffect(() => {
    let isCancelled = false;
    let playStateInterval: NodeJS.Timeout | null = null;
    let timeInterval: NodeJS.Timeout | null = null;
    
    async function setupMultitrack() {
      // Guard: Ensure required elements exist
      if (!videoUrl || !containerRef.current) return;

      // Cleanup existing instance to prevent memory leaks
      if (multitrackRef.current) {
        try {
          multitrackRef.current.destroy();
        } catch (e) {
          console.warn('Multitrack cleanup error:', e);
        }
        multitrackRef.current = null;
      }

      try {
        // Dynamically import to reduce initial bundle size
        const Multitrack = (await import('wavesurfer-multitrack')).default;

        // Guard: Check if effect was cancelled during async operation
        if (isCancelled) return;

        /**
         * Create multitrack instance with three tracks
         * Each track has:
         * - id: Unique identifier
         * - url: Audio source (video file or mp3)
         * - draggable: Whether user can reposition on timeline
         * - startPosition: Initial position in seconds
         * - volume: Initial volume (0.0 to 1.0)
         * - options: Waveform visualization settings (colors, height)
         */
        const multitrack = Multitrack.create(
          [
            {
              id: 0,
              url: videoUrl, // Video's audio track
              draggable: false,
              startPosition: 0,
              volume: tracks[0].volume,
              envelope: tracks[0].envelope && tracks[0].envelope.length > 0 ? tracks[0].envelope : true,
              options: {
                waveColor: 'hsl(217, 87%, 49%)',
                progressColor: 'hsl(217, 87%, 20%)',
                height: 90,
              },
            },
            {
              id: 1,
              url: '/song1.mp3',
              draggable: true,
              startPosition: tracks[1].startPosition,
              volume: tracks[1].volume,
              envelope: tracks[1].envelope && tracks[1].envelope.length > 0 ? tracks[1].envelope : true,
              options: {
                waveColor: 'hsl(161, 87%, 49%)',
                progressColor: 'hsl(161, 87%, 20%)',
                height: 90,
              },
            },
            {
              id: 2,
              url: '/song2.mp3',
              draggable: true,
              startPosition: tracks[2].startPosition,
              volume: tracks[2].volume,
              envelope: tracks[2].envelope && tracks[2].envelope.length > 0 ? tracks[2].envelope : true,
              options: {
                waveColor: 'hsl(46, 87%, 49%)',
                progressColor: 'hsl(46, 87%, 20%)',
                height: 90,
              },
            },
          ],
          {
            container: containerRef.current,
            minPxPerSec: zoom,
            cursorWidth: 2,
            cursorColor: '#D72F21',
            trackBackground: '#2D2D2D',
            trackBorderColor: '#7C7C7C',
            dragBounds: true,
            rightButtonDrag: false,
            envelopeOptions: {
              lineColor: 'rgba(255, 0, 0, 0.7)',
              lineWidth: '4',
              dragPointSize: 10,
              dragPointFill: 'rgba(255, 255, 255, 0.8)',
              dragPointStroke: 'rgba(255, 255, 255, 0.3)',
            },
          }
        );

        /**
         * EVENT LISTENERS
         * Subscribe to multitrack events for state synchronization
         */
        
        // Update track position when user drags it
        multitrack.on('start-position-change', ({ id, startPosition }) => {
          setTracks(prev => prev.map(t => 
            t.id === id ? { ...t, startPosition } : t
          ));
        });

        // Update track volume when changed (if multitrack provides this event)
        multitrack.on('volume-change', ({ id, volume }) => {
          setTracks(prev => prev.map(t => 
            t.id === id ? { ...t, volume } : t
          ));
        });

        // Update envelope points when user drags volume markers
        multitrack.on('envelope-points-change', ({ id, points }) => {
          console.log(`Envelope points changed for track ${id}:`, points);
          setTracks(prev => prev.map(t => 
            t.id === id ? { ...t, envelope: points } : t
          ));
        });

        /**
         * PLAYBACK STATE MONITORING
         * Poll play state since multitrack doesn't provide play/pause events
         * Runs every 200ms for responsive UI updates
         * Also syncs video element play/pause state to prevent independent playback
         */
        let wasPlaying = false;
        const checkPlayState = () => {
          if (isCancelled) return;
          try {
            const playing = multitrack.isPlaying?.() || false;
            if (playing !== wasPlaying) {
              setIsPlaying(playing);
              
              // Keep video element in sync with multitrack play state
              if (videoRef.current) {
                if (playing && videoRef.current.paused) {
                  videoRef.current.play().catch(() => {}); // Ignore autoplay errors
                } else if (!playing && !videoRef.current.paused) {
                  videoRef.current.pause();
                }
              }
              
              wasPlaying = playing;
            }
          } catch (e) {
            // Ignore errors during cleanup
          }
        };
        playStateInterval = setInterval(checkPlayState, 200);

        /**
         * VIDEO DURATION SETUP
         * Get duration from video element once metadata is loaded
         */
        if (videoRef.current && videoRef.current.duration) {
          setDuration(videoRef.current.duration);
        } else {
          videoRef.current?.addEventListener('loadedmetadata', () => {
            if (videoRef.current && videoRef.current.duration) {
              setDuration(videoRef.current.duration);
            }
          });
        }

        /**
         * MUTE VIDEO
         * Video element is muted because audio is played through multitrack
         * This prevents audio doubling and ensures volume control works correctly
         */
        if (videoRef.current) {
          videoRef.current.muted = true;
        }

        /**
         * VIDEO SYNC
         * Keep video playback synchronized with multitrack audio
         * Updates every 250ms to reduce performance impact
         * Only syncs when drift exceeds threshold to avoid micro-adjustments
         */
        const updateTime = () => {
          if (isCancelled || !multitrackRef.current) return;
          
          try {
            const time = multitrack.getCurrentTime();
            
            // Update UI time display
            setCurrentTime(time);
            
            // Sync video element with multitrack time
            if (videoRef.current) {
              const drift = Math.abs(videoRef.current.currentTime - time);
              
              // Only adjust if drift is significant (>200ms) to prevent stuttering
              if (drift > 0.2) {
                videoRef.current.currentTime = time;
              }
            }
          } catch (e) {
            // Ignore errors during cleanup
          }
        };
        timeInterval = setInterval(updateTime, 250);

        // Store reference for external control
        multitrackRef.current = multitrack;

        /**
         * TRACK LOADING MONITOR
         * Wait for all tracks to load before enabling controls
         * Multitrack fires 'canplay' event for each track that loads
         */
        let tracksLoaded = 0;
        const totalTracks = 3;
        
        const checkAllTracksReady = () => {
          tracksLoaded++;
          if (tracksLoaded === totalTracks) {
            setTracksReady(true);
          }
        };
        
        multitrack.on('canplay', checkAllTracksReady);

        /**
         * CLEANUP FUNCTION
         * Clear intervals to prevent memory leaks
         */
        return () => {
          if (playStateInterval) clearInterval(playStateInterval);
          if (timeInterval) clearInterval(timeInterval);
          playStateInterval = null;
          timeInterval = null;
        };
      } catch (e) {
        console.error('Failed to load multitrack:', e);
        setError('Failed to load multitrack editor.');
      }
    }

    setupMultitrack();
    
    // Main cleanup on unmount or when dependencies change
    return () => {
      isCancelled = true;
      
      // Clear any running intervals
      if (playStateInterval) {
        clearInterval(playStateInterval);
        playStateInterval = null;
      }
      if (timeInterval) {
        clearInterval(timeInterval);
        timeInterval = null;
      }
      
      // Destroy multitrack instance
      if (multitrackRef.current) {
        try {
          multitrackRef.current.destroy();
        } catch (e) {
          console.warn('Final cleanup error:', e);
        }
        multitrackRef.current = null;
      }
    };
  }, [videoUrl, zoom]);

  // ============================================================================
  // PLAYBACK CONTROLS
  // ============================================================================
  
  /**
   * Toggle play/pause state
   * Controls both multitrack audio and video playback
   */
  const togglePlayPause = () => {
    if (!multitrackRef.current) return;
    
    if (multitrackRef.current.isPlaying && multitrackRef.current.isPlaying()) {
      multitrackRef.current.pause();
      setIsPlaying(false);
    } else {
      multitrackRef.current.play();
      setIsPlaying(true);
    }
  };

  /**
   * Skip forward or backward in time
   * @param seconds - Number of seconds to skip (positive or negative)
   */
  const skipTime = (seconds: number) => {
    if (!multitrackRef.current) return;
    
    // Clamp new time within valid range [0, duration]
    const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
    multitrackRef.current.setTime(newTime);
  };

  /**
   * Handle zoom level change
   * Triggers multitrack recreation via useEffect dependency
   * @param value - New zoom level (pixels per second)
   */
  const handleZoomChange = (value: number) => {
    setZoom(value);
    // Note: Actual zoom is applied by useEffect when zoom state changes
  };

  /**
   * Update individual track volume
   * 
   * Implementation Note:
   * Wavesurfer-multitrack doesn't expose track instances directly in the 'tracks' array.
   * That array only contains configuration. The actual WaveSurfer instances are stored
   * in various internal properties depending on the library version.
   * 
   * This function searches multiple possible locations:
   * - multitrack.wavesurfers
   * - multitrack.channels
   * - multitrack.players
   * - multitrack.ws
   * - multitrack.instances
   * 
   * @param trackId - ID of the track to update (0, 1, or 2)
   * @param volume - New volume level (0.0 to 1.0)
   */
  const updateTrackVolume = (trackId: number, volume: number) => {
    // Update React state
    setTracks(prev => prev.map(t => 
      t.id === trackId ? { ...t, volume } : t
    ));
    
    if (!multitrackRef.current) return;
    
    const multitrack = multitrackRef.current as any;
    
    /**
     * Search for wavesurfer instances in possible internal locations
     * The multitrack library stores actual audio controllers separately from config
     */
    const possibleLocations = [
      multitrack.wavesurfers,
      multitrack.channels,
      multitrack.players,
      multitrack.ws,
      multitrack.instances,
    ];
    
    // Try each location until we find the track
    for (const location of possibleLocations) {
      if (location && location[trackId]) {
        const instance = location[trackId];
        
        // Try setVolume method (WaveSurfer API)
        if (typeof instance.setVolume === 'function') {
          instance.setVolume(volume);
          return;
        }
        
        // Fallback: Try direct media element access
        if (instance.media) {
          instance.media.volume = volume;
          return;
        }
      }
    }
    
    // Last resort: Try multitrack-level method (if it exists)
    if (typeof multitrack.setTrackVolume === 'function') {
      multitrack.setTrackVolume(trackId, volume);
    }
  };

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================
  
  /**
   * Format seconds into MM:SS display format
   * @param seconds - Time in seconds
   * @returns Formatted time string (e.g., "2:05")
   */
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-black p-4">
      <div className="w-full max-w-2xl bg-gray-900 rounded-lg shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold text-white mb-2">
            Ziron Studio 
          </h1>
          <p className="text-gray-400">
            Upload your video and mix it with audio tracks
          </p>
        </div>

        <div className="space-y-6">
          {/* File Input */}
          <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center hover:border-indigo-500 transition-colors">
            <input
              type="file"
              accept="video/*"
              onChange={handleFileSelect}
              className="hidden"
              id="video-upload"
            />
            <label htmlFor="video-upload" className="cursor-pointer block hover:opacity-80 transition-opacity">
              <div className="text-4xl mb-4">📹</div>
              <p className="text-white text-lg mb-2">
                {selectedFile ? selectedFile.name : 'Click to select a video file'}
              </p>
              <p className="text-gray-400 text-sm">
                {selectedFile
                  ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB`
                  : 'Supports MP4, MOV, AVI, and MKV'}
              </p>
            </label>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Success Message */}
          {uploadSuccess && (
            <div className="bg-green-900 border border-green-700 text-green-200 px-4 py-3 rounded-lg">
              Video uploaded successfully! {videoUrl && "Video player should appear below."}
            </div>
          )}

          {/* Video Player */}
          {videoUrl && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white text-center">Video Preview</h3>
              <div className="bg-gray-800 p-4 rounded-lg">
                <video
                  ref={videoRef}
                  src={videoUrl}
                  className="w-full rounded-lg shadow-lg pointer-events-none"
                  style={{ maxHeight: '400px' }}
                  preload="metadata"
                  muted
                >
                  Your browser does not support the video tag.
                </video>
              </div>
            </div>
          )}

          {/* Multitrack Editor */}
          {videoUrl && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-white">Multitrack Audio Editor</h3>
                <div className="text-white text-sm">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </div>
              </div>

              {/* Playback Controls */}
              <div className="bg-gray-800 p-4 rounded-lg space-y-4">
                <div className="flex justify-center items-center space-x-4">
                  <button
                    onClick={() => skipTime(-10)}
                    className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
                  >
                    ⏪ -10s
                  </button>
                  <button
                    onClick={togglePlayPause}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
                  >
                    {isPlaying ? '⏸ Pause' : '▶ Play'}
                  </button>
                  <button
                    onClick={() => skipTime(10)}
                    className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
                  >
                    +10s ⏩
                  </button>
                </div>

                {/* Zoom Control */}
                <div className="flex items-center space-x-3">
                  <label className="text-white text-sm min-w-[60px]">Zoom:</label>
                  <input
                    type="range"
                    min="10"
                    max="200"
                    value={zoom}
                    onChange={(e) => handleZoomChange(Number(e.target.value))}
                    className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="text-white text-sm min-w-[40px]">{zoom}</span>
                </div>
              </div>

              {/* Waveform Display */}
              <div className="bg-[#2d2d2d] p-4 rounded-lg">
                <div ref={containerRef} className="w-full min-h-[300px]" style={{ cursor: 'default' }} />
                <div className="mt-2 text-xs text-gray-400">
                  💡 Click on any waveform (Video Audio, Song 1, or Song 2) to add volume envelope markers. Drag markers to adjust volume over time.
                </div>
              </div>

              {/* Track Controls */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-white">Track Controls</h4>
                  {!tracksReady && (
                    <span className="text-xs text-yellow-400 animate-pulse">
                      ⏳ Loading tracks...
                    </span>
                  )}
                  {tracksReady && (
                    <span className="text-xs text-green-400">
                      ✓ Ready
                    </span>
                  )}
                </div>
                {tracks.map((track) => (
                  <div key={track.id} className="bg-gray-800 p-4 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-white font-medium">{track.name}</span>
                      {track.draggable && (
                        <span className="text-xs text-gray-400">
                          ↔️ Draggable
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-3">
                      <label className="text-gray-400 text-sm min-w-[60px]">Volume:</label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={track.volume}
                        onChange={(e) => updateTrackVolume(track.id, Number(e.target.value))}
                        className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                      />
                      <span className="text-gray-400 text-sm min-w-[45px]">
                        {Math.round(track.volume * 100)}%
                      </span>
                    </div>
                    <div className="text-gray-400 text-xs space-y-1">
                      <div>
                        {track.draggable 
                          ? `Start: ${track.startPosition.toFixed(2)}s (drag on timeline above)`
                          : `Start: ${track.startPosition.toFixed(2)}s (locked position)`
                        }
                      </div>
                      <div className="text-indigo-400">
                        🎚️ Volume envelope: {track.envelope && track.envelope.length > 0 
                          ? `${track.envelope.length} point${track.envelope.length !== 1 ? 's' : ''}`
                          : 'Click on waveform to add volume markers'
                        }
                      </div>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          )}

          {/* Action Buttons */}
          {selectedFile && (
            <div className="flex justify-center space-x-4">
              <button
                onClick={handleUpload}
                className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition-colors duration-200"
              >
                Upload Video
              </button>
              <button
                onClick={resetUpload}
                className="bg-gray-700 text-white px-6 py-2 rounded-lg font-semibold hover:bg-gray-600 transition-colors duration-200"
              >
                Reset
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

"use client";

import React, { useEffect, useRef, useState } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import TimelinePlugin from 'wavesurfer.js/dist/plugins/timeline.esm.js'


/**
 * Voice Uploader Component
 * 
 * Features:
 * - Audio file upload with validation
 * - Waveform visualization with Wavesurfer.js
 * - Draggable regions for audio editing
 * - Audio trimming using FFmpeg.wasm
 * - Download trimmed audio files
 * 
 * Supported audio formats: MP3, WAV, OGG, M4A, AAC, WEBM
 */

// Valid audio MIME types for file validation
const VALID_AUDIO_TYPES = [
  'audio/mp3',
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'audio/m4a',
  'audio/aac',
  'audio/webm'
];

export default function VoiceUploader() {
  // Basic upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [error, setError] = useState('');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  // Wavesurfer.js state for waveform visualization and regions
  const containerRef = useRef<HTMLDivElement | null>(null);
  const wavesurferRef = useRef<any>(null);
  const regionsPluginRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [regions, setRegions] = useState<Array<{ id: string; start: number; end: number }>>([]);
  
  // FFmpeg.wasm state for audio processing
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [trimmedAudioUrl, setTrimmedAudioUrl] = useState<string | null>(null);

  /**
   * Validates uploaded audio file
   * @param file - The audio file to validate
   * @returns true if valid, false otherwise
   */
  const validateAudio = (file: File) => {
    // Check if file type is supported
    if (!VALID_AUDIO_TYPES.includes(file.type)) {
      setError('Invalid file type. Please upload MP3, WAV, OGG, M4A, AAC, or WEBM.');
      return false;
    }

    // Check file size limit (50MB)
    const maxSize = 50 * 1024 * 1024; // maximum size of 50MB
    if (file.size > maxSize) {
      setError('File is too large. Maximum size is 50MB.');
      return false;
    }

    return true;
  };

  /**
   * Handles file selection from input
   * Creates object URL for immediate preview and waveform loading
   */
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // clear previous errors
      setError('');
      // validate audio file
      if (validateAudio(file)) {
        setSelectedFile(file);
        // Create audio URL immediately for preview and waveform
        const url = URL.createObjectURL(file);
        setAudioUrl(url);
      }
    }
  };

  /**
   * Simulates upload process
   * Shows success message for 3 seconds
   */
  const handleUpload = () => {
    if (!selectedFile) {
      setError('Please select an audio file');
      return;
    }
    setError('');
    setUploadSuccess(true);
    
    // hide upload success message after 3 seconds
    setTimeout(() => setUploadSuccess(false), 3000);
  };

  /**
   * Resets all state and cleans up resources
   * Destroys waveform, revokes URLs, clears file input
   */
  const resetUpload = () => {
    // Clean up audio URL to prevent memory leaks
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    // Clean up trimmed audio URL as well
    if (trimmedAudioUrl) {
      URL.revokeObjectURL(trimmedAudioUrl);
    }
    // Destroy wavesurfer instance to free memory
    if (wavesurferRef.current) {
      wavesurferRef.current.destroy();
      wavesurferRef.current = null;
      regionsPluginRef.current = null;
    }
    setRegions([]);

    // Reset all state
    setSelectedFile(null);
    setUploadSuccess(false);
    setError('');
    setAudioUrl(null);
    setTrimmedAudioUrl(null);
    
    // Clear the file input to allow selecting the same file again
    const fileInput = document.getElementById('audio-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  /**
   * Initialize Wavesurfer.js waveform when audio URL changes
   * Sets up waveform visualization and regions plugin
   */
  useEffect(() => {
    let isCancelled = false;
    async function setupWaveform() {
      if (!audioUrl || !containerRef.current) return;

      // Cleanup any existing instance to prevent memory leaks
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
        wavesurferRef.current = null;
        regionsPluginRef.current = null;
      }

      try {
        // Dynamically import Wavesurfer.js and regions plugin
        const WaveSurfer = (await import('wavesurfer.js')).default;
        const RegionsPlugin = (await import('wavesurfer.js/dist/plugins/regions.esm.js')).default;

        if (isCancelled) return;

        // Create waveform instance with dark theme styling
        const ws = WaveSurfer.create({
          container: containerRef.current,
          waveColor: '#6b7280', // gray-500
          progressColor: '#6366f1', // indigo-500
          cursorColor: '#ffffff',
          height: 96,
          url: audioUrl,
          media: audioRef.current || undefined, // Sync with audio element
          // plugins: [TimelinePlugin.create()],
        });


        // Register regions plugin for draggable selections
        const regionsPlugin = ws.registerPlugin(
          RegionsPlugin.create()
        );

        // Enable click-and-drag region creation with styling
        regionsPlugin.enableDragSelection({
          color: 'rgba(99, 102, 241, 0.3)', // indigo-500 @ 30% opacity
          resize: true,
        });

        // Sync regions state with React state
        const syncRegions = () => {
          const list = Object.values(regionsPlugin.getRegions()).map((r: any) => ({
            id: r.id,
            start: r.start,
            end: r.end,
          }));
          setRegions(list);
        };

        // Listen for region changes and update state
        regionsPlugin.on('region-created', syncRegions);
        regionsPlugin.on('region-updated', syncRegions);
        regionsPlugin.on('region-removed', syncRegions);

        // Store references for cleanup and manipulation
        wavesurferRef.current = ws;
        regionsPluginRef.current = regionsPlugin;
      } catch (e) {
        console.error('Failed to load wavesurfer:', e);
        setError('Failed to load waveform editor.');
      }
    }

    setupWaveform();
    return () => {
      isCancelled = true;
    };
  }, [audioUrl]);

  /**
   * Removes a region from the waveform
   * @param id - The region ID to remove
   */
  const removeRegion = (id: string) => {
    const plugin = regionsPluginRef.current;
    if (!plugin) return;
    
    // Get regions collection and find the specific region
    const collection: any = plugin.getRegions?.();
    let region: any = null;
    if (Array.isArray(collection)) {
      region = collection.find((r: any) => r.id === id);
    } else if (collection && typeof collection === 'object') {
      region = collection[id];
    }
    if (!region) return;
    
    // Remove the region using the appropriate method
    if (typeof plugin.removeRegion === 'function') {
      plugin.removeRegion(region);
    } else if (typeof region.remove === 'function') {
      region.remove();
    }
  };

  /**
   * Seeks to a specific time in both waveform and audio player
   * @param time - Time in seconds to seek to
   */
  const seekTo = (time: number) => {
    const ws = wavesurferRef.current;
    const audio = audioRef.current;
    if (ws) ws.setTime(time);
    if (audio) audio.currentTime = time;
  };

  /**
   * Initialize FFmpeg.wasm for audio processing
   * Loads FFmpeg core and WASM files from CDN
   */
  const initFFmpeg = async () => {
    if (ffmpegRef.current) return;
    
    const ffmpeg = new FFmpeg();
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
    
    try {
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });
      ffmpegRef.current = ffmpeg;
    } catch (err) {
      console.error('Failed to load FFmpeg:', err);
      setError('Failed to load audio processor');
    }
  };

  /**
   * Trims audio based on selected regions using FFmpeg.wasm
   * Keeps only the parts marked by regions and concatenates them
   */
  const trimAudio = async () => {
    if (!selectedFile || regions.length === 0) {
      setError('Please select an audio file and create regions to trim');
      return;
    }

    // Initialize FFmpeg if not already done
    if (!ffmpegRef.current) {
      await initFFmpeg();
      if (!ffmpegRef.current) {
        setError('Failed to initialize audio processor');
        return;
      }
    }

    setIsProcessing(true);
    setError('');

    try {
      const ffmpeg = ffmpegRef.current;
      
      // Write input file to FFmpeg filesystem
      await ffmpeg.writeFile('input.wav', await fetchFile(selectedFile));
      
      // Create filter complex for trimming regions
      // Each region becomes a separate audio stream
      const filterParts = regions.map((region, index) => 
        `[0:a]atrim=start=${region.start}:end=${region.end},asetpts=PTS-STARTPTS[a${index}]`
      );
      
      // Concatenate all trimmed regions into one output
      const concatInputs = regions.map((_, index) => `[a${index}]`).join('');
      const filterComplex = `${filterParts.join(';')};${concatInputs}concat=n=${regions.length}:v=0:a=1[out]`;
      
      // Run FFmpeg command to process audio
      await ffmpeg.exec([
        '-i', 'input.wav',
        '-filter_complex', filterComplex,
        '-map', '[out]',
        'output.wav'
      ]);
      
      // Read processed output and create blob URL
      const data = await ffmpeg.readFile('output.wav');
      const blob = new Blob([new Uint8Array(data as any)], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);
      setTrimmedAudioUrl(url);
      
      // Clean up temporary files
      await ffmpeg.deleteFile('input.wav');
      await ffmpeg.deleteFile('output.wav');
      
    } catch (err) {
      console.error('Audio trimming failed:', err);
      setError('Failed to trim audio');
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Downloads the trimmed audio file
   * Creates a temporary download link and triggers download
   */
  const downloadTrimmedAudio = () => {
    if (!trimmedAudioUrl) return;
    
    const link = document.createElement('a');
    link.href = trimmedAudioUrl;
    link.download = `trimmed_${selectedFile?.name || 'audio'}.wav`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  /**
   * Resets only the trimmed audio state
   * Cleans up the trimmed audio URL
   */
  const resetTrimmedAudio = () => {
    // Clean up trimmed audio URL to prevent memory leaks
    if (trimmedAudioUrl) {
      URL.revokeObjectURL(trimmedAudioUrl);
    }
    setTrimmedAudioUrl(null);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-black p-4">
      <div className="w-full max-w-2xl bg-gray-900 rounded-lg shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold text-white mb-2">
            Voice Uploader
          </h1>
          <p className="text-gray-400">
            Upload your audio files to Vision AI
          </p>
        </div>

        <div className="space-y-6">
          {/* File Input */}
          <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center hover:border-indigo-500 transition-colors">
            <input
              type="file"
              accept="audio/*"
              onChange={handleFileSelect}
              className="hidden"
              id="audio-upload"
            />
            <label htmlFor="audio-upload" className="cursor-pointer block hover:opacity-80 transition-opacity">
              <div className="text-4xl mb-4">🎵</div>
              <p className="text-white text-lg mb-2">
                {selectedFile ? selectedFile.name : 'Click to select an audio file'}
              </p>
              <p className="text-gray-400 text-sm">
                {selectedFile
                  ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB`
                  : 'Supports MP3, WAV, OGG, M4A, AAC, and WEBM'}
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
              Audio uploaded successfully!
            </div>
          )}

          {/* Audio Player */}
          {audioUrl && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white text-center">Audio Preview</h3>
              <div className="bg-gray-800 p-4 rounded-lg">
                <audio
                  ref={audioRef}
                  src={audioUrl}
                  controls
                  className="w-full rounded-lg shadow-lg"
                  preload="metadata"
                >
                  Your browser does not support the audio tag.
                </audio>
              </div>
            </div>
          )}

          {/* Waveform Editor */}
          {audioUrl && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white text-center">Waveform Editor (Drag to create regions)</h3>
              <div className="bg-gray-800 p-4 rounded-lg">
                <div ref={containerRef} className="w-full" />
              </div>

              {regions.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-white">Marked Regions</h4>
                  {regions.map((r) => (
                    <div key={r.id} className="flex items-center justify-between p-2 bg-gray-800 rounded">
                      <button onClick={() => seekTo(r.start)} className="text-indigo-400 hover:text-indigo-300 text-sm">
                        {r.start.toFixed(2)}s - {r.end.toFixed(2)}s
                      </button>
                      <button onClick={() => removeRegion(r.id)} className="text-red-400 hover:text-red-300 text-sm">
                        Remove
                      </button>
                    </div>
                  ))}
                  
                  <div className="flex gap-2">
                    <button
                      onClick={trimAudio}
                      disabled={isProcessing}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                    >
                      {isProcessing ? 'Processing...' : 'Trim Audio'}
                    </button>
                    <button
                      onClick={initFFmpeg}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors duration-200"
                    >
                      Initialize Processor
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Trimmed Audio Player */}
          {trimmedAudioUrl && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white text-center">Trimmed Audio</h3>
              <div className="bg-gray-800 p-4 rounded-lg">
                <audio
                  src={trimmedAudioUrl}
                  controls
                  className="w-full rounded-lg shadow-lg"
                  preload="metadata"
                >
                  Your browser does not support the audio tag.
                </audio>
              </div>
              <div className="text-center">
                <button
                  onClick={downloadTrimmedAudio}
                  className="bg-purple-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-purple-700 transition-colors duration-200"
                >
                  Download Trimmed Audio
                </button>
                <button
                  onClick={resetTrimmedAudio}
                  className="bg-purple-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-purple-700 transition-colors duration-200"
                >
                  Reset Trimmed Audio
                </button>
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
                Upload Audio
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

"use client";

import React, { useState } from 'react';

// Valid video MIME types
const VALID_VIDEO_TYPES = [
  'video/mp4',
  'video/quicktime',  // MOV
  'video/x-msvideo',  // AVI
  'video/x-matroska'  // MKV
];

export default function Uploader() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [error, setError] = useState('');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const validateVideo = (file: File) => {
    if (!VALID_VIDEO_TYPES.includes(file.type)) {
      setError('Invalid file type. Please upload MP4, MOV, AVI, or MKV.');
      return false;
    }

    const maxSize = 320 * 1024 * 1024; // maximum size of 320MB
    if (file.size > maxSize) {
      setError('File is too large. Maximum size is 320MB.');
      return false;
    }

    return true;
  };

  // handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // clear previous errors
      setError('');
      // validate video
      if (validateVideo(file)) {
        setSelectedFile(file);
        // Create video URL immediately for preview
        const url = URL.createObjectURL(file);
        setVideoUrl(url);
      }
    }
  };

  const handleUpload = () => {
    if (!selectedFile) {
      setError('Please select a video file');
      return;
    }
    setError('');
    setUploadSuccess(true);
    
    // hide upload success message after 3 seconds
    setTimeout(() => setUploadSuccess(false), 3000);
  };

  const resetUpload = () => {
    // Clean up video URL to prevent memory leaks
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
    }
    setSelectedFile(null);
    setUploadSuccess(false);
    setError('');
    setVideoUrl(null);
    
    // Clear the file input to allow selecting the same file again
    const fileInput = document.getElementById('video-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-black p-4">
      <div className="w-full max-w-2xl bg-gray-900 rounded-lg shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold text-white mb-2">
            Video Uploader
          </h1>
          <p className="text-gray-400">
            Upload your video files to Vision AI
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
                  src={videoUrl}
                  controls
                  className="w-full rounded-lg shadow-lg"
                  style={{ maxHeight: '400px' }}
                  preload="metadata"
                >
                  Your browser does not support the video tag.
                </video>
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

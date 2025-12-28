// ============================================
// Kalimba Hero - Audio Detection Hook
// ============================================
// Uses Pitchy for real-time pitch detection from microphone

import { useState, useEffect, useRef, useCallback } from 'react';
import { PitchDetector } from 'pitchy';
import type { DetectedPitch } from '@/types/game';
import { findClosestKey, isInKalimbaRange } from '@/utils/frequencyMap';

interface UseAudioDetectionOptions {
  enabled?: boolean;
  clarityThreshold?: number;  // Minimum clarity to consider a valid pitch (0-1)
  pitchTolerance?: number;    // Cents tolerance for note matching
  sampleRate?: number;
  fftSize?: number;
}

interface UseAudioDetectionReturn {
  isListening: boolean;
  isSupported: boolean;
  currentPitch: DetectedPitch | null;
  error: string | null;
  startListening: () => Promise<void>;
  stopListening: () => void;
  requestPermission: () => Promise<boolean>;
}

export const useAudioDetection = (
  options: UseAudioDetectionOptions = {}
): UseAudioDetectionReturn => {
  const {
    enabled = true,
    clarityThreshold = 0.85,
    pitchTolerance = 15,
    sampleRate = 44100,
    fftSize = 2048,
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [currentPitch, setCurrentPitch] = useState<DetectedPitch | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Refs for audio context and stream
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<PitchDetector<Float32Array> | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const dataArrayRef = useRef<Float32Array | null>(null);

  // Check browser support
  useEffect(() => {
    const supported = !!(
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia &&
      window.AudioContext
    );
    setIsSupported(supported);
    if (!supported) {
      setError('Audio detection is not supported in this browser');
    }
  }, []);

  // Request microphone permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Immediately stop the stream, we just wanted permission
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (err) {
      console.error('Microphone permission denied:', err);
      setError('Microphone permission denied');
      return false;
    }
  }, []);

  // Pitch detection loop
  const detectPitch = useCallback(() => {
    if (!analyserRef.current || !detectorRef.current || !dataArrayRef.current) {
      return;
    }

    // Get time-domain data
    analyserRef.current.getFloatTimeDomainData(dataArrayRef.current);

    // Detect pitch
    const [frequency, clarity] = detectorRef.current.findPitch(
      dataArrayRef.current,
      sampleRate
    );

    // Only process if clarity is above threshold
    if (clarity >= clarityThreshold && frequency > 0) {
      // Check if frequency is in kalimba range
      if (isInKalimbaRange(frequency)) {
        const match = findClosestKey(frequency, pitchTolerance);
        
        if (match) {
          setCurrentPitch({
            frequency,
            clarity,
            noteName: match.key.noteName,
            cents: match.cents,
            timestamp: performance.now(),
          });
        } else {
          // Frequency detected but no matching kalimba key
          setCurrentPitch({
            frequency,
            clarity,
            noteName: '-',
            cents: 0,
            timestamp: performance.now(),
          });
        }
      } else {
        // Frequency outside kalimba range
        setCurrentPitch(null);
      }
    } else {
      // No clear pitch detected
      setCurrentPitch(null);
    }

    // Continue loop
    animationFrameRef.current = requestAnimationFrame(detectPitch);
  }, [clarityThreshold, pitchTolerance, sampleRate]);

  // Start listening
  const startListening = useCallback(async () => {
    if (!isSupported || !enabled) return;
    if (isListening) return;

    try {
      setError(null);

      // Get microphone stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      streamRef.current = stream;

      // Create audio context
      const audioContext = new AudioContext({ sampleRate });
      audioContextRef.current = audioContext;

      // Create analyser node
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = fftSize;
      analyserRef.current = analyser;

      // Connect microphone to analyser
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      // Create pitch detector
      detectorRef.current = PitchDetector.forFloat32Array(analyser.fftSize);
      dataArrayRef.current = new Float32Array(analyser.fftSize);

      setIsListening(true);

      // Start detection loop
      detectPitch();
    } catch (err) {
      console.error('Failed to start audio detection:', err);
      setError('Failed to access microphone');
      setIsListening(false);
    }
  }, [isSupported, enabled, isListening, sampleRate, fftSize, detectPitch]);

  // Stop listening
  const stopListening = useCallback(() => {
    // Cancel animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Stop media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Clear refs
    analyserRef.current = null;
    detectorRef.current = null;
    dataArrayRef.current = null;

    setIsListening(false);
    setCurrentPitch(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  // Auto-stop when disabled
  useEffect(() => {
    if (!enabled && isListening) {
      stopListening();
    }
  }, [enabled, isListening, stopListening]);

  return {
    isListening,
    isSupported,
    currentPitch,
    error,
    startListening,
    stopListening,
    requestPermission,
  };
};

export default useAudioDetection;







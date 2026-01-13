// ============================================
// Kalimba Hero - Audio Detection Hook
// ============================================
// Uses Pitchy for real-time pitch detection from microphone

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { PitchDetector } from 'pitchy';
import type { DetectedPitch, KalimbaKey } from '@/types/game';
import { findClosestKey, isInKalimbaRange, getKalimbaConfig } from '@/utils/frequencyMap';
import { HARDWARE_PRESETS } from '@/utils/hardwarePresets';
import { useGameStore } from '@/stores/gameStore';

interface UseAudioDetectionOptions {
  enabled?: boolean;
  clarityThreshold?: number;  // Minimum clarity to consider a valid pitch (0-1)
  pitchTolerance?: number;    // Cents tolerance for note matching
  volumeThreshold?: number;   // Minimum RMS volume level (0-1)
  sampleRate?: number;
  fftSize?: number;
  kalimbaKeys?: KalimbaKey[]; // Optional override for kalimba keys
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
    volumeThreshold = 0.003,
    sampleRate = 44100,
    fftSize = 2048,
  } = options;

  // Get settings for dynamic key generation
  const settings = useGameStore(state => state.settings);

  // Generate kalimba keys dynamically from settings (or use override)
  const dynamicKeys = useMemo(() => {
    if (options.kalimbaKeys && options.kalimbaKeys.length > 0) {
      return options.kalimbaKeys;
    }
    const preset = HARDWARE_PRESETS[settings.hardwarePresetId] || HARDWARE_PRESETS['17'];
    return getKalimbaConfig(preset.tinesCount, settings.userTuning);
  }, [settings.hardwarePresetId, settings.userTuning, options.kalimbaKeys]);

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
  const isListeningRef = useRef(false);

  // Refs for options to avoid stale closures
  const clarityThresholdRef = useRef(clarityThreshold);
  const pitchToleranceRef = useRef(pitchTolerance);
  const volumeThresholdRef = useRef(volumeThreshold);

  useEffect(() => {
    clarityThresholdRef.current = clarityThreshold;
  }, [clarityThreshold]);

  useEffect(() => {
    pitchToleranceRef.current = pitchTolerance;
  }, [pitchTolerance]);

  useEffect(() => {
    volumeThresholdRef.current = volumeThreshold;
  }, [volumeThreshold]);

  // Ref for dynamic keys to avoid stale closures
  const kalimbaKeysRef = useRef<KalimbaKey[]>(dynamicKeys);
  useEffect(() => {
    kalimbaKeysRef.current = dynamicKeys;
  }, [dynamicKeys]);

  // Check browser support
  useEffect(() => {
    const supported = !!(
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === 'function' &&
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
    if (!isListeningRef.current || !analyserRef.current || !detectorRef.current || !dataArrayRef.current || !audioContextRef.current) {
      return;
    }

    // Get time-domain data
    analyserRef.current.getFloatTimeDomainData(dataArrayRef.current);

    // Calculate RMS volume (amplitude)
    let sum = 0;
    for (let i = 0; i < dataArrayRef.current.length; i++) {
      sum += dataArrayRef.current[i] * dataArrayRef.current[i];
    }
    const rms = Math.sqrt(sum / dataArrayRef.current.length);

    // Detect pitch
    const [frequency, clarity] = detectorRef.current.findPitch(
      dataArrayRef.current as any,
      audioContextRef.current.sampleRate
    );

    // Only process if clarity is high and frequency is plausible
    if (clarity >= clarityThresholdRef.current && frequency > 50 && frequency < 3200) {
      const passesVolume = rms >= volumeThresholdRef.current;

      if (passesVolume) {
        // Check if frequency is in kalimba range and we have keys configured
        if (isInKalimbaRange(frequency) && kalimbaKeysRef.current.length > 0) {
          const match = findClosestKey(frequency, kalimbaKeysRef.current, pitchToleranceRef.current);

          if (match) {
            console.log(`✅ ${match.key.noteName}: ${frequency.toFixed(1)}Hz (Vol: ${(rms * 100).toFixed(2)}%)`);
            setCurrentPitch({
              frequency,
              clarity,
              noteName: match.key.noteName,
              cents: match.cents,
              volume: rms,
              timestamp: performance.now(),
            });
          } else {
            // Frequency detected but no matching kalimba key within tolerance
            setCurrentPitch({
              frequency,
              clarity,
              noteName: '-',
              cents: 0,
              volume: rms,
              timestamp: performance.now(),
            });
          }
        } else {
          // Frequency outside kalimba range but loud
          // console.log(`Rejected (Range): ${frequency.toFixed(2)}Hz (Vol: ${(rms * 100).toFixed(2)}%)`);
          setCurrentPitch(null);
        }
      } else {
        // Log what's being rejected by volume so we can adjust
        if (frequency < 2000) { // Don't log quiet noise spikes
          // console.log(`Rejected (Low Vol): ${frequency.toFixed(2)}Hz (Vol: ${(rms * 100).toFixed(2)}%)`);
        }
        setCurrentPitch(null);
      }
    } else {
      // No clear pitch detected
      setCurrentPitch(null);
    }

    // Continue loop
    animationFrameRef.current = requestAnimationFrame(detectPitch);
  }, []);

  // Start listening
  const startListening = useCallback(async () => {
    if (!isSupported) return;
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

      // Ensure audio context is running (required by some browsers)
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      audioContextRef.current = audioContext;

      // Create analyser node
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = fftSize;
      analyserRef.current = analyser;

      // Create High Pass Filter to remove mains hum (60Hz) and low room noise
      const highPassFilter = audioContext.createBiquadFilter();
      highPassFilter.type = 'highpass';
      highPassFilter.frequency.setValueAtTime(150, audioContext.currentTime); // Kalimba lowest note starts higher

      // Connect microphone -> Filter -> Analyser
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(highPassFilter);
      highPassFilter.connect(analyser);

      // Create pitch detector
      detectorRef.current = PitchDetector.forFloat32Array(analyser.fftSize);
      dataArrayRef.current = new Float32Array(analyser.fftSize);

      setIsListening(true);
      isListeningRef.current = true;

      console.log('Audio detection started successfully');

      // Start detection loop
      detectPitch();
    } catch (err) {
      console.error('Failed to start audio detection:', err);
      setError('Failed to access microphone');
      setIsListening(false);
      isListeningRef.current = false;
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
    isListeningRef.current = false;
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

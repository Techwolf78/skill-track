import { useEffect, useRef } from "react";

export function useAudioMonitor(
  isActive: boolean,
  onViolation: (type: "SPEECH", metadata: Record<string, unknown>) => void
) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!isActive) return;

    const initAudio = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const audioContext = new AudioContextClass();
        audioContextRef.current = audioContext;

        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analyserRef.current = analyser;

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        let lastViolationTime = 0;
        const VIOLATION_COOLDOWN = 5000;

        const checkVolume = () => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArray);
          
          let sum = 0;
          for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i];
          }
          const average = sum / bufferLength;

          if (average > 50) { // Threshold for speech/noise
            const now = Date.now();
            if (now - lastViolationTime > VIOLATION_COOLDOWN) {
              onViolation("SPEECH", { volume: average });
              lastViolationTime = now;
            }
          }

          if (isActive) {
            requestAnimationFrame(checkVolume);
          }
        };

        checkVolume();
      } catch (err) {
        console.error("Audio monitoring error:", err);
      }
    };

    initAudio();

    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
      audioContextRef.current?.close();
    };
  }, [isActive, onViolation]);
}

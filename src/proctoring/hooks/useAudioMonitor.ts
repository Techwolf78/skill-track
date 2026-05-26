import { useEffect, useRef } from "react";

const SUSPICIOUS_WORDS = [
  "share screen",
  "screen share",
  "google",
  "search",
  "answer",
  "tell me",
  "what is",
  "help",
  "cheat",
  "copy",
  "options",
  "question",
  "solve",
  "write",
  "read",
  "browser",
  "window"
];

export function useAudioMonitor(
  isActive: boolean,
  onViolation: (type: "SPEECH", metadata: Record<string, unknown>) => void
) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (!isActive) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
        recognitionRef.current = null;
      }
      return;
    }

    const SpeechRecognitionClass = 
      (window as any).SpeechRecognition || 
      (window as any).webkitSpeechRecognition;

    if (SpeechRecognitionClass) {
      // Use Web Speech API (Smart AI local keyword checking)
      const recognition = new SpeechRecognitionClass();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = "en-IN"; // English (India)
      recognitionRef.current = recognition;

      let lastViolationTime = 0;
      const VIOLATION_COOLDOWN = 5000;

      recognition.onresult = (event: any) => {
        const resultIndex = event.resultIndex;
        const transcript = event.results[resultIndex][0].transcript.toLowerCase();
        console.log("🎤 Audio Monitor Transcript:", transcript);
        
        const matchedWord = SUSPICIOUS_WORDS.find(word => transcript.includes(word));
        if (matchedWord) {
          const now = Date.now();
          if (now - lastViolationTime > VIOLATION_COOLDOWN) {
            onViolation("SPEECH", { transcript, matchedWord });
            lastViolationTime = now;
          }
        }
      };

      recognition.onend = () => {
        if (isActive && recognitionRef.current) {
          try {
            recognition.start();
          } catch (e) {
            console.error("Failed to restart speech recognition:", e);
          }
        }
      };

      try {
        recognition.start();
      } catch (err) {
        console.error("Speech recognition start failed:", err);
      }

      return () => {
        if (recognitionRef.current) {
          try {
            recognitionRef.current.stop();
          } catch (e) {}
        }
      };
    } else {
      // Fallback to simple volume threshold check
      console.warn("Web Speech API not supported. Falling back to volume threshold audio check.");
      
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
                onViolation("SPEECH", { volume: average, detail: "Simple audio threshold exceeded" });
                lastViolationTime = now;
              }
            }

            if (isActive) {
              setTimeout(checkVolume, 300);
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
    }
  }, [isActive, onViolation]);
}

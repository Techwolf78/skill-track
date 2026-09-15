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

interface SpeechRecognitionResultItem {
  transcript: string;
}

interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResultItem[];
}

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

export function useAudioMonitor(
  isActive: boolean,
  onViolation: (type: "SPEECH", metadata: Record<string, unknown>) => void
) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  useEffect(() => {
    const cleanupMedia = () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onend = null;
          recognitionRef.current.onerror = null;
          recognitionRef.current.onresult = null;
          recognitionRef.current.abort();
        } catch (e) {
          void e;
        }
        recognitionRef.current = null;
      }

      if (streamRef.current) {
        try {
          streamRef.current.getTracks().forEach((t) => t.stop());
        } catch (e) {
          void e;
        }
        streamRef.current = null;
      }

      if (audioContextRef.current) {
        try {
          audioContextRef.current.close().catch(() => {});
        } catch (e) {
          void e;
        }
        audioContextRef.current = null;
      }
    };

    if (!isActive) {
      cleanupMedia();
      return;
    }

    const SpeechRecognitionClass = 
      (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionInstance }).SpeechRecognition || 
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionInstance }).webkitSpeechRecognition;

    if (SpeechRecognitionClass) {
      // Use Web Speech API (Smart AI local keyword checking)
      const recognition = new SpeechRecognitionClass();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = "en-IN"; // English (India)
      recognitionRef.current = recognition;

      let lastViolationTime = 0;
      const VIOLATION_COOLDOWN = 5000;

      recognition.onresult = (event: SpeechRecognitionEvent) => {
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
        cleanupMedia();
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
        cleanupMedia();
      };
    }
  }, [isActive, onViolation]);
}

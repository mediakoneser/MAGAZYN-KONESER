import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Mic,
  MicOff,
  Square,
  Play,
  Pause,
  Download,
  Copy,
  Check,
  Sparkles,
  Wand2,
  Volume2,
  VolumeX,
  X,
  ArrowRight,
  RefreshCw,
  HelpCircle,
  Car,
  Tag,
  DollarSign,
  Layers,
  ChevronDown,
  Minimize2,
  Maximize2,
  Radio,
} from "lucide-react";
import { ActiveTabType, PartListingData } from "../types";
import {
  processVoiceCommand,
  speakFeedback,
  VoiceCommandResult,
} from "../utils/voiceCommandProcessor";

interface VoiceAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: ActiveTabType) => void;
  onApplySearchQuery?: (query: string) => void;
  onApplyPartData?: (data: Partial<PartListingData>) => void;
  onTriggerFirestoreSync?: () => void;
  onAddUrgentBossTask?: (title: string, desc: string) => void;
}

export const VoiceAssistantModal: React.FC<VoiceAssistantModalProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
  onApplySearchQuery,
  onApplyPartData,
  onTriggerFirestoreSync,
  onAddUrgentBossTask,
}) => {
  // State
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [lastCommandResult, setLastCommandResult] = useState<VoiceCommandResult | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [parsedPart, setParsedPart] = useState<Partial<PartListingData> | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);

  // Audio Recorder State (MediaRecorder)
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Refs
  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef<boolean>(false);
  const isStartingRef = useRef<boolean>(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Stop Speech Recognition safely
  const stopRecognition = useCallback(() => {
    isStartingRef.current = false;
    isListeningRef.current = false;
    setIsListening(false);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {
        try {
          recognitionRef.current.stop();
        } catch (err) {}
      }
      recognitionRef.current = null;
    }
  }, []);

  // Start Speech Recognition safely
  const startRecognition = useCallback(() => {
    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      alert("Twoja przeglądarka nie obsługuje natywnego Web Speech API. Użyj nagrywania dyktafonem dźwiękowym poniżej.");
      return;
    }

    if (isStartingRef.current || isListeningRef.current) {
      return;
    }

    // Abort and clean any prior instance before creating a fresh one
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
      recognitionRef.current = null;
    }

    isStartingRef.current = true;

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "pl-PL";

      recognition.onstart = () => {
        isStartingRef.current = false;
        isListeningRef.current = true;
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = "";
        for (let i = 0; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript + " ";
        }
        setTranscript(currentTranscript.trim());

        // Process final result or live intent
        const latestResult = event.results[event.results.length - 1];
        if (latestResult && latestResult.isFinal) {
          handleExecuteVoiceCommand(latestResult[0].transcript);
        }
      };

      recognition.onerror = (event: any) => {
        isStartingRef.current = false;
        if (event.error !== "no-speech") {
          isListeningRef.current = false;
          setIsListening(false);
        }
      };

      recognition.onend = () => {
        isStartingRef.current = false;
        isListeningRef.current = false;
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      setTranscript("");
      recognition.start();
    } catch (e: any) {
      isStartingRef.current = false;
      if (e?.name === "InvalidStateError" || e?.message?.includes("already started")) {
        // Recognition is already running in browser
        isListeningRef.current = true;
        setIsListening(true);
      } else {
        console.warn("Speech recognition initialization notice:", e);
        isListeningRef.current = false;
        setIsListening(false);
      }
    }
  }, []);

  // Cleanup on unmount or when modal closes
  useEffect(() => {
    return () => {
      stopRecognition();
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [stopRecognition]);

  // Timer for audio recording
  useEffect(() => {
    if (isRecordingAudio) {
      setRecordingSeconds(0);
      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isRecordingAudio]);

  // Execute recognized voice command
  const handleExecuteVoiceCommand = (text: string) => {
    const result = processVoiceCommand(text);
    setLastCommandResult(result);

    // Speak confirmation
    speakFeedback(result.feedbackMessage, !isMuted);

    if (result.action === "NAVIGATE" && result.targetTab) {
      onNavigateTab(result.targetTab);
    } else if (result.action === "SEARCH" && result.searchQuery) {
      if (onApplySearchQuery) {
        onApplySearchQuery(result.searchQuery);
      }
      onNavigateTab("magazyn");
    } else if (result.action === "SYNC") {
      if (onTriggerFirestoreSync) {
        onTriggerFirestoreSync();
      }
    } else if (result.action === "URGENT_TASK" && result.taskTitle) {
      if (onAddUrgentBossTask) {
        onAddUrgentBossTask(result.taskTitle, `Podyktowane głosem z dyktafonu: ${text}`);
      }
    } else if (result.action === "PARSE_PART" && result.parsedPart) {
      setParsedPart(result.parsedPart);
    }
  };

  // Toggle Live Speech Recognition safely
  const toggleSpeechRecognition = useCallback(() => {
    if (isListening || isListeningRef.current) {
      stopRecognition();
    } else {
      startRecognition();
    }
  }, [isListening, startRecognition, stopRecognition]);

  // Start Raw Audio Recorder (MediaRecorder)
  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(250);
      mediaRecorderRef.current = mediaRecorder;
      setIsRecordingAudio(true);

      // Also start speech recognition if not running
      if (!isListeningRef.current && !isStartingRef.current) {
        startRecognition();
      }
    } catch (err) {
      console.error("MediaRecorder error:", err);
      alert("Brak dostępu do mikrofonu. Upewnij się, że zezwolono na użycie mikrofonu w przeglądarce.");
    }
  };

  // Stop Raw Audio Recorder safely
  const stopAudioRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecordingAudio) {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
      setIsRecordingAudio(false);
    }
    stopRecognition();
  }, [isRecordingAudio, stopRecognition]);

  // Safe modal close
  const handleCloseModal = useCallback(() => {
    stopAudioRecording();
    stopRecognition();
    onClose();
  }, [stopAudioRecording, stopRecognition, onClose]);

  // Copy transcript
  const handleCopy = () => {
    if (!transcript) return;
    navigator.clipboard.writeText(transcript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Apply parsed part data into scanner
  const handleApplyToScanner = () => {
    if (!parsedPart || !onApplyPartData) return;
    onApplyPartData(parsedPart);
    onNavigateTab("skaner");
    handleCloseModal();
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed z-50 transition-all duration-300 ${
        isMinimized
          ? "bottom-4 right-4 w-72"
          : "inset-0 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      }`}
    >
      <div
        className={`bg-[#0b0f19] border border-slate-800 shadow-2xl rounded-2xl flex flex-col overflow-hidden text-slate-100 ${
          isMinimized ? "w-full border-amber-500/40" : "w-full max-w-2xl max-h-[90vh]"
        }`}
      >
        {/* MODAL HEADER */}
        <div className="p-3 sm:p-4 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-amber-500/10 via-slate-900 to-amber-500/10">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-xl border transition ${
                isListening || isRecordingAudio
                  ? "bg-red-500/20 border-red-500/40 text-red-400 animate-pulse"
                  : "bg-amber-400/20 border-amber-400/30 text-amber-400"
              }`}
            >
              <Mic className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black tracking-tight text-white flex items-center gap-1.5">
                  <span>Dyktafon Mowy & Asystent Głosowy</span>
                  {(isListening || isRecordingAudio) && (
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping inline-block" />
                  )}
                </h3>
              </div>
              <p className="text-[11px] text-slate-400">
                Obsługa panelu, dyktowanie opisu części i notatki dźwiękowe (pl-PL)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMuted(!isMuted)}
              title={isMuted ? "Włącz odpowiedź lektora" : "Wycisz lektora"}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-slate-500" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              title={isMinimized ? "Rozwiń okno" : "Zminimalizuj"}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
            >
              {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={handleCloseModal}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* BODY (WHEN NOT MINIMIZED) */}
        {!isMinimized && (
          <div className="p-4 space-y-4 overflow-y-auto flex-1">
            
            {/* RECORDING / DICTATING MAIN CONTROLLER */}
            <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={toggleSpeechRecognition}
                  className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition flex items-center gap-2 cursor-pointer shadow-md ${
                    isListening
                      ? "bg-red-600 hover:bg-red-500 text-white animate-pulse"
                      : "bg-amber-400 hover:bg-amber-300 text-slate-950"
                  }`}
                >
                  {isListening ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  <span>{isListening ? "Zatrzymaj Rozpoznawanie" : "Mów Teraz (Live STT)"}</span>
                </button>

                <button
                  onClick={isRecordingAudio ? stopAudioRecording : startAudioRecording}
                  className={`px-3 py-2.5 rounded-xl font-bold text-xs sm:text-sm border transition flex items-center gap-2 cursor-pointer ${
                    isRecordingAudio
                      ? "bg-red-950/60 border-red-500 text-red-300 animate-pulse"
                      : "bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200"
                  }`}
                >
                  <Radio className={`w-4 h-4 ${isRecordingAudio ? "text-red-400 animate-spin" : "text-amber-400"}`} />
                  <span>
                    {isRecordingAudio
                      ? `Nagrywam Audio (${Math.floor(recordingSeconds / 60)}:${(recordingSeconds % 60).toString().padStart(2, "0")})`
                      : "Nagraj Dyktafonem"}
                  </span>
                </button>
              </div>

              {/* LIVE AUDIO WAVE INDICATOR */}
              <div className="flex items-center gap-1.5 font-mono text-xs text-slate-400">
                {(isListening || isRecordingAudio) && (
                  <div className="flex items-center gap-1 px-2.5 py-1 bg-red-950/40 border border-red-900/40 rounded-full text-red-400 text-[11px]">
                    <span className="w-1.5 h-3 bg-red-400 animate-bounce" />
                    <span className="w-1.5 h-4 bg-red-400 animate-bounce delay-75" />
                    <span className="w-1.5 h-2 bg-red-400 animate-bounce delay-150" />
                    <span className="ml-1 font-bold">MIKROFON AKTYWNY</span>
                  </div>
                )}
                {!isListening && !isRecordingAudio && (
                  <span className="text-[11px] text-slate-500">Kliknij mikrofon i mów po polsku</span>
                )}
              </div>
            </div>

            {/* LIVE TRANSCRIPTION BOX */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-bold flex items-center gap-1">
                  <Wand2 className="w-3.5 h-3.5 text-amber-400" />
                  Transkrypcja na żywo (Rozpoznany tekst):
                </span>
                {transcript && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopy}
                      className="text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                    >
                      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copied ? "Skopiowano" : "Kopiuj"}</span>
                    </button>
                    <button
                      onClick={() => setTranscript("")}
                      className="text-slate-500 hover:text-slate-300 cursor-pointer"
                    >
                      Wyczyść
                    </button>
                  </div>
                )}
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl min-h-[90px] text-sm text-slate-200 leading-relaxed font-sans relative">
                {transcript ? (
                  <p className="whitespace-pre-wrap">{transcript}</p>
                ) : (
                  <p className="text-slate-600 italic">
                    Tutaj pojawi się podyktowany tekst w czasie rzeczywistym...
                  </p>
                )}
              </div>
            </div>

            {/* LAST EXECUTED ACTION FEEDBACK */}
            {lastCommandResult && (
              <div className="p-3 bg-slate-900/60 border border-amber-500/30 rounded-xl flex items-start gap-2.5 text-xs">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold text-amber-300">
                    Akcja Asystenta: [{lastCommandResult.action}]
                  </span>
                  <p className="text-slate-300">{lastCommandResult.feedbackMessage}</p>
                </div>
              </div>
            )}

            {/* PARSED AUTO-PART CARD (AUTO-FILLER FOR SCANNER & EDITORS) */}
            {parsedPart && (
              <div className="p-3.5 bg-emerald-950/20 border border-emerald-500/30 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
                    <Car className="w-4 h-4 text-emerald-400" />
                    <span>Rozpoznano parametry części z Twojego głosu:</span>
                  </div>
                  <button
                    onClick={handleApplyToScanner}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition flex items-center gap-1 cursor-pointer"
                  >
                    <span>Wstaw do Skanera / Formularza</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] font-mono">
                  <div className="bg-black/40 p-1.5 rounded-md border border-slate-800">
                    <span className="text-slate-500 block">Kategoria:</span>
                    <span className="text-white font-bold">{parsedPart.kategoria || "Do uzupełnienia"}</span>
                  </div>
                  <div className="bg-black/40 p-1.5 rounded-md border border-slate-800">
                    <span className="text-slate-500 block">Pojazd:</span>
                    <span className="text-white font-bold">
                      {parsedPart.samochod?.marka || ""} {parsedPart.samochod?.model || ""} {parsedPart.samochod?.rocznik || ""}
                    </span>
                  </div>
                  <div className="bg-black/40 p-1.5 rounded-md border border-slate-800">
                    <span className="text-slate-500 block">Cena Brutto:</span>
                    <span className="text-amber-400 font-bold">{parsedPart.cena?.brutto ? `${parsedPart.cena.brutto} PLN` : "Nie określono"}</span>
                  </div>
                  <div className="bg-black/40 p-1.5 rounded-md border border-slate-800 col-span-2 sm:col-span-3">
                    <span className="text-slate-500 block">Stan techniczny:</span>
                    <span className="text-teal-400 font-bold">{parsedPart.jakosc || "A (Sprawny)"}</span>
                  </div>
                </div>
              </div>
            )}

            {/* AUDIO RECORDER PLAYBACK (IF SOUND RECORDED) */}
            {audioUrl && (
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <audio
                    ref={audioPlayerRef}
                    src={audioUrl}
                    onPlay={() => setIsPlayingAudio(true)}
                    onPause={() => setIsPlayingAudio(false)}
                    onEnded={() => setIsPlayingAudio(false)}
                    controls
                    className="h-8 max-w-[240px] sm:max-w-[320px]"
                  />
                  <span className="text-slate-400 font-mono text-[11px]">Notatka dźwiękowa</span>
                </div>
                <a
                  href={audioUrl}
                  download={`notatka_glosowa_${new Date().toISOString().slice(0, 10)}.webm`}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg flex items-center gap-1 text-xs"
                >
                  <Download className="w-3 h-3" />
                  <span>Zapisz .webm</span>
                </a>
              </div>
            )}

            {/* HELPER CHEATSHEET OF VOICE COMMANDS */}
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/60 text-xs space-y-1.5">
              <span className="font-bold text-slate-300 flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5 text-teal-400" />
                Dostępne komendy głosowe w panelu:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] text-slate-400">
                <div className="p-1.5 bg-slate-900/50 rounded-lg border border-slate-800">
                  <span className="text-amber-300 font-mono">"Otwórz magazyn"</span> / <span className="text-amber-300 font-mono">"skaner"</span> / <span className="text-amber-300 font-mono">"allegro"</span> / <span className="text-amber-300 font-mono">"szef"</span>
                </div>
                <div className="p-1.5 bg-slate-900/50 rounded-lg border border-slate-800">
                  <span className="text-amber-300 font-mono">"Szukaj [część]"</span> (np. "szukaj lampa Fabia")
                </div>
                <div className="p-1.5 bg-slate-900/50 rounded-lg border border-slate-800">
                  <span className="text-amber-300 font-mono">"Synchronizuj Firestore"</span> / <span className="text-amber-300 font-mono">"chmurę"</span>
                </div>
                <div className="p-1.5 bg-slate-900/50 rounded-lg border border-slate-800">
                  <span className="text-amber-300 font-mono">"Pilne zadanie [treść]"</span> (zlecenie dla zespołu)
                </div>
              </div>
            </div>

          </div>
        )}

        {/* MINIMIZED VIEW CONTENT */}
        {isMinimized && (
          <div className="p-3 flex items-center justify-between gap-2">
            <button
              onClick={toggleSpeechRecognition}
              className={`p-2 rounded-xl transition ${
                isListening ? "bg-red-600 text-white animate-pulse" : "bg-amber-400 text-slate-950"
              }`}
            >
              <Mic className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold truncate flex-1">
              {isListening ? "Słucham komendy..." : "Dyktafon w tle"}
            </span>
            <button
              onClick={() => setIsMinimized(false)}
              className="text-xs text-amber-400 hover:underline"
            >
              Rozwiń
            </button>
          </div>
        )}

        {/* FOOTER */}
        {!isMinimized && (
          <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Język: Polski (pl-PL) • Web Speech API & MediaRecorder</span>
            </div>
            <button
              onClick={handleCloseModal}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg transition cursor-pointer"
            >
              Gotowe
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

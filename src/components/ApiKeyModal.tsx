import React, { useState } from "react";
import { Key, Check, ShieldCheck, X } from "lucide-react";

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  onSaveApiKey: (key: string) => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  onClose,
  apiKey,
  onSaveApiKey,
}) => {
  const [val, setVal] = useState(apiKey);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveApiKey(val.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0b0f19] border border-slate-800 rounded-xl max-w-md w-full p-5 space-y-3.5 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-yellow-400" />
            <h3 className="font-bold text-white text-xs font-mono uppercase tracking-wider">
              Klucz API Google Gemini Vision
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white font-bold cursor-pointer text-sm"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed font-mono">
          Klucz API jest bezpiecznie używany do rozpoznawania zdjęć części samochodowych, numerów OEM oraz automatycznej wyceny w standardzie OVOKO PL.
        </p>

        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-300 block font-mono">Klucz Gemini API (opcjonalny dla klienta):</label>
          <input
            type="password"
            value={val}
            onChange={(e) => setVal(e.target.value)}
            placeholder="AIzaSy..."
            className="w-full bg-[#030712] border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-yellow-400 transition"
          />
        </div>

        <div className="bg-[#030712] p-2.5 rounded-lg border border-slate-800 text-[10px] text-slate-400 flex items-start gap-2 font-mono">
          <ShieldCheck className="w-3.5 h-3.5 text-teal-400 shrink-0 mt-0.5" />
          <span>
            W środowisku AI Studio serwer Express automatycznie dysponuje wbudowanym kluczem, a w przypadku wdrożenia na zewnętrznym serwerze (DirectAdmin) możesz podać swój klucz tutaj.
          </span>
        </div>

        <div className="flex gap-2 pt-1 font-mono">
          <button
            onClick={onClose}
            className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs rounded-lg cursor-pointer transition border border-slate-800"
          >
            Anuluj
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black text-xs rounded-lg cursor-pointer transition shadow-xs flex items-center justify-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5 stroke-[3]" />
            <span>Zapisz klucz</span>
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useRef, useEffect, useState } from "react";
import {
  Headphones,
  Send,
  Bot,
  User,
  PhoneCall,
  Sparkles,
  Globe,
  ExternalLink,
  ShieldCheck,
  Search,
} from "lucide-react";
import { ChatMessage, PartItem } from "../types";

interface InfolineTabProps {
  chatMessages: ChatMessage[];
  chatInput: string;
  setChatInput: (val: string) => void;
  isChatTyping: boolean;
  onSendChat: () => void;
  drafts: PartItem[];
  enableSearchGrounding?: boolean;
  setEnableSearchGrounding?: (val: boolean) => void;
}

export const InfolineTab: React.FC<InfolineTabProps> = ({
  chatMessages,
  chatInput,
  setChatInput,
  isChatTyping,
  onSendChat,
  enableSearchGrounding = true,
  setEnableSearchGrounding,
}) => {
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isChatTyping]);

  const quickPrompts = [
    "Czy macie lampę tylną lewą do Skoda Fabia I?",
    "Ile kosztuje teraz używany alternator 120A do Focusa MK2 w Polsce?",
    "Jakie dokumenty są wymagane do legalnej kasacji auta w Mysłakowicach?",
    "Sprawdź rynkową cenę katalizatora lub złomu stalowego.",
    "Czy odbieracie rozbity samochód własną lawetą z Jeleniej Góry i okolic?",
  ];

  return (
    <div className="bg-[#0b0f19] border border-slate-800/90 rounded-xl p-3.5 sm:p-4 space-y-3 shadow-xs">
      {/* HEADER */}
      <div className="border-b border-slate-800 pb-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-teal-500/20 text-teal-300 rounded-lg border border-teal-500/30">
            <Headphones className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2 font-mono">
                Smart Infolinia AI 24/7 & Google Search Grounding
              </h2>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" /> LIVE
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              PHU U Konesera, Mysłakowice | Odpowiedzi oparte na stanie magazynu WMS oraz bieżących cenach Google
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {setEnableSearchGrounding && (
            <button
              onClick={() => setEnableSearchGrounding(!enableSearchGrounding)}
              className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold flex items-center gap-1.5 border transition cursor-pointer ${
                enableSearchGrounding
                  ? "bg-blue-500/15 text-blue-300 border-blue-500/30 hover:bg-blue-500/25"
                  : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
              }`}
              title="Włącz lub wyłącz pobieranie danych na żywo z wyszukiwarki Google"
            >
              <Globe className="w-3.5 h-3.5 text-blue-400" />
              <span>Google Search: {enableSearchGrounding ? "ON" : "OFF"}</span>
            </button>
          )}

          <a
            href="tel:533533443"
            className="text-xs font-mono font-bold text-yellow-400 bg-yellow-400/10 hover:bg-yellow-400/20 px-3 py-1 rounded-md border border-yellow-400/25 transition flex items-center gap-1.5 w-fit"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>533 533 443</span>
          </a>
        </div>
      </div>

      {/* QUICK PROMPT CHIPS */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
        <span className="text-[10px] text-slate-400 font-mono font-bold flex items-center gap-1 whitespace-nowrap">
          <Sparkles className="w-3 h-3 text-yellow-400" /> Szybkie pytania:
        </span>
        {quickPrompts.map((qp, idx) => (
          <button
            key={idx}
            onClick={() => {
              setChatInput(qp);
            }}
            className="px-2 py-0.5 bg-[#030712] hover:bg-slate-900 border border-slate-800 hover:border-yellow-400/40 text-slate-300 hover:text-white rounded text-[11px] whitespace-nowrap transition cursor-pointer font-sans"
          >
            {qp}
          </button>
        ))}
      </div>

      {/* CHAT CONTAINER */}
      <div className="bg-[#030712] border border-slate-800/90 rounded-xl p-3 h-[420px] flex flex-col justify-between">
        <div className="overflow-y-auto space-y-3 pr-1.5 scrollbar-thin flex-1">
          {chatMessages.map((msg, index) => {
            const isUser = msg.sender === "user";
            return (
              <div
                key={index}
                className={`flex gap-2 max-w-[88%] ${
                  isUser ? "ml-auto flex-row-reverse" : "mr-auto"
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 text-xs ${
                    isUser
                      ? "bg-yellow-400 text-slate-950 font-bold"
                      : "bg-teal-500/20 text-teal-400 border border-teal-500/30"
                  }`}
                >
                  {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                </div>
                <div className="space-y-1.5">
                  <div
                    className={`p-2.5 rounded-xl text-xs leading-relaxed ${
                      isUser
                        ? "bg-yellow-400 text-slate-950 font-semibold shadow-xs"
                        : "bg-[#070b14] border border-slate-800/90 text-slate-200 shadow-xs"
                    }`}
                  >
                    {msg.text}
                  </div>

                  {/* Grounding sources from Google Search */}
                  {!isUser && msg.sources && msg.sources.length > 0 && (
                    <div className="bg-[#040813] border border-blue-500/20 rounded-lg p-2 text-[10px] space-y-1">
                      <div className="text-blue-400 font-mono font-bold flex items-center gap-1">
                        <Globe className="w-3 h-3" />
                        <span>Źródła cenowe Google Search Grounding:</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.sources.map((src, sIdx) => (
                          <a
                            key={sIdx}
                            href={src.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-300 hover:text-blue-300 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800 flex items-center gap-1 font-mono transition"
                          >
                            <span className="truncate max-w-[180px]">{src.title}</span>
                            <ExternalLink className="w-2.5 h-2.5 text-blue-400 shrink-0" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {isChatTyping && (
            <div className="flex items-center gap-2 text-xs text-teal-400 italic bg-[#070b14] p-2 rounded-lg border border-slate-800/80 w-fit font-mono">
              <Bot className="w-3.5 h-3.5 animate-bounce" />
              <span>Analiza bazy WMS oraz przeszukiwanie aktualnych notowań w Google...</span>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* CHAT INPUT FORM */}
        <div className="pt-2.5 border-t border-slate-800/80 flex gap-2">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSendChat()}
            placeholder="Napisz zapytanie (np. Jaka jest średnia cena lampy do Passata B5 lub stawka za skup aut?)..."
            className="flex-1 bg-[#070b14] border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400 transition"
          />
          <button
            onClick={onSendChat}
            disabled={!chatInput.trim() || isChatTyping}
            className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold text-xs rounded-lg cursor-pointer transition shadow-xs flex items-center gap-1.5 disabled:opacity-50 font-mono"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Wyślij</span>
          </button>
        </div>
      </div>
    </div>
  );
};

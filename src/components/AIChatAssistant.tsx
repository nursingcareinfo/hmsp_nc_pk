import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, X, Send, Sparkles, Search, Loader2, User, Bot, Plus, Check, AlertCircle } from 'lucide-react';
import { geminiService } from '../services/geminiService';
import { dataService } from '../dataService';
import { useUIStore } from '../store';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: any[];
  timestamp: Date;
  parsedData?: {
    type: 'staff' | 'patient';
    data: any;
  };
}

export const AIChatAssistant = () => {
  const { theme } = useUIStore();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I am your NursingCare.pk Karachi Portal Assistant. I help manage home nursing services, including staff, patients, and payroll. You can ask me questions, or even paste raw data to add it to the dashboard.',
      timestamp: new Date(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleAddData = async (type: 'staff' | 'patient', data: any, msgId: string) => {
    try {
      if (type === 'staff') {
        await dataService.addStaff({
          ...data,
          status: 'Active',
          joining_date: new Date().toISOString(),
          official_district: data.district || 'Karachi South',
        });
        toast.success('Staff member added successfully!');
      } else {
        await dataService.addPatient({
          ...data,
          status: 'Active',
          admission_date: new Date().toISOString(),
          district: data.district || 'Karachi South',
        });
        toast.success('Patient record added successfully!');
      }
      
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, parsedData: undefined, content: m.content + '\n\n✅ **Added to dashboard successfully!**' } : m));
      // Trigger a refresh of the dashboard data if needed, but since it's localStorage and App.tsx fetches on mount, 
      // we might need a way to notify App.tsx. For now, a simple reload or state update in store would be better.
      // But App.tsx uses local state for staff/patients.
      window.dispatchEvent(new Event('storage')); // Simple hack to trigger re-fetch if App.tsx listens to storage
    } catch (error) {
      toast.error('Failed to add data');
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setIsLoading(true);

    try {
      // First, try to see if it's raw data to parse
      const parsed = await geminiService.parseRawData(currentInput);
      
      if (parsed.type !== 'unknown') {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `I've detected ${parsed.type} data. Here's a formatted summary:\n\n${Object.entries(parsed.data).map(([k, v]) => `* **${k.replace(/_/g, ' ')}**: ${v}`).join('\n')}\n\nWould you like me to add this to the dashboard?`,
          timestamp: new Date(),
          parsedData: {
            type: parsed.type as 'staff' | 'patient',
            data: parsed.data
          }
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        const response = await geminiService.chatWithSearch(currentInput);
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response.text,
          sources: response.sources,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error while processing your request. Please try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-8 right-24 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className={`absolute bottom-20 right-0 w-[400px] h-[600px] rounded-3xl shadow-2xl border flex flex-col overflow-hidden transition-colors duration-500 ${
              theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'
            }`}
          >
            {/* Header */}
            <div className="bg-teal-600 p-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="font-bold">NursingCare AI</h3>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                    <span className="text-[10px] font-medium opacity-80 uppercase tracking-wider">Online with Data Parsing</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Messages */}
            <div className={`flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar transition-colors ${
              theme === 'dark' ? 'bg-slate-950' : 'bg-slate-50/50'
            }`}>
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] flex gap-3 ${
                      msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      msg.role === 'user' 
                        ? 'bg-teal-100 text-teal-600' 
                        : theme === 'dark' ? 'bg-slate-800 text-slate-400' : 'bg-white border border-slate-200 text-slate-600 shadow-sm'
                    }`}>
                      {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                    </div>
                    <div
                      className={`p-3 rounded-2xl text-sm ${
                        msg.role === 'user'
                          ? 'bg-teal-600 text-white rounded-tr-none shadow-md shadow-teal-100'
                          : theme === 'dark' 
                            ? 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700 shadow-sm'
                            : 'bg-white text-slate-700 rounded-tl-none border border-slate-100 shadow-sm'
                      }`}
                    >
                      <div className={`prose prose-sm max-w-none ${theme === 'dark' ? 'prose-invert' : 'prose-slate'}`}>
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                      
                      {msg.parsedData && (
                        <div className="mt-4 pt-4 border-t border-slate-100/10 flex flex-col gap-2">
                          <div className="flex items-center gap-2 text-[10px] font-bold text-teal-500 uppercase tracking-widest mb-1">
                            <Plus size={12} /> Action Required
                          </div>
                          <button
                            onClick={() => handleAddData(msg.parsedData!.type, msg.parsedData!.data, msg.id)}
                            className="w-full py-2 bg-teal-600 text-white rounded-xl font-bold text-xs hover:bg-teal-700 transition-all flex items-center justify-center gap-2"
                          >
                            <Check size={14} />
                            Add to {msg.parsedData.type === 'staff' ? 'Staff' : 'Patients'}
                          </button>
                        </div>
                      )}

                      {msg.sources && msg.sources.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-100/10">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                            <Search size={10} /> Sources
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {msg.sources.map((source, idx) => (
                              source.web && (
                                <a
                                  key={idx}
                                  href={source.web.uri}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`text-[10px] px-2 py-1 rounded-md transition-colors truncate max-w-[150px] ${
                                    theme === 'dark' ? 'bg-slate-700 text-slate-300 hover:bg-teal-900/30 hover:text-teal-400' : 'bg-slate-100 text-slate-600 hover:bg-teal-50 hover:text-teal-600'
                                  }`}
                                >
                                  {source.web.title || 'Source'}
                                </a>
                              )
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className={`p-4 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-3 border ${
                    theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'
                  }`}>
                    <Loader2 size={16} className="animate-spin text-teal-600" />
                    <span className="text-xs text-slate-500 font-medium">Analyzing data...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className={`p-4 border-t transition-colors ${
              theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'
            }`}>
              <div className="relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Paste raw data or ask a question..."
                  className={`w-full border-none rounded-2xl pl-4 pr-12 py-3 text-sm focus:ring-2 focus:ring-teal-500 transition-all ${
                    theme === 'dark' ? 'bg-slate-800 text-white placeholder:text-slate-500' : 'bg-slate-50 text-slate-900'
                  }`}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send size={18} />
                </button>
              </div>
              <p className="text-[10px] text-center text-slate-400 mt-3 font-medium">
                AI Data Extraction Enabled
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-2xl shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 ${
          isOpen 
            ? 'bg-slate-900 text-white rotate-90' 
            : theme === 'dark' ? 'bg-slate-800 text-teal-400 border border-slate-700' : 'bg-white text-teal-600 border border-teal-100 shadow-teal-100'
        }`}
      >
        {isOpen ? <X size={28} /> : <MessageSquare size={28} />}
        {!isOpen && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full border-2 border-white animate-bounce" />
        )}
      </button>
    </div>
  );
};

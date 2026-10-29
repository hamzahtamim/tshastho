"use client";

import { useEffect, useState, useRef } from "react";
import { Search, MessageSquare, ArrowLeft, Send, User, CheckCircle2 } from "lucide-react";

export default function DoctorChatPage() {
  const [threads, setThreads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // Chat State
  const [selectedThread, setSelectedThread] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load Threads
  const fetchThreads = async () => {
    try {
      const res = await fetch('/api/chat/threads');
      const data = await res.json();
      if (data.success) setThreads(data.threads || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchThreads();
  }, []);

  // Load Messages when a thread is selected
  const openThread = async (thread: any) => {
    setSelectedThread(thread);
    setLoadingMsgs(true);
    try {
      const res = await fetch(`/api/chat/threads/${thread.id}/messages`);
      const data = await res.json();
      if (data.success) setMessages(data.messages || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMsgs(false);
    }
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedThread) return;

    setSending(true);
    try {
      const res = await fetch(`/api/chat/threads/${selectedThread.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: newMessage.trim() })
      });
      const data = await res.json();
      
      if (data.success) {
        setMessages([...messages, data.message]);
        setNewMessage("");
        fetchThreads(); // Update thread list snippet
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const filteredThreads = threads.filter(t => 
    t.patient?.name?.toLowerCase().includes(search.toLowerCase()) || 
    t.patient?.phone?.includes(search)
  );

  // ================= VIEW 1: CHAT INTERFACE =================
  if (selectedThread) {
    return (
      <div className="flex flex-col h-[100dvh] bg-[#efeae2] fixed inset-0 z-[100]">
        {/* Chat Header */}
        <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 shrink-0 shadow-sm">
          <button onClick={() => setSelectedThread(null)} className="p-2 hover:bg-slate-100 rounded-full transition">
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
            {selectedThread.patient?.name?.charAt(0).toUpperCase() || 'P'}
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-slate-800">{selectedThread.patient?.name || 'Patient'}</h3>
            <p className="text-xs text-slate-500">{selectedThread.patient?.phone || 'Patient Account'}</p>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 flex flex-col">
          {loadingMsgs ? (
            <div className="text-center text-slate-500 text-sm mt-10">Loading messages...</div>
          ) : messages.length === 0 ? (
            <div className="text-center text-slate-500 text-sm bg-white/80 p-4 rounded-xl mx-auto w-fit shadow-sm border border-slate-200 my-auto">
              Say hi to start the conversation!
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.senderRole === 'DOCTOR';
              return (
                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm shadow-sm ${isMe ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-white text-slate-800 rounded-bl-sm'}`}>
                    <p>{msg.message}</p>
                    <span className={`text-[10px] mt-1 block ${isMe ? 'text-blue-200 text-right' : 'text-slate-400'}`}>
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input Box - Fixed at bottom */}
        <div className="bg-white p-3 pb-safe border-t border-slate-200 shrink-0">
          <form onSubmit={handleSendMessage} className="flex items-center gap-2 max-w-4xl mx-auto w-full">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 bg-slate-100 border border-slate-200 rounded-full px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button 
              type="submit" 
              disabled={!newMessage.trim() || sending}
              className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 transition disabled:opacity-50 shadow-md shrink-0"
            >
              <Send size={20} className={sending ? "opacity-50" : "ml-1"} />
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ================= VIEW 2: THREAD LIST =================
  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto min-h-[80vh] flex flex-col">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Messages</h1>
        <p className="text-slate-500 text-sm">Communicate with your patients securely.</p>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input 
          type="text" 
          placeholder="Search patients..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm shadow-sm"
        />
      </div>

      {loading ? (
        <div className="text-center text-slate-500 mt-10">Loading conversations...</div>
      ) : filteredThreads.length === 0 ? (
        <div className="flex-1 bg-white rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center p-8 text-center min-h-[40vh]">
          <div className="w-24 h-24 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-6">
            <MessageSquare size={40} />
          </div>
          <h3 className="text-slate-800 font-bold text-2xl mb-2">No conversations yet</h3>
          <p className="text-slate-500 text-sm mb-8 max-w-md">
            Your inbox is empty. When you start a telemedicine session or message a patient, the conversation will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredThreads.map((thread) => {
            const hasUnread = thread.doctorUnread > 0;
            return (
              <div 
                key={thread.id} 
                onClick={() => openThread(thread)}
                className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition cursor-pointer flex items-center gap-4"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
                  {thread.patient?.name?.charAt(0).toUpperCase() || 'P'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <h3 className="font-bold text-slate-800 truncate">{thread.patient?.name || 'Patient'}</h3>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {thread.lastMessageAt ? new Date(thread.lastMessageAt).toLocaleDateString([], { month: 'short', day: 'numeric' }) : ''}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className={`text-sm truncate pr-4 ${hasUnread ? 'text-slate-800 font-semibold' : 'text-slate-500'}`}>
                      {thread.lastMessage || 'Started a conversation'}
                    </p>
                    {hasUnread && (
                      <span className="w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center flex-shrink-0">
                        {thread.doctorUnread}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

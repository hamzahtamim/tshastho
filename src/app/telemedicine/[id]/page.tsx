"use client";

import { LiveKitRoom, VideoConference } from '@livekit/components-react';
import '@livekit/components-styles';


import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import {
  ArrowLeft, Video, Phone, MessageSquare, Send, X,
  Mic, MicOff, VideoOff, PhoneOff, Clock, User, CheckCircle, FilePlus
} from "lucide-react";

export default function TelemedicineRoomPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const sessionId = params.id as string;

  const [session, setSession] = useState<any>(null);
  const [lkToken, setLkToken] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isLKConnected, setIsLKConnected] = useState(false);
  const [connectTimeout, setConnectTimeout] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [messages, setMessages] = useState<any[]>([]);
  const [isDoctor, setIsDoctor] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"video" | "chat">("video");
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  
  // Live Timer Effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (session?.status === 'ACTIVE') {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [session?.status]);

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const load = async () => {
    const res = await fetch(`/api/telemedicine/${sessionId}`, { credentials: "include" });
    if (!res.ok) { setLoading(false); return; }
    const data = await res.json();
    setSession(data.session);
    setMessages(data.messages || []);
    setIsDoctor(data.isDoctor);
    setLoading(false);
  };

  const loadMessages = async () => {
    const res = await fetch(`/api/telemedicine/${sessionId}/messages`, { credentials: "include" });
    if (res.ok) {
      const data = await res.json();
      setMessages(data.messages || []);
    }
  };

  useEffect(() => {
    if (!user || !sessionId) return;
    load();
  }, [user, sessionId]);

  // Poll messages every 5 seconds
  useEffect(() => {
    if (!user || !sessionId) return;
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [user, sessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  
  // Poll session status every 5 seconds to update UI when other party joins/starts
  useEffect(() => {
    if (!user || !sessionId) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/telemedicine/${sessionId}`, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          if (data.session) {
            setSession((prev: any) => {
              if (!prev) return data.session;
              // শুধুমাত্র তখনই আপডেট করবে যখন স্ট্যাটাস বা জয়েন স্ট্যাটাস পরিবর্তন হবে
              if (prev.status !== data.session.status || prev.doctorJoined !== data.session.doctorJoined || prev.patientJoined !== data.session.patientJoined) {
                return data.session;
              }
              return prev;
            });
          }
        }
      } catch (e) {}
    }, 5000);
    return () => clearInterval(interval);
  }, [user, sessionId]);

  
  useEffect(() => {
    if (!session) return;
    
    // showVideoFrame ভ্যারিয়েবলটি এখানেই ক্যালকুলেট করে নিচ্ছি
    const hasJoined = isDoctor ? session.doctorJoined : session.patientJoined;
    const isActive = session.status === "ACTIVE";
    const showVideo = hasJoined || isActive || session.status === "WAITING" || (session.doctorJoined && session.patientJoined);
    
    if (!showVideo) return;

    const fetchToken = async () => {
      try {
        const res = await fetch(`/api/telemedicine/${session.id}/token`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
        if (data.token) {
          setLkToken(data.token);
        } else {
          console.error("Token API Error:", data);
        }
        }
      } catch (err) {
        console.error('Failed to fetch LiveKit token', err);
      }
    };

    if (!lkToken && showVideoFrame) {
      fetchToken();
    }
  }, [session?.id, user, isDoctor, lkToken]);

  
  useEffect(() => {
    if (lkToken && !isLKConnected) {
      const timer = setTimeout(() => {
        if (!isLKConnected) setConnectTimeout(true);
      }, 10000); // ১০ সেকেন্ড
      return () => clearTimeout(timer);
    } else {
      setConnectTimeout(false);
    }
  }, [lkToken, isLKConnected]);

  const handleJoin = async () => {
    setActionLoading(true);
    await fetch(`/api/telemedicine/${sessionId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ action: "JOIN" }),
    });
    setActionLoading(false);
    load();
  };

  const handleStart = async () => {
    if (!confirm("Start the consultation?")) return;
    setActionLoading(true);
    await fetch(`/api/telemedicine/${sessionId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ action: "START" }),
    });
    setActionLoading(false);
    load();
  };

  
  

const handleEnd = async (skipConfirm = false) => {
    if (!skipConfirm && !confirm("Are you sure you want to end the consultation?")) return;
    setLkToken(null); // Unmount LiveKitRoom immediately
    setIsLKConnected(false);
    setActionLoading(true);
    try {
      await fetch(`/api/telemedicine/${sessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "END" }),
      });
      load(); // সেশন স্ট্যাটাস আপডেট করা
    } catch (error) {
      console.error("Failed to end session:", error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm("Cancel this session?")) return;
    setActionLoading(true);
    await fetch(`/api/telemedicine/${sessionId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ action: "CANCEL" }),
    });
    setActionLoading(false);
    load();
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    setSending(true);
    const res = await fetch(`/api/telemedicine/${sessionId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ message: newMessage }),
    });
    setSending(false);
    if (res.ok) {
      setNewMessage("");
      loadMessages();
    }
  };

  if (loading) return <div className="p-6 text-center text-slate-500">Loading...</div>;
  if (!session) return <div className="p-6 text-center text-slate-500">Session not found</div>;

  const statusColor = (s: string) => {
    switch (s) {
      case "ACTIVE": return "bg-red-100 text-red-700";
      case "WAITING": return "bg-amber-100 text-amber-700";
      case "SCHEDULED": return "bg-blue-100 text-blue-700";
      case "COMPLETED": return "bg-green-100 text-green-700";
      default: return "bg-slate-100 text-slate-700";
    }
  };

  const canJoin = ["SCHEDULED", "WAITING"].includes(session.status);
  const isActive = session.status === "ACTIVE";
  const hasJoined = isDoctor ? session.doctorJoined : session.patientJoined;
  const showJoinButtons = !hasJoined && !isActive && ["SCHEDULED", "WAITING"].includes(session.status);
  const showVideoFrame = hasJoined || isActive || session.status === "WAITING" || (session.doctorJoined && session.patientJoined);
  const isDone = ["COMPLETED", "CANCELLED", "MISSED"].includes(session.status);

  

// PART2

  

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Premium Header */}
      <div className="bg-[#0f172a]/95 backdrop-blur-md text-white px-4 py-3 flex items-center justify-between flex-shrink-0 border-b border-slate-700/50 shadow-lg z-10 sticky top-0">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-300 hover:text-white">
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold shadow-inner">
              {(isDoctor ? session.patient?.name : session.doctor?.user?.name)?.charAt(0) || 'U'}
            </div>
            <div>
              <div className="font-bold text-sm tracking-wide">
                {isDoctor ? session.patient?.name : `Dr. ${session.doctor?.user?.name}`}
              </div>
              <div className="text-[11px] text-slate-400 flex items-center gap-2">
                <span>{session.type}</span>
                <span className="w-1 h-1 rounded-full bg-slate-500"></span>
                <span>{session.roomId.slice(0, 8)}...</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {session.status === 'ACTIVE' && (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-full">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              <span className="text-xs font-mono text-red-400 font-medium">{formatDuration(callDuration)}</span>
            </div>
          )}
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider ${statusColor(session.status)}`}>
            {session.status}
          </span>
        </div>
      </div>

      {/* Tab Switch */}
      <div className="bg-slate-800 px-4 flex gap-2 pb-2 flex-shrink-0">
        <button onClick={() => setTab("video")}
          className={`flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 ${
            tab === "video" ? "bg-blue-600 text-white" : "text-slate-300"
          }`}>
          <Video size={14} /> Video
        </button>
        <button onClick={() => setTab("chat")}
          className={`flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 ${
            tab === "chat" ? "bg-blue-600 text-white" : "text-slate-300"
          }`}>
          <MessageSquare size={14} /> Chat ({messages.length})
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {tab === "video" && (
          <div className="flex-1 flex flex-col">
            {showJoinButtons && (
              <div className="flex-1 flex items-center justify-center p-6">
                <div className="text-center max-w-md">
                  <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Video size={32} className="text-white" />
                  </div>
                  <h2 className="text-white text-xl font-bold mb-2">Ready to join?</h2>
                  <p className="text-slate-400 text-sm mb-6">
                    {isDoctor
                      ? "Start the consultation when the patient is ready."
                      : "The doctor will start the consultation shortly."}
                  </p>
                  <div className="flex gap-3 justify-center">
                    <button onClick={handleJoin} disabled={actionLoading}
                      className="bg-blue-600 text-white px-6 py-3 rounded-xl font-medium disabled:opacity-50">
                      Join Room
                    </button>
                    {isDoctor && (
                      <button onClick={handleStart} disabled={actionLoading}
                        className="bg-green-600 text-white px-6 py-3 rounded-xl font-medium disabled:opacity-50">
                        Start Call
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {showVideoFrame && (
              <div className="flex-1 relative w-full h-full min-h-[500px] bg-slate-900 overflow-hidden flex flex-col" data-lk-theme="default">
                {connectionError ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                    <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                      <X size={32} />
                    </div>
                    <h3 className="text-white text-lg font-bold mb-2">Connection Failed</h3>
                    <p className="text-slate-400 text-sm mb-6 max-w-sm">{connectionError}</p>
                    <button onClick={() => window.location.reload()} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-medium">
                      Try Again
                    </button>
                  </div>
                ) : !lkToken ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-300">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="font-medium animate-pulse">Connecting to secure video room...</p>
                  </div>
                ) : (
                  <LiveKitRoom
                    key={session.id}
                    video={camOn}
                    audio={micOn}
                    token={lkToken}
                    serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
                    onDisconnected={() => {
                      setIsLKConnected(false);
                      handleEnd(true);
                    }}
                    onError={(err) => {
                      console.error("LiveKit Error:", err);
                      setConnectionError(err.message || "Failed to connect to video room");
                    }}
                    style={{ height: '100%', width: '100%' }}
                  >
                    <VideoConference />
                  </LiveKitRoom>
                )}
              </div>
            )}

            {isDone && (
              <div className="flex-1 flex items-center justify-center p-6">
                <div className="text-center">
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${
                    session.status === "COMPLETED" ? "bg-green-600" : "bg-slate-600"
                  }`}>
                    {session.status === "COMPLETED" ? <CheckCircle size={32} className="text-white" /> : <X size={32} className="text-white" />}
                  </div>
                  <h2 className="text-white text-xl font-bold mb-1">
                    {session.status === "COMPLETED" ? "Consultation Completed" : session.status}
                  </h2>
                  {session.duration && (
                    <p className="text-slate-400 text-sm flex items-center justify-center gap-1 mt-1">
                      <Clock size={12} /> Duration: {Math.floor(session.duration / 60)} min
                    </p>
                  )}

              {isDoctor && session.status === "COMPLETED" && (
                <div className="mt-6 animate-slide-up">
                  <Link href={`/doctor/prescriptions/new?patientId=${session.patientId}&appointmentId=${session.appointmentId || ''}`} className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-blue-500/30 transition-all w-full sm:w-auto">
                    <FilePlus size={18} /> Write Prescription
                  </Link>
                </div>
              )}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "chat" && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="text-center text-slate-500 text-sm py-12">
                  No messages yet. Start the conversation.
                </div>
              ) : (
                messages.map((m) => {
                  const isMine = m.senderId === user?.id;
                  return (
                    <div key={m.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[75%] rounded-2xl px-3 py-2 ${
                        isMine ? "bg-blue-600 text-white" : "bg-slate-700 text-slate-100"
                      }`}>
                        <div className="text-[10px] opacity-75 mb-0.5">
                          {m.senderRole === "DOCTOR" ? "Doctor" : "Patient"}
                        </div>
                        <div className="text-sm break-words">{m.message}</div>
                        <div className="text-[10px] opacity-75 mt-1">
                          {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {!isDone && (
              <form onSubmit={sendMessage} className="bg-slate-800 p-3 flex gap-2">
                <input value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 bg-slate-700 text-white px-4 py-2 rounded-xl text-sm placeholder:text-slate-400 outline-none" />
                <button type="submit" disabled={sending || !newMessage.trim()}
                  className="bg-blue-600 text-white p-3 rounded-xl disabled:opacity-50">
                  <Send size={16} />
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Footer Controls */}
      {!isDone && !showVideoFrame && (
        <div className="bg-slate-800 border-t border-slate-700 p-3 flex items-center justify-center gap-3 flex-shrink-0">
          {isActive && (
            <>
              <button onClick={() => setMicOn(!micOn)}
                className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  micOn ? "bg-slate-700 text-white" : "bg-red-600 text-white"
                }`}>
                {micOn ? <Mic size={20} /> : <MicOff size={20} />}
              </button>
              <button onClick={() => setCamOn(!camOn)}
                className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  camOn ? "bg-slate-700 text-white" : "bg-red-600 text-white"
                }`}>
                {camOn ? <Video size={20} /> : <VideoOff size={20} />}
              </button>
            </>
          )}
          {isDoctor && isActive && (
            <button onClick={() => handleEnd()} disabled={actionLoading}
              className="bg-red-600 text-white px-6 py-3 rounded-full font-medium flex items-center gap-2 disabled:opacity-50">
              <PhoneOff size={18} /> End
            </button>
          )}
          {canJoin && (
            <button onClick={handleCancel} disabled={actionLoading}
              className="text-slate-400 text-xs hover:underline">
              Cancel session
            </button>
          )}
        </div>
      )}
    </div>
  );
}

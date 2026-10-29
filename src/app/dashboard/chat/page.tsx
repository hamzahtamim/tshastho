"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, MessageSquare } from "lucide-react";

export default function PatientChatListPage() {
  const [threads, setThreads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch('/api/chat/threads')
      .then(res => res.json())
      .then(data => {
        if (data.success) setThreads(data.threads || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filteredThreads = threads.filter(t => 
    t.doctor?.user?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto min-h-screen bg-slate-50">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">My Messages</h1>
        <p className="text-slate-500 text-sm">Chat with your doctors.</p>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input 
          type="text" 
          placeholder="Search doctors..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm shadow-sm"
        />
      </div>

      {loading ? (
        <div className="text-center text-slate-500 mt-10">Loading conversations...</div>
      ) : filteredThreads.length === 0 ? (
        <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center p-8 text-center min-h-[50vh]">
          <div className="w-24 h-24 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-6">
            <MessageSquare size={40} />
          </div>
          <h3 className="text-slate-800 font-bold text-2xl mb-2">No conversations yet</h3>
          <p className="text-slate-500 text-sm mb-8 max-w-md">
            Your inbox is empty. Find a doctor and start a consultation.
          </p>
          <Link href="/doctors" className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition shadow-md">
            Find a Doctor
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredThreads.map((thread) => {
            const hasUnread = thread.patientUnread > 0;
            return (
              <Link href={`/chat/${thread.id}`} key={thread.id} className="block">
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
                    {thread.doctor?.user?.name?.charAt(0).toUpperCase() || 'D'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <h3 className="font-bold text-slate-800 truncate">Dr. {thread.doctor?.user?.name}</h3>
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
                          {thread.patientUnread}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

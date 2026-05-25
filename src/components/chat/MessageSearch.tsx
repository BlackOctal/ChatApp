"use client";

import { useState, useEffect } from "react";
import { Search, X, ArrowUp, ArrowDown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn, formatMessageTime } from "@/lib/utils";

interface MessageSearchProps {
  conversationId: string;
  onClose: () => void;
  onResultSelect: (messageId: string) => void;
}

interface SearchResult {
  id: string;
  content: string;
  created_at: string;
  sender: { full_name: string };
}

export function MessageSearch({ conversationId, onClose, onResultSelect }: MessageSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      setLoading(true);
      const supabase = createClient();
      const { data } = await supabase
        .from("messages")
        .select("id, content, created_at, sender:users!sender_id(full_name)")
        .eq("conversation_id", conversationId)
        .ilike("content", `%${query}%`)
        .eq("deleted_for_everyone", false)
        .order("created_at", { ascending: false })
        .limit(50);

      // Supabase returns joined data as arrays; normalise sender to single object
      const normalised = (data ?? []).map((row) => ({
        id: row.id as string,
        content: row.content as string,
        created_at: row.created_at as string,
        sender: Array.isArray(row.sender) ? (row.sender[0] as { full_name: string }) : (row.sender as { full_name: string }),
      })) as SearchResult[];
      setResults(normalised);
      setCurrentIndex(0);
      setLoading(false);
    }, 350);

    return () => clearTimeout(timeout);
  }, [query, conversationId]);

  function navigate(dir: "prev" | "next") {
    if (!results.length) return;
    const next =
      dir === "next"
        ? (currentIndex + 1) % results.length
        : (currentIndex - 1 + results.length) % results.length;
    setCurrentIndex(next);
    onResultSelect(results[next].id);
  }

  useEffect(() => {
    if (results.length > 0) onResultSelect(results[0].id);
  }, [results, onResultSelect]);

  return (
    <div className="bg-white border-b border-gray-200 px-3 py-2 flex items-center gap-2">
      <Search size={16} className="text-gray-400 flex-shrink-0" />
      <input
        autoFocus
        className="flex-1 text-sm outline-none placeholder-gray-400"
        placeholder="Search messages…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {loading && (
        <span className="text-xs text-gray-400">Searching…</span>
      )}

      {results.length > 0 && !loading && (
        <span className="text-xs text-gray-500 flex-shrink-0">
          {currentIndex + 1} / {results.length}
        </span>
      )}

      <button
        onClick={() => navigate("prev")}
        disabled={results.length === 0}
        className={cn("p-1 rounded", results.length > 0 ? "text-gray-600 hover:bg-gray-100" : "text-gray-300")}
      >
        <ArrowUp size={16} />
      </button>
      <button
        onClick={() => navigate("next")}
        disabled={results.length === 0}
        className={cn("p-1 rounded", results.length > 0 ? "text-gray-600 hover:bg-gray-100" : "text-gray-300")}
      >
        <ArrowDown size={16} />
      </button>
      <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
        <X size={18} />
      </button>
    </div>
  );
}

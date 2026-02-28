import { useMemo, useState, useRef } from "react";
import { Paperclip, Send, X, CornerUpLeft } from "lucide-react";
import clsx from "clsx";

export default function Composer({
  onSend,
  onTypingStart,
  onTypingStop,
  disabled,
  mentionItems = [],
  mentionOpen = false,
  onMentionQuery,
  onMentionSelect,
  replyTo = null,
  onClearReply,
}) {
  const [value, setValue] = useState("");
  const typingTimer = useRef(null);
  const textareaRef = useRef(null);

  const triggerTyping = () => {
    if (onTypingStart) onTypingStart();
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      if (onTypingStop) onTypingStop();
    }, 1500);
  };

  const mentionQuery = useMemo(() => {
    const idx = value.lastIndexOf("@");
    if (idx < 0) return "";
    const tail = value.slice(idx + 1);
    if (!tail || /\s/.test(tail)) return "";
    return tail;
  }, [value]);

  const applyMention = (item) => {
    const idx = value.lastIndexOf("@");
    if (idx < 0) return;
    const handle = item?.first_name || item?.last_name
      ? `${item.first_name || ""}${item.last_name ? `.${item.last_name}` : ""}`.replace(/\s+/g, "")
      : (item?.email || "user").split("@")[0];
    const next = `${value.slice(0, idx)}@${handle} `;
    setValue(next);
    if (onMentionSelect) onMentionSelect(item);
    textareaRef.current?.focus();
  };

  const handleSend = () => {
    const text = value.trim();
    if (!text) return;
    onSend(text);
    setValue("");
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-slate-200 dark:border-slate-800 px-4 py-3 relative">
      {replyTo && (
        <div className="mb-2 flex items-start justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <div className="min-w-0">
            <div className="text-xs font-semibold text-slate-700 flex items-center gap-1">
              <CornerUpLeft size={12} /> Replying to {replyTo?.sender_name || "message"}
            </div>
            <div className="text-xs text-slate-500 truncate max-w-[460px]">{replyTo?.body || ""}</div>
          </div>
          <button type="button" onClick={onClearReply} className="text-slate-500 hover:text-slate-700">
            <X size={14} />
          </button>
        </div>
      )}
      <div className="flex items-center gap-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2">
        <button
          type="button"
          className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
          disabled
          title="Attachments coming from upload flow"
        >
          <Paperclip size={18} />
        </button>
        <textarea
          ref={textareaRef}
          rows={1}
          className="flex-1 resize-none bg-transparent focus:outline-none text-sm py-1"
          placeholder="Type a message"
          value={value}
          onChange={(e) => {
            const next = e.target.value;
            setValue(next);
            triggerTyping();
            const idx = next.lastIndexOf("@");
            if (idx >= 0) {
              const q = next.slice(idx + 1);
              if (!q.includes(" ") && onMentionQuery) {
                onMentionQuery(q);
              }
            } else if (onMentionQuery) {
              onMentionQuery("");
            }
          }}
          onKeyDown={(e) => {
            triggerTyping();
            onKeyDown(e);
          }}
          disabled={disabled}
        />
        <button
          type="button"
          onClick={handleSend}
          className={clsx(
            "inline-flex items-center gap-1 rounded-full px-3 py-2 text-sm font-semibold text-white",
            disabled || !value.trim() ? "bg-slate-400" : "bg-emerald-600 hover:bg-emerald-700"
          )}
          disabled={disabled || !value.trim()}
        >
          <Send size={16} /> Send
        </button>
      </div>
      {mentionOpen && mentionQuery && mentionItems.length > 0 && (
        <div className="absolute bottom-[74px] left-6 w-[320px] max-h-56 overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg z-30">
          {mentionItems.map((item) => {
            const name = item.first_name || item.last_name
              ? `${item.first_name || ""} ${item.last_name || ""}`.trim()
              : item.email;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => applyMention(item)}
                className="w-full px-3 py-2 text-left hover:bg-slate-50 border-b border-slate-100 last:border-b-0"
              >
                <div className="text-sm font-medium text-slate-800">{name}</div>
                <div className="text-xs text-slate-500">{item.email}</div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

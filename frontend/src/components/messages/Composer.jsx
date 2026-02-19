import { useState, useRef } from "react";
import { Paperclip, Send } from "lucide-react";
import clsx from "clsx";

export default function Composer({ onSend, onTypingStart, onTypingStop, disabled }) {
  const [value, setValue] = useState("");
  const typingTimer = useRef(null);

  const triggerTyping = () => {
    if (onTypingStart) onTypingStart();
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      if (onTypingStop) onTypingStop();
    }, 1500);
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
    <div className="border-t border-slate-200 dark:border-slate-800 px-4 py-3">
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
          rows={1}
          className="flex-1 resize-none bg-transparent focus:outline-none text-sm py-1"
          placeholder="Type a message"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            triggerTyping();
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
    </div>
  );
}

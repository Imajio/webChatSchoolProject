import PropTypes from 'prop-types';
import { useEffect, useRef, useState, useCallback } from 'react';
import { IoMdSend } from 'react-icons/io';

export default function MessageInput({ onSend, disabled, chatId }) {
  const [text, setText] = useState('');
  const inputRef = useRef(null);
  const maxHeight = 200; // px

  const adjustHeight = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const next = Math.min(el.scrollHeight, maxHeight);
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > maxHeight ? 'auto' : 'hidden';
  }, []);

  // Autofocus and select input when it becomes enabled
  useEffect(() => {
    if (!disabled && inputRef.current) {
      inputRef.current.focus();
      // Place caret at end without selecting to avoid visual upscale
      try {
        const len = inputRef.current.value?.length || 0;
        inputRef.current.setSelectionRange(len, len);
      } catch (_) {}
      adjustHeight();
    }
  }, [disabled, adjustHeight]);

  // Also focus/select when switching chats
  useEffect(() => {
    if (!disabled && inputRef.current) {
      inputRef.current.focus();
      // Caret to end, no selection
      try {
        const len = inputRef.current.value?.length || 0;
        inputRef.current.setSelectionRange(len, len);
      } catch (_) {}
      adjustHeight();
    }
  }, [chatId, adjustHeight]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!text.trim()) {
      return;
    }
    onSend(text.trim());
    setText('');
    // Keep focus for fast follow-up messages
    if (!disabled && inputRef.current) {
      inputRef.current.focus();
      // Reset height after clearing
      adjustHeight();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        // Allow newline, then auto-resize after the event loop
        setTimeout(adjustHeight, 0);
        return; // don't prevent default
      }
      // Send on Enter
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form className="input-bar" onSubmit={handleSubmit}>
      <div className="input-shell">
        <textarea
          placeholder="Type a message"
          value={text}
          onChange={(event) => { setText(event.target.value); adjustHeight(); }}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          ref={inputRef}
          rows={1}
        />
        <button type="submit" disabled={disabled} className="send-btn" aria-label="Send" title="Send">
          <IoMdSend size={20}/>
        </button>
      </div>
    </form>
  );
}

MessageInput.propTypes = {
  onSend: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  chatId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
};


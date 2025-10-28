import PropTypes from 'prop-types';
import { useEffect, useRef } from 'react';

function resolveDisplayName(chat, currentUsername) {
  if (chat?.name) return chat.name;
  if (!Array.isArray(chat?.participants)) return `Chat ${chat?.id ?? 'new'}`;
  const others = chat.participants
    .map((p) => p?.profile?.nickname || p?.username)
    .filter((u) => u && u.toLowerCase() !== (currentUsername || '').toLowerCase());
  if (others.length === 1) return others[0];
  if (others.length > 1) return others.join(', ');
  const all = chat.participants.map((p) => p?.profile?.nickname || p?.username).filter(Boolean);
  return all.join(', ') || `Chat ${chat?.id ?? 'new'}`;
}

export default function ChatWindow({ chat, messages, currentUsername }) {
  const feedRef = useRef(null);
  const endRef = useRef(null);

  // Auto-scroll to bottom when messages update or chat changes
  useEffect(() => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ block: 'end', behavior: 'smooth' });
    } else if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [messages, chat?.id]);

  if (!chat) {
    return (
      <div className="chat-window">
        <div className="chat-header">Select a chat to start messaging.</div>
      </div>
    );
  }

  const title = resolveDisplayName(chat, currentUsername);
  let avatarSrc = null;
  if (Array.isArray(chat.participants)) {
    const others = chat.participants.filter((p) => (p?.username || '').toLowerCase() !== (currentUsername || '').toLowerCase());
    if (others.length === 1) {
      const a = others[0]?.profile?.avatar;
      if (a) avatarSrc = a.startsWith('http') ? a : `/media/${a.replace(/^\/*/, '')}`;
    }
  }

  return (
    <div className="chat-window">
      <div className="chat-header" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {avatarSrc ? (
          <img src={avatarSrc} alt="avatar" className="avatar" />
        ) : (
          <div className="avatar" style={{ background: '#ccc' }} />
        )}
        <h2 style={{ margin: 0 }}>{title}</h2>
      </div>
      <div className="message-feed" ref={feedRef}>
        {messages.map((message) => {
          const isSelf = message.username === currentUsername;
          let senderLabel = message.username;
          if (Array.isArray(chat.participants)) {
            const match = chat.participants.find((p) => p?.username === message.username);
            if (match) senderLabel = match.profile?.nickname || match.username;
          }
          return (
            <div key={message.id} className={`message${isSelf ? ' self' : ''}`}>
              <div className="meta">
                {senderLabel} · {new Date(message.timestamp).toLocaleTimeString()}
              </div>
              <div>{message.message}</div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
    </div>
  );
}

ChatWindow.propTypes = {
  chat: PropTypes.object,
  messages: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
      username: PropTypes.string.isRequired,
      message: PropTypes.string.isRequired,
      timestamp: PropTypes.string.isRequired,
    })
  ).isRequired,
  currentUsername: PropTypes.string,
};


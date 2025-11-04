import PropTypes from 'prop-types';

const DEFAULT_PREVIEW = 'No messages yet';

function formatTime(timestamp) {
  if (!timestamp) return '';
  try {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch (error) {
    return '';
  }
}

function resolveDisplayName(chat, currentUsername) {
  // Prefer explicit group name when present
  if (chat?.is_group && typeof chat?.name === 'string' && chat.name.trim()) {
    return chat.name.trim();
  }
  if (!Array.isArray(chat?.participants)) return chat?.name || `Chat ${chat?.id ?? 'new'}`;
  const others = chat.participants.filter(
    (p) => (p?.username || '').toLowerCase() !== currentUsername.toLowerCase()
  );
  if (others.length === 0) return chat?.name || `Chat ${chat?.id ?? 'new'}`;
  const labels = others
    .map((p) => (p?.profile?.nickname && p.profile.nickname.trim()) || p?.username)
    .filter(Boolean);
  return labels.length ? labels.join(', ')
    : chat?.name || `Chat ${chat?.id ?? 'new'}`;
}

export default function ChatList({ chats, activeChatId, onSelect, currentUsername }) {
  if (!chats?.length) {
    return (
      <div style={{ padding: '16px', color: '#555' }}>No chats yet. Create one from the backend or invite friends.</div>
    );
  }

  return (
    <ul className="chat-list">
      {chats.map((chat) => {
        const title = resolveDisplayName(chat, currentUsername);
        const lastMessage = chat.last_message;
        const previewText = typeof lastMessage?.message === 'string' ? lastMessage.message : '';
        const senderUsername = lastMessage?.username || null;
        let previewUserLabel = '';
        if (senderUsername && Array.isArray(chat.participants)) {
          const match = chat.participants.find((p) => p?.username === senderUsername);
          if (match) previewUserLabel = (match.profile?.nickname && match.profile.nickname.trim()) || match.username;
        }
        const preview = previewText ? `${previewUserLabel ? `${previewUserLabel}: ` : ''}${previewText.slice(0, 40)}` : DEFAULT_PREVIEW;
        const timestamp = formatTime(lastMessage?.timestamp);

        let avatarSrc = null;
        const others = Array.isArray(chat.participants)
          ? chat.participants.filter((p) => (p?.username || '').toLowerCase() !== currentUsername.toLowerCase())
          : [];
        if (others.length === 1) {
          const a = others[0]?.profile?.avatar;
          if (a) avatarSrc = a.startsWith('http') ? a : `/media/${a.replace(/^\/*/, '')}`;
        }

        return (
          <li
            key={chat.id ?? Math.random()}
            className={chat.id === activeChatId ? 'active' : undefined}
            onClick={() => onSelect(chat)}
            style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '10px', padding: '10px 12px' }}
          >
            {avatarSrc ? (
              <img src={avatarSrc} alt="avatar" className="avatar avatar-sm" />
            ) : (
              <div className="avatar avatar-sm" style={{ background: '#ccc' }} />
            )}
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 600 }}>
                <span>{title}</span>
                {timestamp ? <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{timestamp}</span> : null}
              </div>
              <div style={{ fontSize: '0.85rem', color: preview === DEFAULT_PREVIEW ? 'var(--muted)' : '#555' }}>{preview}</div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

ChatList.propTypes = {
  chats: PropTypes.arrayOf(PropTypes.object).isRequired,
  activeChatId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  onSelect: PropTypes.func.isRequired,
  currentUsername: PropTypes.string.isRequired,
};

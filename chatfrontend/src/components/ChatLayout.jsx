import PropTypes from 'prop-types';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import ChatList from './ChatList';
import ChatWindow from './ChatWindow';
import MessageInput from './MessageInput';
import ProfileModal from './ProfileModal';
import { useApi } from '../hooks/useApi';
import { useWebSocket } from '../hooks/useWebSocket';

const getSocketBase = () => {
  if (typeof window === 'undefined') {
    return 'ws://localhost:8000';
  }
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const host = window.location.host;
  return `${protocol}://${host}`;
};

const WS_BASE = (() => {
  if (typeof window !== 'undefined' && window.__APP_CONFIG__?.wsBase) {
    return window.__APP_CONFIG__.wsBase;
  }
  if (typeof process !== 'undefined' && process.env && process.env.REACT_APP_WS_BASE) {
    return process.env.REACT_APP_WS_BASE;
  }
  return getSocketBase();
})();

export default function ChatLayout({ user, onLogout, onUserUpdate }) {
  const { request } = useApi();
  const [chats, setChats] = useState([]);
  const [theme, setTheme] = useState(() => {
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem('theme') : null;
      if (saved === 'dark' || saved === 'light') return saved;
      if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    } catch (_) {}
    return 'light';
  });
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState(null);
  // Profile modal state
  const [editingProfile, setEditingProfile] = useState(false);
  const [startUsername, setStartUsername] = useState('');
  const [startError, setStartError] = useState(null);
  const [startStatus, setStartStatus] = useState(null);
  const [startPending, setStartPending] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const refreshChats = useCallback(async () => {
    try {
      const data = await request('/api/chats/');
      setChats(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }, [request]);

  useEffect(() => {
    refreshChats();
  }, [refreshChats]);

  const loadMessages = useCallback(async (chatId) => {
    if (!chatId) return;
    try {
      const data = await request(`/api/messages/?chat=${chatId}`);
      const normalised = data.map((item) => ({ id: item.id, username: item.sender, message: item.content, timestamp: item.timestamp }));
      setMessages(normalised);
    } catch (err) {
      setMessages([]);
      setError(err.message);
    }
  }, [request]);

  useEffect(() => {
    if (!selectedChat) { setMessages([]); return; }
    loadMessages(selectedChat.id);
  }, [selectedChat, loadMessages]);

  const websocketUrl = useMemo(() => {
    if (!selectedChat) return null;
    return `${WS_BASE}/ws/chat/${selectedChat.id}/`;
  }, [selectedChat]);

  useEffect(() => {
    try {
      document.documentElement.setAttribute('data-theme', theme);
      if (typeof window !== 'undefined') localStorage.setItem('theme', theme);
    } catch (_) {}
  }, [theme]);

  useEffect(() => {
    const onDocClick = (e) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  const handleIncomingMessage = useCallback((payload) => {
    if (!payload || !payload.message) return;
    setMessages((prev) => [...prev, { id: payload.id ?? `${Date.now()}`, username: payload.username, message: payload.message, timestamp: payload.timestamp ?? new Date().toISOString() }]);
    setChats((prev) => prev.map((chat) =>
      chat.id === (selectedChat?.id ?? null)
        ? { ...chat, last_message: { username: payload.username, message: payload.message, timestamp: payload.timestamp ?? new Date().toISOString() } }
        : chat
    ));
  }, [selectedChat]);

  const { sendMessage, status } = useWebSocket(websocketUrl, { onMessage: handleIncomingMessage });

  const handleSelectChat = useCallback((chat) => {
    setSelectedChat(chat);
    setStartError(null);
    setStartStatus(null);
  }, []);

  const handleSendMessage = async (text) => {
    if (!selectedChat) return;
    try {
      sendMessage({ message: text });
    } catch (wsError) {
      await request('/api/messages/', { method: 'POST', body: { chat: selectedChat.id, content: text } });
      await loadMessages(selectedChat.id);
    }
  };

  const handleStartChat = useCallback(async (event) => {
    event.preventDefault();
    const target = startUsername.trim();
    if (!target) { setStartError('Enter a username first.'); setStartStatus(null); return; }
    if (target.toLowerCase() === user.username.toLowerCase()) { setStartError('You cannot start a chat with yourself.'); setStartStatus(null); return; }
    setStartPending(true); setStartError(null); setStartStatus(null);
    try {
      const chat = await request('/api/chats/start/', { method: 'POST', body: { username: target } });
      setChats((prev) => {
        const existingIndex = prev.findIndex((item) => item.id === chat.id);
        if (existingIndex >= 0) { const next = [...prev]; next.splice(existingIndex, 1); return [chat, ...next]; }
        return [chat, ...prev];
      });
      setSelectedChat(chat);
      await loadMessages(chat.id);
      const friendlyName = chat.name || (chat.participants || []).find((p) => p.username !== user.username)?.username || target;
      setStartStatus(`Chat ready with ${friendlyName}.`);
      setStartUsername('');
    } catch (err) {
      setStartError(err.message);
    } finally {
      setStartPending(false);
    }
  }, [startUsername, user.username, request, loadMessages]);

  const startButtonLabel = startPending ? 'Starting...' : 'Start chat';

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', background: 'var(--panel)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="menu-wrapper" ref={menuRef}>
              <button
                className="menu-button"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((v) => !v)}
                title="Menu"
              >
                ☰
              </button>
              {menuOpen ? (
                <div className="menu" role="menu">
                  <button className="menu-item" role="menuitem" onClick={() => { setEditingProfile(true); setMenuOpen(false); }}>Edit Profile</button>
                  <button className="menu-item" role="menuitem" onClick={() => { setTheme(theme === 'dark' ? 'light' : 'dark'); setMenuOpen(false); }}>
                    {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                  </button>
                  <button className="menu-item danger" role="menuitem" onClick={() => { onLogout(); setMenuOpen(false); }}>Log Out</button>
                </div>
              ) : null}
            </div>
            <div>
              <div style={{ fontWeight: 600 }}>{user.username}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>{user.status || 'Available'}</div>
            </div>
          </div>
        </div>
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', background: 'var(--panel-alt)' }}>
          <form onSubmit={handleStartChat} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Start a new chat</span>
            <input type="text" value={startUsername} onChange={(e) => { setStartUsername(e.target.value); setStartError(null); setStartStatus(null); }} placeholder="Enter username" disabled={startPending} style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--panel)', color: 'var(--text)' }} />
            <button type="submit" disabled={startPending} style={{ padding: '8px 12px', borderRadius: '6px', border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer' }}>{startButtonLabel}</button>
          </form>
          {startError ? (<div style={{ marginTop: '8px', color: '#d32f2f', fontSize: '0.85rem' }}>{startError}</div>) : null}
          {startStatus ? (<div style={{ marginTop: '8px', color: '#2e7d32', fontSize: '0.85rem' }}>{startStatus}</div>) : null}
        </div>
        {error ? (<div style={{ padding: '16px', color: '#d32f2f' }}>{error}</div>) : null}
        <ChatList chats={chats} activeChatId={selectedChat?.id ?? null} onSelect={handleSelectChat} currentUsername={user.username} />
      </aside>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <ChatWindow
          chat={selectedChat}
          messages={messages}
          currentUsername={user.username}
        />
        <MessageInput
          chatId={selectedChat?.id ?? null}
          onSend={handleSendMessage}
          disabled={!selectedChat || status !== 'OPEN'}
        />
      </div>
      <ProfileModal open={editingProfile} onClose={() => setEditingProfile(false)} user={user} onUpdated={(updated) => onUserUpdate && onUserUpdate(updated)} />
    </div>
  );
}

ChatLayout.propTypes = {
  user: PropTypes.shape({ username: PropTypes.string.isRequired, status: PropTypes.string }).isRequired,
  onLogout: PropTypes.func.isRequired,
  onUserUpdate: PropTypes.func,
};

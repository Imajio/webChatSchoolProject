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
  const drawerRef = useRef(null);
  // Group chat creation state
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupMembers, setGroupMembers] = useState('');
  const [groupError, setGroupError] = useState(null);
  const [groupPending, setGroupPending] = useState(false);

  // Drawer UI state
  const [drawerMode, setDrawerMode] = useState('actions'); // 'actions' | 'add_chat' | 'add_user'
  const [startCollapsed, setStartCollapsed] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchHints, setSearchHints] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

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
      const menuEl = menuRef.current;
      const drawerEl = drawerRef.current;
      if (!menuEl) return;
      const inMenu = menuEl.contains(e.target);
      const inDrawer = drawerEl ? drawerEl.contains(e.target) : false;
      if (!inMenu && !inDrawer) setMenuOpen(false);
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  // Toggle a body class to help CSS manage pointer-events when menu is open
  useEffect(() => {
    try {
      if (menuOpen) document.body.classList.add('menu-open');
      else document.body.classList.remove('menu-open');
    } catch (_) {}
    return () => {
      try { document.body.classList.remove('menu-open'); } catch (_) {}
    };
  }, [menuOpen]);

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
  const groupButtonLabel = groupPending ? 'Creating...' : 'Create group';

  const handleStartGroup = useCallback(async (event) => {
    event.preventDefault();
    const raw = groupMembers || '';
    const usernames = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (!usernames.length) { setGroupError('Add at least one username.'); return; }
    setGroupPending(true); setGroupError(null);
    try {
      const chat = await request('/api/chats/start-group/', {
        method: 'POST',
        body: { name: groupName || '', usernames },
      });
      setChats((prev) => [chat, ...prev.filter((c) => c.id !== chat.id)]);
      setSelectedChat(chat);
      setGroupName('');
      setGroupMembers('');
      setShowGroupForm(false);
      await loadMessages(chat.id);
    } catch (err) {
      setGroupError(err.message || 'Failed to create group');
    } finally {
      setGroupPending(false);
    }
  }, [groupName, groupMembers, request, loadMessages]);

  // Live user search hints
  useEffect(() => {
    let abort = false;
    const run = async () => {
      const q = searchQuery.trim();
      if (!q) { setSearchHints([]); return; }
      setSearchLoading(true);
      try {
        const users = await request(`/api/users/?q=${encodeURIComponent(q)}`);
        if (!abort) setSearchHints(users || []);
      } catch (_) {
        if (!abort) setSearchHints([]);
      } finally {
        if (!abort) setSearchLoading(false);
      }
    };
    const t = setTimeout(run, 200); // debounce
    return () => { abort = true; clearTimeout(t); };
  }, [searchQuery, request]);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-section glass-block">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="menu-wrapper" ref={menuRef}>
              <button className="menu-button" aria-haspopup="true" aria-expanded={menuOpen} onClick={() => setMenuOpen((v) => !v)} title="Menu">☰</button>
            </div>
            <div>
              <div style={{ fontWeight: 600 }}>{user.username}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>{user.status || 'Available'}</div>
            </div>
          </div>
        </div>
        {/* Start-a-new-chat block removed per request */}
        {error ? (<div style={{ padding: '16px', color: '#d32f2f' }}>{error}</div>) : null}
        <ChatList chats={chats} activeChatId={selectedChat?.id ?? null} onSelect={handleSelectChat} currentUsername={user.username} />
      </aside>
      {/* Left slide drawer */}
      <div className={`drawer-backdrop${menuOpen ? ' show' : ''}`} onClick={() => setMenuOpen(false)} />
      <aside className={`left-drawer${menuOpen ? ' open' : ''}`} aria-hidden={!menuOpen} ref={drawerRef}>
        <div className="drawer-header">
          <div style={{ fontWeight: 600 }}>{user.username}</div>
          <button className="menu-item danger" onClick={() => { onLogout(); setMenuOpen(false); }}>Log Out</button>
        </div>
        <div className="drawer-section">
          <div className="drawer-actions">
            <button className={drawerMode === 'add_chat' ? 'active' : ''} onClick={() => setDrawerMode('add_chat')}>Add chat</button>
            <button className={drawerMode === 'add_user' ? 'active' : ''} onClick={() => setDrawerMode('add_user')}>Add user</button>
            <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? 'Light' : 'Dark'} mode</button>
          </div>
          <div className="drawer-search">
            <input type="text" placeholder="Search users…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            {searchQuery ? (
              <ul className="search-hints">
                {searchLoading ? (<li className="hint">Searching…</li>) : null}
                {(!searchLoading && searchHints.length === 0) ? (<li className="hint muted">No matches</li>) : null}
                {searchHints.map((u) => (
                  <li key={u.id} className="hint" onClick={() => {
                    if (drawerMode === 'add_chat') setStartUsername(u.username);
                    else setGroupMembers((prev) => (prev ? `${prev}, ${u.username}` : u.username));
                  }}>
                    <span className="nick">{u.profile?.nickname || u.username}</span>
                    {u.profile?.nickname ? <span className="user">@{u.username}</span> : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          {drawerMode === 'add_chat' ? (
            <form onSubmit={handleStartChat} className="drawer-form">
              <input type="text" value={startUsername} onChange={(e) => setStartUsername(e.target.value)} placeholder="Username" />
              <button type="submit" disabled={startPending}>{startButtonLabel}</button>
            </form>
          ) : null}
          {drawerMode === 'add_user' ? (
            <form onSubmit={handleStartGroup} className="drawer-form">
              <input type="text" value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Group name (optional)" />
              <input type="text" value={groupMembers} onChange={(e) => setGroupMembers(e.target.value)} placeholder="Usernames, comma separated" />
              <button type="submit" disabled={groupPending}>{groupButtonLabel}</button>
            </form>
          ) : null}
        </div>
      </aside>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, position: 'relative' }}>
        <ChatWindow
          chat={selectedChat}
          messages={messages}
          currentUsername={user.username}
        />
        {selectedChat ? (
          <MessageInput
            chatId={selectedChat.id}
            onSend={handleSendMessage}
            disabled={status !== 'OPEN'}
          />
        ) : null}
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

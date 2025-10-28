import { useCallback, useEffect, useRef, useState } from 'react';

export function useWebSocket(url, { onMessage } = {}) {
  const socketRef = useRef(null);
  const [status, setStatus] = useState('CLOSED');

  useEffect(() => {
    if (!url) {
      return undefined;
    }

    const socket = new WebSocket(url);
    socketRef.current = socket;
    setStatus('CONNECTING');

    socket.onopen = () => {
      setStatus('OPEN');
    };

    socket.onclose = () => {
      setStatus('CLOSED');
    };

    socket.onerror = () => {
      setStatus('ERROR');
    };

    socket.onmessage = (event) => {
      if (typeof onMessage !== 'function') {
        return;
      }
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (error) {
        console.error('Invalid WebSocket message', error);
      }
    };

    return () => {
      setStatus('CLOSING');
      socket.close();
      socketRef.current = null;
    };
  }, [url, onMessage]);

  const sendMessage = useCallback((payload) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }
    const data = typeof payload === 'string' ? payload : JSON.stringify(payload);
    socket.send(data);
  }, []);

  return { sendMessage, status };
}
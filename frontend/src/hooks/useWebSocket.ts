import { useEffect, useRef, useState, useCallback } from 'react';

interface WebSocketMessage {
  type: string;
  data?: any;
  message?: string;
}

export const useWebSocket = (url: string) => {
  const ws = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const reconnectTimeout = useRef<number>();
  const pingInterval = useRef<number>();
  const isUnmounting = useRef(false);

  const connect = useCallback(() => {
    try {
      // Create WebSocket URL with auth token
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const token = localStorage.getItem('auth_token');
      const tokenParam = token ? `?token=${encodeURIComponent(token)}` : '';
      const wsUrl = `${protocol}//${window.location.host}${url}${tokenParam}`;
      
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        setIsConnected(true);
        
        // Send ping every 30 seconds
        pingInterval.current = window.setInterval(() => {
          if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send('ping');
          }
        }, 30000);
      };

      ws.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type !== 'heartbeat' && message !== 'pong') {
            setLastMessage(message);
          }
        } catch (e) {
          // Text message (pong etc.)
        }
      };

      ws.current.onclose = () => {
        setIsConnected(false);
        
        if (pingInterval.current) {
          clearInterval(pingInterval.current);
          pingInterval.current = undefined;
        }
        
        // Only reconnect if not unmounting
        if (!isUnmounting.current) {
          reconnectTimeout.current = window.setTimeout(() => {
            connect();
          }, 5000);
        }
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
    }
  }, [url]);

  useEffect(() => {
    connect();

    return () => {
      isUnmounting.current = true;
      
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
        reconnectTimeout.current = undefined;
      }
      if (pingInterval.current) {
        clearInterval(pingInterval.current);
        pingInterval.current = undefined;
      }
      if (ws.current) {
        ws.current.onclose = null; // Prevent reconnect on manual close
        ws.current.close();
        ws.current = null;
      }
    };
  }, [connect]);

  const sendMessage = useCallback((message: any) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    }
  }, []);

  return { isConnected, lastMessage, sendMessage };
};
// Simple Group Chat Component
// All admins see all messages - perfect for team coordination

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function GroupChat({ user, darkMode, colors, onlineAdmins }) {
  const [chatMessages, setChatMessages] = useState([]);
  const [showChat, setShowChat] = useState(false);

  // Load all chat messages (group chat)
  const loadChatMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .is('recipient_id', null) // Only group messages
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) {
        console.error('Error loading chat messages:', error);
        setChatMessages([]);
        return;
      }
      
      setChatMessages(data || []);
    } catch (error) {
      console.error('Error loading chat messages:', error);
      setChatMessages([]);
    }
  };

  // Send group chat message
  const sendChatMessage = async (message) => {
    if (!message.trim()) return;

    console.log('Attempting to send message:', message);
    console.log('User ID:', user?.id);

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert([{
          admin_id: user.id,
          recipient_id: null, // NULL = group chat
          message: message.trim()
        }])
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        alert('Failed to send message: ' + (error.message || JSON.stringify(error)));
        return;
      }
      
      console.log('Message sent successfully:', data);
      
      // Add message to UI immediately (don't wait for subscription)
      setChatMessages(prev => [...prev, data]);
    } catch (error) {
      console.error('Catch error:', error);
      alert('Failed to send message: ' + error.message);
    }
  };

  // Subscribe to new messages
  useEffect(() => {
    if (!user) return;

    const chatSubscription = supabase
      .channel('group-chat-channel')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: 'recipient_id=is.null' // Only group messages
      }, (payload) => {
        setChatMessages(prev => [...prev, payload.new]);
      })
      .subscribe();

    return () => {
      chatSubscription.unsubscribe();
    };
  }, [user]);

  // Load messages when chat opens
  useEffect(() => {
    if (showChat && user) {
      loadChatMessages();
    }
  }, [showChat, user]);

  return (
    <>
      {/* Floating Chat Button */}
      <button
        onClick={() => setShowChat(prev => !prev)}
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: '#2563eb',
          color: 'white',
          border: 'none',
          fontSize: '1.5rem',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          zIndex: 999,
          transition: "all 0.2s"
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = "scale(1.1)";
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = "scale(1)";
        }}
      >
        💬
      </button>

      {/* Chat Panel */}
      {showChat && (
        <div style={{
          position: 'fixed',
          bottom: 90,
          right: 24,
          width: 350,
          height: 500,
          background: darkMode ? colors.cardBg : 'white',
          borderRadius: 16,
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 999,
          transition: "all 0.3s"
        }}>
          {/* Header */}
          <div style={{
            padding: 16,
            borderBottom: `1px solid ${colors.border}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            transition: "all 0.3s"
          }}>
            <div>
              <h3 style={{
                margin: 0,
                fontSize: '1rem',
                color: darkMode ? colors.text : colors.text,
                transition: "color 0.3s"
              }}>
                Team Chat
              </h3>
              <div style={{
                fontSize: '0.75rem',
                color: darkMode ? colors.textSecondary : colors.textSecondary,
                marginTop: 4,
                transition: "color 0.3s"
              }}>
                {onlineAdmins.length} online
              </div>
            </div>
            <button
              onClick={() => setShowChat(false)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '1.25rem',
                cursor: 'pointer',
                color: darkMode ? colors.textSecondary : colors.textSecondary,
                transition: "color 0.3s"
              }}
            >
              ×
            </button>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 12
          }}>
            {chatMessages.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: colors.textSecondary, fontSize: '0.875rem' }}>
                No messages yet. Start the conversation!
              </div>
            ) : (
              chatMessages.map((msg) => (
                <div key={msg.id} style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: msg.admin_id === user.id ? 'flex-end' : 'flex-start'
                }}>
                  <div style={{
                    maxWidth: '80%',
                    padding: '8px 12px',
                    background: msg.admin_id === user.id 
                      ? '#2563eb' 
                      : (darkMode ? colors.bg : '#f1f5f9'),
                    color: msg.admin_id === user.id 
                      ? 'white' 
                      : (darkMode ? colors.text : colors.text),
                    borderRadius: 12,
                    fontSize: '0.875rem',
                    wordBreak: 'break-word',
                    transition: "all 0.3s"
                  }}>
                    {msg.message}
                  </div>
                  <div style={{
                    fontSize: '0.7rem',
                    color: darkMode ? colors.textSecondary : colors.textSecondary,
                    marginTop: 4,
                    transition: "color 0.3s"
                  }}>
                    {msg.admin_id === user.id ? 'You' : 'Admin'} • {new Date(msg.created_at).toLocaleTimeString()}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Input */}
          <div style={{
            padding: 16,
            borderTop: `1px solid ${colors.border}`,
            transition: "all 0.3s"
          }}>
            <form onSubmit={(e) => {
              e.preventDefault();
              const input = e.target.elements.message;
              sendChatMessage(input.value);
              input.value = '';
            }} style={{
              display: 'flex',
              gap: 8,
              alignItems: 'center'
            }}>
              <input
                name="message"
                type="text"
                placeholder="Type a message..."
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  background: darkMode ? colors.bg : '#f1f5f9',
                  color: darkMode ? colors.text : colors.text,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 8,
                  fontSize: '0.875rem',
                  transition: "all 0.3s"
                }}
              />
              <button
                type="submit"
                style={{
                  padding: '10px 16px',
                  background: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: '1.2rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: "all 0.2s"
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = '#1d4ed8';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = '#2563eb';
                }}
              >
                ➤
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

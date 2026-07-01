// Simple Group Chat Component
// All admins see all messages - perfect for team coordination
// Now with read receipts and typing indicators!

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

export default function GroupChat({ user, darkMode, colors, onlineAdmins }) {
  const [chatMessages, setChatMessages] = useState([]);
  const [showChat, setShowChat] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

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
      
      // Mark messages as read when loading
      if (showChat && user) {
        markMessagesAsRead();
      }
    } catch (error) {
      console.error('Error loading chat messages:', error);
      setChatMessages([]);
    }
  };

  // Mark messages as read
  const markMessagesAsRead = async () => {
    try {
      const { error } = await supabase.rpc('mark_messages_read', {
        user_id: user.id
      });
      
      if (error) {
        console.error('Error marking messages as read:', error);
      }
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  // Update typing indicator
  const updateTypingIndicator = async (typing) => {
    try {
      if (typing) {
        await supabase
          .from('chat_typing_indicators')
          .upsert([{
            admin_id: user.id,
            admin_email: user.email,
            typing: true,
            created_at: new Date().toISOString()
          }], {
            onConflict: 'admin_id'
          });
      } else {
        await supabase
          .from('chat_typing_indicators')
          .delete()
          .eq('admin_id', user.id);
      }
    } catch (error) {
      console.error('Error updating typing indicator:', error);
    }
  };

  // Handle typing
  const handleTyping = () => {
    if (!isTyping) {
      setIsTyping(true);
      updateTypingIndicator(true);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      updateTypingIndicator(false);
    }, 2000);
  };

  // Send group chat message
  const sendChatMessage = async (message) => {
    if (!message.trim()) return;

    console.log('Attempting to send message:', message);
    console.log('User ID:', user?.id);

    // Stop typing indicator
    setIsTyping(false);
    updateTypingIndicator(false);

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert([{
          admin_id: user.id,
          recipient_id: null, // NULL = group chat
          message: message.trim(),
          delivered_at: new Date().toISOString()
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

  // Subscribe to new messages and typing indicators
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
        
        // Mark as read if chat is open
        if (showChat) {
          markMessagesAsRead();
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'chat_messages',
        filter: 'recipient_id=is.null'
      }, (payload) => {
        setChatMessages(prev => prev.map(msg => 
          msg.id === payload.new.id ? payload.new : msg
        ));
      })
      .subscribe();

    const typingSubscription = supabase
      .channel('typing-indicators')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chat_typing_indicators'
      }, (payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          setTypingUsers(prev => {
            const filtered = prev.filter(u => u.admin_id !== payload.new.admin_id);
            if (payload.new.typing && payload.new.admin_id !== user.id) {
              return [...filtered, payload.new];
            }
            return filtered;
          });
        } else if (payload.eventType === 'DELETE') {
          setTypingUsers(prev => prev.filter(u => u.admin_id !== payload.old.admin_id));
        }
      })
      .subscribe();

    // Cleanup old typing indicators every 5 seconds
    const cleanupInterval = setInterval(async () => {
      try {
        await supabase.rpc('cleanup_old_typing_indicators');
      } catch (error) {
        console.error('Error cleaning up typing indicators:', error);
      }
    }, 5000);

    return () => {
      chatSubscription.unsubscribe();
      typingSubscription.unsubscribe();
      clearInterval(cleanupInterval);
      if (isTyping) {
        updateTypingIndicator(false);
      }
    };
  }, [user, showChat, isTyping]);

  // Load messages when chat opens
  useEffect(() => {
    if (showChat && user) {
      loadChatMessages();
      markMessagesAsRead();
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
              <>
                {chatMessages.map((msg) => (
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
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      transition: "color 0.3s"
                    }}>
                      <span>{msg.admin_id === user.id ? 'You' : 'Admin'}</span>
                      <span>•</span>
                      <span>{new Date(msg.created_at).toLocaleTimeString()}</span>
                      {msg.admin_id === user.id && (
                        <>
                          <span>•</span>
                          {msg.is_read ? (
                            <span title={`Read at ${new Date(msg.read_at).toLocaleString()}`} style={{ color: '#10b981' }}>
                              ✓✓
                            </span>
                          ) : (
                            <span title="Delivered" style={{ color: '#6b7280' }}>
                              ✓
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
                
                {/* Typing indicators */}
                {typingUsers.length > 0 && (
                  <div style={{
                    padding: '8px 12px',
                    background: darkMode ? colors.bg : '#f1f5f9',
                    borderRadius: 12,
                    fontSize: '0.875rem',
                    color: darkMode ? colors.textSecondary : colors.textSecondary,
                    fontStyle: 'italic',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                  }}>
                    <div className="typing-dots">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                    {typingUsers.length === 1 ? '1 admin' : `${typingUsers.length} admins`} typing...
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </>
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
                onChange={(e) => handleTyping()}
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
      
      <style jsx>{`
        .typing-dots {
          display: flex;
          gap: 4px;
        }
        .typing-dots span {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: currentColor;
          opacity: 0.4;
          animation: typing 1.4s infinite;
        }
        .typing-dots span:nth-child(2) {
          animation-delay: 0.2s;
        }
        .typing-dots span:nth-child(3) {
          animation-delay: 0.4s;
        }
        @keyframes typing {
          0%, 60%, 100% {
            opacity: 0.4;
            transform: scale(1);
          }
          30% {
            opacity: 1;
            transform: scale(1.2);
          }
        }
      `}</style>
    </>
  );
}

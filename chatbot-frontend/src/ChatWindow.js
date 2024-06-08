import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Col, Form, Button, ListGroup } from 'react-bootstrap';
import MessageBubble from './MessageBubble'; // Import the MessageBubble component
import { CSSTransition, SwitchTransition } from 'react-transition-group';
import './Chatbot.css'; // Import CSS file for animations

const ChatWindow = ({ messages, setMessages, input, setInput, currentConversation }) => {
  const messagesEndRef = useRef(null);
  const [socket, setSocket] = useState(null);
  const [isGeneratingResponse, setIsGeneratingResponse] = useState(false);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (currentConversation) {
      const newSocket = new WebSocket(`ws://localhost:8000/ws/conversations/${currentConversation}/messages/ai`);

      newSocket.onopen = () => {
        console.log('WebSocket connection opened');
        setSocket(newSocket);
      };

      newSocket.onmessage = (event) => {
        console.log('WebSocket message received:', event.data);
        if (event.data === 'GENERATION_COMPLETE') {
          setIsGeneratingResponse(false);
        } else if (event.data === 'GENERATION_STOPPED') {
          setIsGeneratingResponse(false);
        } else {
          setMessages((prevMessages) => {
            const lastMessage = prevMessages[prevMessages.length - 1];
            if (lastMessage && lastMessage.user === 'bot') {
              return [...prevMessages.slice(0, -1), { user: 'bot', text: lastMessage.text + event.data }];
            } else {
              return [...prevMessages, { user: 'bot', text: event.data }];
            }
          });
        }
      };

      newSocket.onclose = () => {
        console.log('WebSocket connection closed');
        setSocket(null);
        setIsGeneratingResponse(false);
      };

      newSocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        newSocket.close();
      };

      return () => {
        newSocket.close();
      };
    }
  }, [currentConversation, setMessages]);

  const sendMessage = async () => {
    if (!currentConversation) {
      console.error("No conversation selected");
      return;
    }
    if (input.trim() === '' && isGeneratingResponse === false) return;
  
    if (isGeneratingResponse) {
      if (socket && socket.readyState === WebSocket.OPEN) {
        console.log('Sending STOP_GENERATION signal to WebSocket');
        socket.send(JSON.stringify({ action: 'stop_generation' }));
        setIsGeneratingResponse(false);
      } else {
        console.error('WebSocket is not open');
      }
      return; // Return here to prevent sending a new message while the stop signal is being processed
    }
  
    try {
      const userMessageResponse = await fetch(`http://localhost:8000/conversations/${currentConversation}/messages/user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user: 'You', text: input }),
      });
      if (!userMessageResponse.ok) {
        console.error('Failed to send user message:', userMessageResponse.statusText);
        return;
      }
      const userMessageData = await userMessageResponse.json();
      setMessages(userMessageData.messages);
      setInput('');
  
      setIsGeneratingResponse(true);
  
      if (socket && socket.readyState === WebSocket.OPEN) {
        console.log('Sending message to WebSocket:', input);
        socket.send(JSON.stringify({ action: 'message', content: input }));
      } else {
        console.error('WebSocket is not open');
        setIsGeneratingResponse(false);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setIsGeneratingResponse(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleEdit = (index, newText) => {
    setMessages((prevMessages) => {
      const updatedMessages = [...prevMessages];
      updatedMessages[index] = { ...updatedMessages[index], text: newText };
      return updatedMessages;
    });
  };

  const handleRegenerate = (index) => {
    setIsGeneratingResponse(true);
    setMessages((prevMessages) => {
      const messageToUpdate = prevMessages[index];
      const newSocket = socket;
  
      if (newSocket && newSocket.readyState === WebSocket.OPEN) {
        newSocket.send(JSON.stringify({ action: 'regenerate', messageIndex: index }));
      } else {
        console.error('WebSocket is not open');
      }
  
      // Empty the text of the message bubble corresponding to the index
      const updatedMessages = [...prevMessages];
      updatedMessages[index] = { ...messageToUpdate, text: '' };
      return updatedMessages;
    });
  
    // Handle incoming WebSocket messages for the regeneration process
    if (socket) {
      socket.onmessage = (event) => {
        console.log('WebSocket message received:', event.data);
        if (event.data === 'GENERATION_COMPLETE') {
          setIsGeneratingResponse(false);
        } else if (event.data === 'GENERATION_STOPPED') {
          setIsGeneratingResponse(false);
        } else {
          setMessages((prevMessages) => {
            const updatedMessages = [...prevMessages];
            const regeneratingMessage = updatedMessages[index];
            if (regeneratingMessage) {
              updatedMessages[index] = { ...regeneratingMessage, text: regeneratingMessage.text + event.data };
            }
            return updatedMessages;
          });
        }
      };
    }
  };

  return (
    <Col style={{ display: 'flex', flexDirection: 'column', height: '95vh', width: '100%', padding: '0' }}>
      <div style={{ flex: '1', overflowY: 'auto', marginBottom: '20px', padding: '5px' }}>
        {currentConversation ? (
          <ListGroup>
            {messages.map((msg, idx) => (
              <ListGroup.Item
                key={idx}
                className={`d-flex justify-content-${msg.user === 'You' ? 'end' : 'start'}`}
              >
                <MessageBubble
                  msg={msg.text}
                  user={msg.user}
                  conversationId={currentConversation}
                  messageIndex={idx}
                  onEdit={(newText) => handleEdit(idx, newText)}
                  onRegenerate={() => handleRegenerate(idx)}
                  isGenerating={isGeneratingResponse}
                />
              </ListGroup.Item>
            ))}
          </ListGroup>
        ) : (
          <div className="d-flex flex-column justify-content-center align-items-center border border-info rounded p-5 bg-dark" style={{ height: '100%' }}>
            <h3 className="mb-2">Select another conversation,</h3>
            <h3>or create a new one</h3>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <Form style={{ display: 'flex', alignItems: 'center', padding: '10px' }} onSubmit={(e) => e.preventDefault()}>
        <Form.Group controlId="formMessage" style={{ flex: '1', marginRight: '10px', marginBottom: '0' }}>
          <Form.Control
            as="textarea"
            rows={3}
            placeholder="Type a message"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{ padding: '10px' }}
            disabled={!currentConversation || isGeneratingResponse}
          />
        </Form.Group>
        <Button variant="primary" type="submit" onClick={sendMessage} style={{ height: '100%', padding: '10px' }} disabled={!currentConversation}>
          <SwitchTransition>
            <CSSTransition
              key={isGeneratingResponse ? "stop" : "send"}
              timeout={300}
              classNames="icon"
            >
              {isGeneratingResponse ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" class="bi bi-stop" viewBox="0 0 16 16">
                  <path d="M3.5 5A1.5 1.5 0 0 1 5 3.5h6A1.5 1.5 0 0 1 12.5 5v6a.5.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 11zM5 4.5a.5.5 0 0 0-.5.5v6a.5.5 0 0 0 .5.5h6a.5.5 0 0 0 .5-.5V5a.5.5 0 0 0-.5-.5z"/>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" className="bi bi-arrow-up" viewBox="0 0 16 16">
                  <path fillRule="evenodd" d="M8 15a.5.5 0 0 0 .5-.5V2.707l3.146 3.147a.5.5 0 0 0 .708-.708l-4-4a.5.5 0 0 0-.708 0l-4 4a.5.5 0 1 0 .708.708L7.5 2.707V14.5a.5.5 0 0 0 .5.5"/>
                </svg>
              )}
            </CSSTransition>
          </SwitchTransition>
        </Button>
      </Form>
    </Col>
  );
};

export default ChatWindow;

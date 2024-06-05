import React, { useRef, useEffect } from 'react';
import { Col, Form, Button, ListGroup } from 'react-bootstrap';
import MessageBubble from './MessageBubble'; // Import the MessageBubble component
import './Chatbot.css'; // Import CSS file for animations

const ChatWindow = ({ messages, setMessages, input, setInput, currentConversation, setCurrentConversationId }) => {
  const messagesEndRef = useRef(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async () => {
    if (!currentConversation) {
      console.error("No conversation selected");
      return;
    }
    if (input.trim() === '') return; // Do not send empty messages

    try {
      // Add user message
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

      // Generate AI response
      const aiResponse = await fetch(`http://localhost:8000/conversations/${currentConversation}/messages/ai`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user: 'You', text: input }), // The message payload can be modified as needed
      });
      if (!aiResponse.ok) {
        console.error('Failed to generate AI response:', aiResponse.statusText);
        return;
      }
      const aiResponseData = await aiResponse.json();
      setMessages(aiResponseData.messages);
    } catch (error) {
      console.error('Failed to send message or generate AI response:', error);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); // Prevent default behavior (new line)
      sendMessage(); // Send message
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
                {/* Use the MessageBubble component */}
                <MessageBubble msg={msg.text} user={msg.user} />
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
            onKeyDown={handleKeyDown} // Add keydown event handler
            style={{ padding: '10px' }}
            disabled={!currentConversation} // Disable input if no conversation is selected
          />
        </Form.Group>
        <Button variant="primary" type="submit" onClick={sendMessage} style={{ height: '100%', padding: '10px' }} disabled={!currentConversation}>
          Send
        </Button>
      </Form>
    </Col>
  );
};

export default ChatWindow;

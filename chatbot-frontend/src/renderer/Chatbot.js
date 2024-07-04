import React, { useState } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import ConversationList from './ConversationList';
import SettingsPanel from './SettingsPanel'; // Import the new SettingsPanel component
import ChatWindow from './ChatWindow'; // Import the new ChatWindow component

const Chatbot = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [currentConversation, setCurrentConversationId] = useState(null); // Rename state variable
  const [totalLength, setTotalLength] = useState(0);

  return (
    <Container style={{ marginTop: '0px', height: 'calc(100vh - 20px)', width: '100%' }}> 
      <Row style={{ height: '100%', width: '100%', alignItems: 'stretch' }}>
        <Col style={{ flex: 1, marginTop: '20px' }}>
          <ConversationList
            setMessages={setMessages}
            setCurrentConversationId={setCurrentConversationId}
            currentConversation={currentConversation}
            totalLength={totalLength}
            setTotalLength={setTotalLength}
          />
        </Col>
        <Col style={{ flex: 3, marginTop: '20px' }}> {/* Adjust the flex value as needed */}
          <ChatWindow
            messages={messages}
            setMessages={setMessages}
            input={input}
            setInput={setInput}
            currentConversation={currentConversation}
            setCurrentConversationId={setCurrentConversationId}
            setTotalLength={setTotalLength}
          />
        </Col>
      </Row>
      <Row style={{ marginTop: '20px' }}>
        <Col style={{ flex: 1 }}>
          <SettingsPanel />
        </Col>
      </Row>
    </Container>
  );
};

export default Chatbot;

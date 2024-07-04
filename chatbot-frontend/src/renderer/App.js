import React from 'react';
import Chatbot from './Chatbot.js';
import { Container } from 'react-bootstrap';

function App() {
  return (
    <Container fluid style={{ padding: '0', width: '100vw' }}>
      <Chatbot />
    </Container>
  );
}

export default App;

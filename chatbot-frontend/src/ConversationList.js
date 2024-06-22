import React, { useState, useEffect } from 'react';
import { ListGroup, Button, Modal, Form } from 'react-bootstrap';
import './css/Chatbot.css'; // Make sure to import your SCSS file

const ConversationList = ({ setMessages, setCurrentConversationId, currentConversation, totalLength, setTotalLength }) => {
  const [conversations, setConversations] = useState([]);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameConversationId, setRenameConversationId] = useState(null);
  const [newConversationName, setNewConversationName] = useState('');
  const [renameError, setRenameError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConversationId, setDeleteConversationId] = useState(null);

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    const response = await fetch('http://localhost:8000/conversations');
    const data = await response.json();
    setConversations(data);
  };

  const handleNewConversation = async () => {
    const response = await fetch('http://localhost:8000/conversations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    if (response.ok) {
      const data = await response.json();
      setConversations([...conversations, data]);
      setCurrentConversationId(data.id);
      setMessages([]);
      setTotalLength(0);
      // Update total length after adding a new conversation
      fetchConversations();
    } else {
      console.error('Failed to create new conversation');
    }
  };

  const handleSelectConversation = async (conversationId) => {
    const response = await fetch(`http://localhost:8000/conversations/${conversationId}`);
    const data = await response.json();
    setMessages(data.conversation.messages);
    setTotalLength(data.total_length);
    setCurrentConversationId(conversationId);
  };

  const handleRenameConversation = async (conversationId, newName) => {
    if (!newName.trim()) {
      setRenameError('Name cannot be empty');
      return;
    }

    const response = await fetch(`http://localhost:8000/conversations/${conversationId}/rename`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: newName }),
    });

    if (response.ok) {
      const data = await response.json();
      setConversations(conversations.map(conv => (conv.id === data.id ? data : conv)));
      setShowRenameModal(false);
      setRenameConversationId(null);
      setNewConversationName('');
      setRenameError('');
    } else {
      console.error('Failed to rename conversation');
    }
  };

  const handleDeleteConversation = async (conversationId) => {
    const response = await fetch(`http://localhost:8000/conversations/${conversationId}`, {
      method: 'DELETE',
    });

    if (response.ok) {
      setConversations(conversations.filter(conv => conv.id !== conversationId));
      if (currentConversation === conversationId) {
        setCurrentConversationId(null);
        setMessages([]);
        setTotalLength(0);
      }
      setShowDeleteModal(false);
      setDeleteConversationId(null);
      // Update total length after deleting a conversation
      fetchConversations();
    } else {
      console.error('Failed to delete conversation');
    }
  };

  return (
    <div>
      <div className="d-flex align-items-center mb-3">
        <Button onClick={handleNewConversation} className="me-2 d-flex align-items-center">
          New
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" className="bi bi-plus ms-1" viewBox="0 0 16 14">
            <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4"/>
          </svg>
        </Button>
        <span className="total-length">Tokens: {totalLength}</span>
      </div>
      <ListGroup className="conversation-list">
        {conversations.map(conversation => (
          <ListGroup.Item
            key={conversation.id}
            active={conversation.id === currentConversation}
            onClick={() => handleSelectConversation(conversation.id)}
            className="conversation-item"
          >
            <div className="conversation-content">
              <div className="conversation-name">
                {conversation.name || 'Unnamed Conversation'}
              </div>
              <div className="conversation-actions">
                <Button variant="outline-success" size="sm" onClick={(e) => {
                  e.stopPropagation();
                  setShowRenameModal(true);
                  setRenameConversationId(conversation.id);
                  setNewConversationName(conversation.name);
                }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" className="bi bi-pencil-square" viewBox="0 0 16 16">
                    <path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/>
                    <path fillRule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5z"/>
                  </svg>
                </Button>
                <Button variant="outline-danger" size="sm" onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteModal(true);
                  setDeleteConversationId(conversation.id);
                }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" className="bi bi-trash" viewBox="0 0 16 16">
                    <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
                    <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
                  </svg>
                </Button>
              </div>
            </div>
          </ListGroup.Item>
        ))}
      </ListGroup>

      <Modal show={showRenameModal} onHide={() => setShowRenameModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Rename Conversation</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group controlId="formNewName">
              <Form.Label>New Name</Form.Label>
              <Form.Control
                type="text"
                value={newConversationName}
                onChange={(e) => setNewConversationName(e.target.value)}
                isInvalid={!!renameError}
              />
              <Form.Control.Feedback type="invalid">{renameError}</Form.Control.Feedback>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRenameModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={() => handleRenameConversation(renameConversationId, newConversationName)}>Rename</Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Delete Conversation</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete this conversation?
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
          <Button variant="danger" onClick={() => handleDeleteConversation(deleteConversationId)}>Delete</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default ConversationList;

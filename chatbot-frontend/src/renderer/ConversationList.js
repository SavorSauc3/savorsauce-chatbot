import React, { useState, useEffect } from 'react';
import { ListGroup, Button, Modal, Form, OverlayTrigger, Tooltip } from 'react-bootstrap';

const ConversationList = ({ setMessages, setCurrentConversationId, currentConversation, totalLength, setTotalLength }) => {
  const [conversations, setConversations] = useState([]);
  const [selectedConversations, setSelectedConversations] = useState([]);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameConversationId, setRenameConversationId] = useState(null);
  const [newConversationName, setNewConversationName] = useState('');
  const [renameError, setRenameError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConversationId, setDeleteConversationId] = useState(null);
  const [canEdit, setCanEdit] = useState(false);

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
      fetchConversations();
    } else {
      console.error('Failed to delete conversation');
    }
  };

  const handleDeleteSelectedConversations = async () => {
    await Promise.all(selectedConversations.map(async (conversationId) => {
      const response = await fetch(`http://localhost:8000/conversations/${conversationId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setConversations(prevConversations => prevConversations.filter(conv => conv.id !== conversationId));
      } else {
        console.error(`Failed to delete conversation with id ${conversationId}`);
      }
    }));

    setSelectedConversations([]);
    if (selectedConversations.includes(currentConversation)) {
      setCurrentConversationId(null);
      setMessages([]);
      setTotalLength(0);
    }
    fetchConversations();
  };

  const toggleSelectConversation = (conversationId) => {
    setSelectedConversations(prevSelected => {
      if (prevSelected.includes(conversationId)) {
        return prevSelected.filter(id => id !== conversationId);
      } else {
        return [...prevSelected, conversationId];
      }
    });
  };

  const toggleCanEdit = () => {
    setCanEdit(prevCanEdit => !prevCanEdit);
    if (canEdit) {
      setSelectedConversations([]);
    }
  };

  return (
    <div>
      <div className="d-flex align-items-center mb-3">
        <OverlayTrigger placement="bottom" overlay=<Tooltip id="total-length-tooltip">New Conversation</Tooltip>>
          <Button onClick={handleNewConversation} id="new-conv-button" className="d-flex align-items-center">
            New
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" className="bi bi-plus ms-1" viewBox="0 0 16 14">
              <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4"/>
            </svg>
          </Button>
        </OverlayTrigger>
        <OverlayTrigger placement="bottom" overlay=<Tooltip id="total-length-tooltip">Delete Selected</Tooltip>>
          <Button variant="outline-danger" onClick={handleDeleteSelectedConversations} disabled={selectedConversations.length === 0} className="ms-2" id="delete-selected-btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" className="bi bi-trash" viewBox="0 0 16 16">
              <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
              <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
            </svg>
          </Button>
        </OverlayTrigger>
        <OverlayTrigger placement="bottom" overlay=<Tooltip id="total-length-tooltip">Toggle Select Conversations</Tooltip>>
          <Button variant={canEdit ? "outline-danger" : "outline-info"} onClick={toggleCanEdit} className="ms-2" id="toggle-select-btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" class="bi bi-check-all" viewBox="0 0 16 16">
              <path d="M8.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L2.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093L8.95 4.992zm-.92 5.14.92.92a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 1 0-1.091-1.028L9.477 9.417l-.485-.486z"/>
            </svg>
          </Button>
        </OverlayTrigger>
        <OverlayTrigger
          placement="bottom"
          overlay={<Tooltip id="total-length-tooltip">Number of tokens: {totalLength}</Tooltip>}
        >
          <span id="token-count" className="total-length">{totalLength}</span>
        </OverlayTrigger>
      </div>
      <ListGroup className="conversation-list">
        {conversations.map(conversation => (
          <ListGroup.Item
            key={conversation.id}
            active={conversation.id === currentConversation}
            onClick={() => handleSelectConversation(conversation.id)}
            className="conversation-item d-flex align-items-center"
          >
            {canEdit && (
              <Form.Check
                type="checkbox"
                checked={selectedConversations.includes(conversation.id)}
                onChange={(e) => {
                  e.stopPropagation();
                  toggleSelectConversation(conversation.id);
                }}
                className="me-2"
              />
            )}
            <div className="conversation-content flex-grow-1">
              <div className="conversation-name">
                {conversation.name || 'Unnamed Conversation'}
              </div>
              <div className="conversation-actions">
                <OverlayTrigger placement="bottom" overlay=<Tooltip id="total-length-tooltip">Rename</Tooltip>>
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
                </OverlayTrigger>
                <OverlayTrigger placement="bottom" overlay=<Tooltip id="total-length-tooltip">Delete</Tooltip>>
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
                </OverlayTrigger>
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

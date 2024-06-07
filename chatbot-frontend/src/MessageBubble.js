import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { Tooltip, OverlayTrigger, Form, Button } from 'react-bootstrap';
import './Chatbot.css'; // Import CSS file for animations

const MessageBubble = ({ msg, user, onEdit, conversationId, messageIndex }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(msg);

  const handleMouseEnter = () => {
    setIsHovered(true);
    setCopied(false); // Reset copied state when mouse enters
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000); // Reset copied state after 2 seconds
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleEditChange = (e) => {
    setEditText(e.target.value);
  };

  const handleEditSubmit = async () => {
    try {
      const response = await fetch(`http://localhost:8000/conversations/${conversationId}/messages/${messageIndex}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user, text: editText }),
      });
      if (response.ok) {
        onEdit(editText);
        setIsEditing(false);
      } else {
        console.error('Failed to edit message');
      }
    } catch (error) {
      console.error('Error editing message:', error);
    }
  };

  const handleEditCancel = () => {
    setIsEditing(false);
    setEditText(msg); // Reset edit text to original message
  };

  return (
    <div
      className={`message-bubble ${user === 'You' ? 'user bg-success text-white' : 'bot bg-secondary text-white'}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ position: 'relative' }}
    >
      {isEditing ? (
        <Form onSubmit={(e) => { e.preventDefault(); handleEditSubmit(); }}>
          <Form.Control
            as="textarea"
            rows={3}
            value={editText}
            onChange={handleEditChange}
          />
          <div style={{ marginTop: '5px', display: 'flex', justifyContent: 'space-between' }}>
            <Button variant="primary" type="submit">
              Save
            </Button>
            <Button variant="secondary" onClick={handleEditCancel}>
              Cancel
            </Button>
          </div>
        </Form>
      ) : (
        <>
          <ReactMarkdown>{msg}</ReactMarkdown>
          <OverlayTrigger
            placement="bottom"
            overlay={<Tooltip id="tooltip-bottom">{copied ? "Copied!" : "Copy message"}</Tooltip>}
          >
            <CopyToClipboard text={msg} onCopy={handleCopy}>
              <button
                className={`copy-button ${isHovered ? 'show' : ''}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-copy" viewBox="0 0 16 16">
                  <path fillRule="evenodd" d="M4 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1zM2 5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1h1v1a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1v1z"/>
                </svg>
              </button>
            </CopyToClipboard>
          </OverlayTrigger>
          {user === 'You' && (
            <OverlayTrigger
              placement="bottom"
              overlay={<Tooltip id="tooltip-edit">Edit message</Tooltip>}
            >
              <button
                className={`edit-button ${isHovered ? 'show' : ''}`}
                onClick={handleEdit}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-pen" viewBox="0 0 16 16">
                  <path d="m13.498.795.149-.149a1.207 1.207 0 1 1 1.707 1.708l-.149.148a1.5 1.5 0 0 1-.059 2.059L4.854 14.854a.5.5 0 0 1-.233.131l-4 1a.5.5 0 0 1-.606-.606l1-4a.5.5 0 0 1 .131-.232l9.642-9.642a.5.5 0 0 0-.642.056L6.854 4.854a.5.5 0 1 1-.708-.708L9.44.854A1.5 1.5 0 0 1 11.5.796a1.5 1.5 0 0 1 1.998-.001m-.644.766a.5.5 0 0 0-.707 0L1.95 11.756l-.764 3.057 3.057-.764L14.44 3.854a.5.5 0 0 0 0-.708z"/>
                </svg>
              </button>
            </OverlayTrigger>
          )}
        </>
      )}
    </div>
  );
};

export default MessageBubble;

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { Tooltip, OverlayTrigger } from 'react-bootstrap';
import './Chatbot.css'; // Import CSS file for animations

const MessageBubble = ({ msg, user }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [copied, setCopied] = useState(false);

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

  return (
    <div
      className={`message-bubble ${user === 'You' ? 'user bg-success text-white' : 'bot bg-secondary text-white'}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ position: 'relative' }}
    >
      <ReactMarkdown>{msg}</ReactMarkdown>
      <OverlayTrigger
        placement="bottom"
        overlay={<Tooltip id="tooltip-bottom">{copied ? "Copied!" : "Copy message"}</Tooltip>}
      >
        <CopyToClipboard text={msg} onCopy={handleCopy}>
          <button
            className={`copy-button ${isHovered ? 'show' : ''}`}
          >
            {/* SVG code */}
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-copy" viewBox="0 0 16 16">
              <path fillRule="evenodd" d="M4 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1zM2 5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1h1v1a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1v1z"/>
            </svg>
          </button>
        </CopyToClipboard>
      </OverlayTrigger>
    </div>
  );
};

export default MessageBubble;

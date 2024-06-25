import React, { useState, useEffect } from 'react';
import { Button, Form, Spinner } from 'react-bootstrap';

const ChatSettings = ( {showModal, setShowModal }) => {
  const [systemPrompt, setSystemPrompt] = useState('');
  const [temperature, setTemperature] = useState(0.2);
  const [topP, setTopP] = useState(0.95);
  const [topK, setTopK] = useState(40);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('http://localhost:8000/chat_params');
        if (!response.ok) {
          throw new Error('Failed to fetch chat parameters');
        }
        const data = await response.json();
        setSystemPrompt(data.system_prompt);
        setTemperature(data.temperature);
        setTopP(data.top_p);
        setTopK(data.top_k);
      } catch (error) {
        console.error('Failed to fetch chat parameters:', error);
      }
    };

    fetchData();
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/chat_params', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          system_prompt: systemPrompt,
          temperature: temperature,
          top_p: topP,
          top_k: topK,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save chat parameters');
      }

      const result = await response.json();
      console.log('Saved chat parameters:', result);
    } catch (error) {
      console.error('Failed to save chat parameters:', error);
    } finally {
      setLoading(false);
      setShowModal(false);
    }
  };

  const handleCancel = () => {
    // Optionally reset to initial values or perform any cancel action
    setShowModal(false);
  };

  return (
    <Form>
      <Form.Group controlId="systemPrompt" className="mb-3">
        <Form.Label>System Prompt</Form.Label>
        <Form.Control
          type="text"
          placeholder="Enter system prompt"
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
        />
      </Form.Group>

      <Form.Group controlId="temperature" className="mb-3">
        <Form.Label>Temperature: {temperature}</Form.Label>
        <Form.Control
          className="form-control-range"
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={temperature}
          onChange={(e) => setTemperature(parseFloat(e.target.value))}
        />
      </Form.Group>

      <Form.Group controlId="topP" className="mb-3">
        <Form.Label>Top P: {topP}</Form.Label>
        <Form.Control
          className="form-control-range"
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={topP}
          onChange={(e) => setTopP(parseFloat(e.target.value))}
        />
      </Form.Group>

      <Form.Group controlId="topK" className="mb-3">
        <Form.Label>Top K: {topK}</Form.Label>
        <Form.Control
          className="form-control-range"
          type="range"
          min={0}
          max={100}
          step={1}
          value={topK}
          onChange={(e) => setTopK(parseInt(e.target.value))}
        />
      </Form.Group>

      <Button variant="secondary" onClick={handleCancel} disabled={loading} className="me-2">
        Cancel
      </Button>
      <Button variant="primary" onClick={handleSave} disabled={loading}>
        {loading ? <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" /> : 'Save'}
      </Button>
    </Form>
  );
};

export default ChatSettings;

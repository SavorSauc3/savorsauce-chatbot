import React, { useState, useEffect } from 'react';
import { Button, Modal, Form } from 'react-bootstrap';

const SettingsPanel = () => {
  const [availableModels, setAvailableModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('Loading models...');
  const [defaultModel, setDefaultModel] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [tempSelectedModel, setTempSelectedModel] = useState('');

  useEffect(() => {
    fetchAvailableModels();
    fetchDefaultModel();
  }, []);

  useEffect(() => {
    if (availableModels.length > 0) {
      setSelectedModel(availableModels.includes(defaultModel) ? defaultModel : availableModels[0]);
    }
  }, [availableModels, defaultModel]);

  const fetchAvailableModels = async () => {
    try {
      const response = await fetch('http://localhost:8000/models');
      if (!response.ok) {
        console.error('Failed to fetch available models');
        return;
      }
      const data = await response.json();
      setAvailableModels(data);
    } catch (error) {
      console.error('Failed to fetch available models:', error);
    }
  };

  const fetchDefaultModel = async () => {
    try {
      const response = await fetch('http://localhost:8000/default_model');
      if (!response.ok) {
        console.error('Failed to fetch default model');
        return;
      }
      const data = await response.json();
      setDefaultModel(data.default_model);
    } catch (error) {
      console.error('Failed to fetch default model:', error);
    }
  };

  const handleModelSelect = (model) => {
    setTempSelectedModel(model);
  };

  const saveSettings = async () => {
    try {
      const response = await fetch(`http://localhost:8000/set_model/${tempSelectedModel}`, {
        method: 'POST',
      });
      if (!response.ok) {
        console.error('Failed to set model');
        return;
      }
      setSelectedModel(tempSelectedModel);
      setShowModal(false);
    } catch (error) {
      console.error('Failed to set model:', error);
    }
  };

  const handleCancel = () => {
    setTempSelectedModel(selectedModel);
    setShowModal(false);
  };

  return (
    <>
      <Button
      variant="outline-info"
      onClick={() => setShowModal(true)}
      style={{ position: 'fixed', top: 10, right: 10 }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        fill="currentColor"
        className="bi bi-gear text-info"
        viewBox="0 0 16 16"
      >
        <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492M5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0"/>
        <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.291c.415.764-.42 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 0 0-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.692-1.115l-.292.16c-.764.415-1.6-.42-1.184-1.185l.159-.291A1.873 1.873 0 0 0 1.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 0 0 3.06 4.377l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.692-1.115z"/>
      </svg>
    </Button>

      <Modal show={showModal} onHide={handleCancel}>
        <Modal.Header closeButton>
          <Modal.Title>Select Model</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            {availableModels.map((model, index) => (
              <Form.Check 
                type="radio" 
                name="modelOptions" 
                id={`model-${index}`} 
                key={index} 
                label={model} 
                checked={tempSelectedModel === model} 
                onChange={() => handleModelSelect(model)} 
              />
            ))}
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCancel}>
            Cancel
          </Button>
          <Button variant="primary" onClick={saveSettings}>
            Save
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default SettingsPanel;

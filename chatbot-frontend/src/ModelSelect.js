import React, { useState, useEffect } from 'react';
import { Button, Form, Dropdown, DropdownButton, Spinner } from 'react-bootstrap';

const ModelSelect = ({ showModal, setShowModal }) => {
  const [tempSelectedModel, setTempSelectedModel] = useState('');
  const [availableModels, setAvailableModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('Loading models...');
  const [cudaAvailable, setCudaAvailable] = useState(false);
  const [useCuda, setUseCuda] = useState(false);
  const [maxGpuLayers, setMaxGpuLayers] = useState(0); // Max value for the GPU layers slider
  const [gpuLayers, setGpuLayers] = useState(0); // State to hold the GPU layers value
  const [contextLength, setContextLength] = useState(512); // Default context length
  const [maxContextLength, setMaxContextLength] = useState(512) // Holds Maximum context length
  const [loading, setLoading] = useState(false); // State to handle loading animation

  useEffect(() => {
    if (showModal) {
      fetchCurrentModel();
      fetchAvailableModels();
      checkCudaAvailability();
    }
  }, [showModal]); // Run when modal is shown

  useEffect(() => {
    if (availableModels.length > 0) {
      const initialModel = availableModels.includes(selectedModel) ? selectedModel : availableModels[0];
      setSelectedModel(initialModel);
      setTempSelectedModel(initialModel);
    }
  }, [availableModels, selectedModel]);

  const fetchCurrentModel = async () => {
    try {
      const response = await fetch('http://localhost:8000/current_model');
      if (!response.ok) {
        console.error('Failed to fetch current model');
        return;
      }
      const data = await response.json();
      setSelectedModel(data.current_model);
      setTempSelectedModel(data.current_model);

      // Unpack and handle the model_metadata
      const modelMetadata = data.model_metadata;
      setMaxGpuLayers(modelMetadata['llama.block_count']); // Assuming the metadata contains num_blocks
      setMaxContextLength(modelMetadata['llama.context_length']);
      setContextLength(Math.floor(modelMetadata['llama.context_length'] / 2));
      setGpuLayers(Math.floor(modelMetadata['llama.block_count'] / 2)); // Reset GPU layers to half on model change
    } catch (error) {
      console.error('Failed to fetch current model:', error);
    }
  };

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

  const checkCudaAvailability = async () => {
    try {
      const response = await fetch('http://localhost:8000/check_cuda');
      if (!response.ok) {
        console.error('Failed to check CUDA availability');
        return;
      }
      const data = await response.json();
      setCudaAvailable(data.cuda_installed);
    } catch (error) {
      console.error('Failed to check CUDA availability:', error);
    }
  };

  const handleModelSelect = async (model) => {
    setTempSelectedModel(model);
    try {
      const response = await fetch(`http://localhost:8000/${model}/metadata`);
      if (!response.ok) {
        console.error(`Failed to fetch metadata for ${model}`);
        return;
      }
      const data = await response.json();
      setMaxGpuLayers(data['llama.block_count']); // Assuming the metadata contains num_blocks
      setMaxContextLength(data['llama.context_length']);
      setContextLength(Math.floor(data['llama.context_length'] / 2));
      setGpuLayers(Math.floor(data['llama.block_count'] / 2)); // Reset GPU layers to half on model change
    } catch (error) {
      console.error(`Failed to fetch metadata for ${model}:`, error);
    }
  };

  const handleCudaCheckbox = () => {
    setUseCuda(!useCuda);
  };

  const handleGpuLayersChange = (event) => {
    setGpuLayers(parseInt(event.target.value));
  };

  const handleContextLengthChange = (event) => {
    setContextLength(parseInt(event.target.value));
  };

  const saveSettings = async () => {
    setLoading(true); // Start loading animation
    try {
      let url = `http://localhost:8000/set_model/${tempSelectedModel}?use_cuda=${useCuda}`;
      if (useCuda && gpuLayers > 0) {
        url += `&n_gpu_layers=${gpuLayers}`;
      }
      if (contextLength > 0) {
        url += `&context_length=${contextLength}`;
      }
      const response = await fetch(url, {
        method: 'POST',
      });
      if (!response.ok) {
        console.error('Failed to set model');
        setLoading(false); // Stop loading animation
        return;
      }
      const result = await response.json();
      console.log(result.message); // Log the message to ensure the model is set
      setSelectedModel(tempSelectedModel);
      setShowModal(false); // Close the main modal
    } catch (error) {
      console.error('Failed to set model:', error);
    } finally {
      setLoading(false); // Stop loading animation
    }
  };

  const handleCancel = () => {
    setTempSelectedModel(selectedModel);
    setShowModal(false); // Close the main modal
  };

  return (
    <Form>
      <DropdownButton
        id="dropdown-basic-button"
        title={tempSelectedModel || 'Select a model'}
        className="mb-3 mt-3" // Added margin bottom
      >
        {availableModels.map((model, index) => (
          <Dropdown.Item
            key={index}
            onClick={() => handleModelSelect(model)}
            active={model === tempSelectedModel}
            className={model === selectedModel ? 'bg-secondary text-white' : ''}
          >
            {model}
          </Dropdown.Item>
        ))}
      </DropdownButton>

      <Form.Check
        type="checkbox"
        id="enable_cuda"
        label="Enable CUDA"
        checked={useCuda}
        onChange={handleCudaCheckbox}
        disabled={!cudaAvailable}
        className="mb-3" // Added margin bottom
      />

      {useCuda && (
        <Form.Group controlId="gpuLayersSlider" className="mb-3"> {/* Added margin bottom */}
          <Form.Label>GPU Layers: {gpuLayers}</Form.Label>
          <Form.Control
            className="form-control-range"
            type="range"
            min="0"
            max={maxGpuLayers}
            value={gpuLayers}
            onChange={handleGpuLayersChange}
          />
        </Form.Group>
      )}

      <Form.Group controlId="contextLengthSlider" className="mb-3"> {/* Added margin bottom */}
        <Form.Label>Context Length: {contextLength}</Form.Label>
        <Form.Control
          className="form-control-range"
          type="range"
          min="512"
          max={maxContextLength} // Assuming 4096 is the maximum context length
          value={contextLength}
          onChange={handleContextLengthChange}
        />
      </Form.Group>

      <Button variant="secondary" onClick={handleCancel} disabled={loading} className="me-2">
        Cancel
      </Button>
      <Button variant="primary" onClick={saveSettings} disabled={loading}>
        {loading ? <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" /> : 'Save'}
      </Button>
    </Form>
  );
};

export default ModelSelect;

import React, { useState, useEffect } from 'react';
import { Button, Form, Dropdown, DropdownButton, Spinner } from 'react-bootstrap';

const ModelSelect = ({
  showModal,
  setShowModal,
  cudaAvailable,
  setCudaAvailable,
  availableModels,
  setAvailableModels,
}) => {
  const [tempSelectedModel, setTempSelectedModel] = useState('');
  const [selectedModel, setSelectedModel] = useState('Loading models...');
  const [useCuda, setUseCuda] = useState(false);
  const [maxGpuLayers, setMaxGpuLayers] = useState(0); // Max value for the GPU layers slider
  const [gpuLayers, setGpuLayers] = useState(0); // State to hold the GPU layers value
  const [contextLength, setContextLength] = useState(512); // Default context length
  const [maxContextLength, setMaxContextLength] = useState(512); // Holds Maximum context length
  const [loading, setLoading] = useState(false); // State to handle loading animation

  useEffect(() => {
    if (showModal) {
      const fetchData = async () => {
        try {
          // Fetch current model and its metadata
          const [currentModelResponse, availableModelsResponse, cudaAvailabilityResponse] =
            await Promise.all([
              fetch('http://localhost:8000/current_model'),
              fetch('http://localhost:8000/models'),
              fetch('http://localhost:8000/check_cuda'),
            ]);

          if (!currentModelResponse.ok) {
            throw new Error('Failed to fetch current model');
          }
          const currentModelData = await currentModelResponse.json();
          const modelMetadata = currentModelData.model_metadata;

          setSelectedModel(currentModelData.current_model);
          setTempSelectedModel(currentModelData.current_model);
          setAvailableModels(await availableModelsResponse.json());
          setCudaAvailable((await cudaAvailabilityResponse.json()).cuda_installed);

          // Set initial max values and adjust sliders
          setMaxGpuLayers(modelMetadata['llama.block_count']);
          setMaxContextLength(modelMetadata['llama.context_length']);
          setGpuLayers(Math.floor(modelMetadata['llama.block_count'] / 2));
          setContextLength(Math.floor(modelMetadata['llama.context_length'] / 2));
        } catch (error) {
          console.error('Failed to fetch initial data:', error);
        }
      };

      fetchData();
    }
  }, [showModal]);

  const handleModelSelect = async (model) => {
    setTempSelectedModel(model);
    try {
      const response = await fetch(`http://localhost:8000/${model}/metadata`);
      if (!response.ok) {
        throw new Error(`Failed to fetch metadata for ${model}`);
      }
      const data = await response.json();
      setMaxGpuLayers(data['llama.block_count']);
      setMaxContextLength(data['llama.context_length']);
      setGpuLayers(Math.floor(data['llama.block_count'] / 2));
      setContextLength(Math.floor(data['llama.context_length'] / 2));
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
    setLoading(true);
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
        throw new Error('Failed to set model');
      }
      const result = await response.json();
      console.log(result.message);
      setSelectedModel(tempSelectedModel);
      setShowModal(false); // Close the modal upon successful save
    } catch (error) {
      console.error('Failed to set model:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setTempSelectedModel(selectedModel);
    setShowModal(false); // Close the modal
  };

  const handleEjectModel = async () => {
    try {
      const response = await fetch('http://localhost:8000/eject-model', {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error('Failed to eject model');
      }
      // Reset all model-related variables to their original values
      setSelectedModel('Loading models...');
      setTempSelectedModel('');
      setUseCuda(false);
      setMaxGpuLayers(0);
      setGpuLayers(0);
      setContextLength(512);
      setMaxContextLength(512);
    } catch (error) {
      console.error('Failed to eject model:', error);
    }
  };

  return (
    <Form>
      <DropdownButton
        id="dropdown-basic-button"
        title={tempSelectedModel || 'Select a model'}
        className="mb-3 mt-3"
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
        className="mb-3"
      />

      {useCuda && (
        <Form.Group controlId="gpuLayersSlider" className="mb-3">
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

      <Form.Group controlId="contextLengthSlider" className="mb-3">
        <Form.Label>Context Length: {contextLength}</Form.Label>
        <Form.Control
          className="form-control-range"
          type="range"
          min="512"
          max={maxContextLength}
          value={contextLength}
          onChange={handleContextLengthChange}
        />
      </Form.Group>

      <Button variant="secondary" onClick={handleCancel} disabled={loading} className="me-2">
        Cancel
      </Button>
      <Button variant="primary" onClick={saveSettings} disabled={loading}>
        {loading ? <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" /> : 'Load'}
      </Button>
      
      <Button variant="danger" onClick={handleEjectModel} disabled={loading} className="ms-2">
        {loading ? <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" /> : 'Eject'}
      </Button>
    </Form>
  );
};

export default ModelSelect;

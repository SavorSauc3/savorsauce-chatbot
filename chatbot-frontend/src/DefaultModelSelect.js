import React, { useState, useEffect } from 'react';
import { Button, Form, Dropdown, DropdownButton, Spinner } from 'react-bootstrap';

const DefaultModelSelect = ({
  availableModels = [],
  cudaAvailable,
  showModal,
  setShowModal,
}) => {
  const [tempSelectedModel, setTempSelectedModel] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [useCuda, setUseCuda] = useState(false);
  const [maxGpuLayers, setMaxGpuLayers] = useState(0);
  const [gpuLayers, setGpuLayers] = useState(0);
  const [contextLength, setContextLength] = useState(512);
  const [maxContextLength, setMaxContextLength] = useState(512);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch default model and its metadata
        const defaultModelResponse = await fetch('http://localhost:8000/default_model');
        if (!defaultModelResponse.ok) {
          throw new Error('Failed to fetch default model settings');
        }
        const defaultModelData = await defaultModelResponse.json();
        const defaultModel = defaultModelData.default_model;

        setSelectedModel(defaultModel.model_name);
        setTempSelectedModel(defaultModel.model_name);
        setUseCuda(defaultModel.use_cuda);
        setGpuLayers(parseInt(defaultModel.n_gpu_layers));
        setContextLength(parseInt(defaultModel.context_length));

        // Fetch metadata for selected model to get maxGpuLayers and maxContextLength
        const modelMetadataResponse = await fetch(`http://localhost:8000/${defaultModel.model_name}/metadata`);
        if (!modelMetadataResponse.ok) {
          throw new Error(`Failed to fetch metadata for ${defaultModel.model_name}`);
        }
        const metadata = await modelMetadataResponse.json();
        setMaxGpuLayers(parseInt(metadata['llama.block_count']));
        setMaxContextLength(parseInt(metadata['llama.context_length']));
      } catch (error) {
        console.error('Failed to fetch initial model data:', error);
      }
    };

    if (showModal) {
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
      setMaxGpuLayers(parseInt(data['llama.block_count']));
      setMaxContextLength(parseInt(data['llama.context_length']));
      setContextLength(Math.floor(parseInt(data['llama.context_length']) / 2));
      setGpuLayers(Math.floor(parseInt(data['llama.block_count']) / 2));
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
      let url = `http://localhost:8000/default_model/${tempSelectedModel}?use_cuda=${useCuda}`;
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
            min={0}
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
          min={512}
          max={maxContextLength}
          value={contextLength}
          onChange={handleContextLengthChange}
        />
      </Form.Group>

      <Button variant="secondary" onClick={handleCancel} disabled={loading} className="me-2">
        Cancel
      </Button>
      <Button variant="primary" onClick={saveSettings} disabled={loading || !tempSelectedModel}>
        {loading ? <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" /> : 'Save'}
      </Button>
    </Form>
  );
};

export default DefaultModelSelect;

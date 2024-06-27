import React, { useState, useEffect } from 'react';
import { Button, Form, Spinner, Modal } from 'react-bootstrap';

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
  const [maxGpuLayers, setMaxGpuLayers] = useState(0);
  const [gpuLayers, setGpuLayers] = useState(0);
  const [contextLength, setContextLength] = useState(512);
  const [maxContextLength, setMaxContextLength] = useState(512);
  const [loading, setLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [modelToDelete, setModelToDelete] = useState('');

  useEffect(() => {
    if (showModal) {
      const fetchData = async () => {
        try {
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
  
          console.log(currentModelData);
  
          const { model_name, n_gpu_layers, use_cuda, context_length } = currentModelData.current_model;
  
          setSelectedModel(model_name || "No Model Selected");
          setGpuLayers(n_gpu_layers || 0);
          setUseCuda(use_cuda || false);
          setContextLength(context_length || 512);
          setTempSelectedModel(model_name || "No Model Selected");  // Update this line
          setAvailableModels(await availableModelsResponse.json());
          setCudaAvailable((await cudaAvailabilityResponse.json()).cuda_installed);
  
          setMaxGpuLayers(modelMetadata['llama.block_count'] || 0);
          setMaxContextLength(modelMetadata['llama.context_length'] || 512);
          setGpuLayers(Math.floor(modelMetadata['llama.block_count'] / 2) || 0);
          setContextLength(Math.floor(modelMetadata['llama.context_length'] / 2) || 512);
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

      // Set or default to API values
      const defaultMaxGpuLayers = 0;
      const defaultMaxContextLength = 512;
      const fetchedMaxGpuLayers = data['llama.block_count'] || defaultMaxGpuLayers;
      const fetchedMaxContextLength = data['llama.context_length'] || defaultMaxContextLength;

      setMaxGpuLayers(fetchedMaxGpuLayers);
      setMaxContextLength(fetchedMaxContextLength);

      // Calculate half values or default to half of defaults
      const fetchedGpuLayers = Math.floor(fetchedMaxGpuLayers / 2) || Math.floor(defaultMaxGpuLayers / 2);
      const fetchedContextLength = Math.floor(fetchedMaxContextLength / 2) || Math.floor(defaultMaxContextLength / 2);

      setGpuLayers(fetchedGpuLayers);
      setContextLength(fetchedContextLength);
    } catch (error) {
      console.error(`Failed to fetch metadata for ${model}:`, error);
      // Reset to defaults on error
      setMaxGpuLayers(0);
      setGpuLayers(0);
      setContextLength(512);
      setMaxContextLength(512);
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
      setShowModal(false);
    } catch (error) {
      console.error('Failed to set model:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setTempSelectedModel(selectedModel);
    setShowModal(false);
  };

  const handleEjectModel = async () => {
    try {
      const response = await fetch('http://localhost:8000/eject-model', {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error('Failed to eject model');
      }
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

  const handleDeleteModel = (model) => {
    setModelToDelete(model);
    setShowDeleteModal(true);
  };

  const confirmDeleteModel = async () => {
    console.log(typeof(modelToDelete));
    try {
      const response = await fetch(`http://localhost:8000/delete_model`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ path: modelToDelete }), // Ensure path is a string
      });
      if (!response.ok) {
        throw new Error('Failed to delete model');
      }
      const result = await response.json();
      console.log(result.message);
      
      // Remove deleted model from availableModels state
      setAvailableModels(prevModels => prevModels.filter(model => model !== modelToDelete));
  
      // Close delete confirmation modal
      setShowDeleteModal(false);
    } catch (error) {
      console.error('Failed to delete model:', error);
    }
  };

  return (
    <Form>
      <div className="d-flex justify-content-between" style={{ height: '400px' }}>
        <div style={{ flex: '0 0 50%' }}>
          <h5 id="model-name" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', padding: '10px', maxWidth: '380px' }}>
            {tempSelectedModel || 'None selected'}
          </h5>
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
        </div>

        <div style={{ flex: '0 0 50%', paddingLeft: '15px' }}>
          <h5>Available Models</h5>
          <ul className="list-group" style={{ overflowY: 'scroll', maxHeight: '350px' }}>
            {availableModels.map((model, index) => (
              <li
                key={index}
                className={`list-group-item ${model === tempSelectedModel ? 'bg-secondary text-white' : ''}`}
                onClick={() => handleModelSelect(model)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  maxWidth: '350px',
                }}
                title={model}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{model}</span>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleDeleteModel(model)}
                >
                  Delete
                </Button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} className="justify-content-between">
        <Modal.Header closeButton>
          <Modal.Title>Confirm Deletion</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete<br /> <strong>{modelToDelete}</strong>?
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmDeleteModel}>
            Delete
          </Button>
        </Modal.Footer>
      </Modal>
    </Form>
  );
};

export default ModelSelect;

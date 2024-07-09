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

          const { model_name, n_gpu_layers, use_cuda, context_length } = currentModelData.current_model;

          setSelectedModel(model_name || "No Model Selected");
          setGpuLayers(n_gpu_layers || 0);
          setUseCuda(use_cuda || false);
          setContextLength(context_length || 512);
          setTempSelectedModel(model_name || "No Model Selected");
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

      const defaultMaxGpuLayers = 0;
      const defaultMaxContextLength = 512;
      const fetchedMaxGpuLayers = data['llama.block_count'] || defaultMaxGpuLayers;
      const fetchedMaxContextLength = data['llama.context_length'] || defaultMaxContextLength;

      setMaxGpuLayers(fetchedMaxGpuLayers);
      setMaxContextLength(fetchedMaxContextLength);

      const fetchedGpuLayers = Math.floor(fetchedMaxGpuLayers / 2) || Math.floor(defaultMaxGpuLayers / 2);
      const fetchedContextLength = Math.floor(fetchedMaxContextLength / 2) || Math.floor(defaultMaxContextLength / 2);

      setGpuLayers(fetchedGpuLayers);
      setContextLength(fetchedContextLength);
    } catch (error) {
      console.error(`Failed to fetch metadata for ${model}:`, error);
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
    try {
      const response = await fetch(`http://localhost:8000/delete_model`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ path: modelToDelete }),
      });
      if (!response.ok) {
        throw new Error('Failed to delete model');
      }
      const result = await response.json();
      console.log(result.message);

      setAvailableModels(prevModels => prevModels.filter(model => model !== modelToDelete));

      setShowDeleteModal(false);
    } catch (error) {
      console.error('Failed to delete model:', error);
    }
  };

  return (
    <Form>
      <div className="d-flex justify-content-between" style={{ height: '400px' }}>
        <div style={{ flex: '0 0 50%' }}>
          <h5 id="model-name" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', padding: '10px', maxWidth: '350px' }}>
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

          <div className='d-flex justify-content-center'>
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
        </div>

        <div style={{ flex: '0 0 50%', paddingLeft: '15px', textAlign: 'center' }}>
          <h5 style={{ padding: '10px' }}>Available Models</h5>
          <ul id="available-models-list" className="list-group" style={{ height: '350px', overflowY: 'auto', margin: 0, padding: 0 }}>
            {availableModels.map((model, index) => (
              <li
                key={index}
                className={`list-group-item ${model === tempSelectedModel ? 'bg-primary text-white' : 'bg-light text-black'}`}
                onClick={() => handleModelSelect(model)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  margin: '.5px 0', // Maintain vertical distance between items
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
                title={model}
                id='model-list-item'
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '80%', whiteSpace: 'nowrap' }}>{model}</span>
                <Button
                  variant="outline-danger"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteModel(model);
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" className="bi bi-trash" viewBox="0 0 16 16">
                    <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
                    <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
                  </svg>
                </Button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Delete Model</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete the model "{modelToDelete}"?
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

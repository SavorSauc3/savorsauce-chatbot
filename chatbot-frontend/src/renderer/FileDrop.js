import React, { useState, useRef } from 'react';
import axios from 'axios';

const DragAndDrop = () => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const uploadCancelToken = useRef(null);

  const handleDrop = (event) => {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files);
    setSelectedFiles(files);
    setUploadProgress(0);

    // Log the file paths to the console
    files.forEach(file => {
      console.log(file.path);
    });
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const handleFileUpload = async () => {
    const formData = new FormData();
    selectedFiles.forEach((file) => {
      formData.append('files', file);
    });

    uploadCancelToken.current = axios.CancelToken.source();
    setIsUploading(true);

    try {
      const response = await axios.post('http://localhost:8000/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        cancelToken: uploadCancelToken.current.token,
        onUploadProgress: (progressEvent) => {
          const progress = (progressEvent.loaded / progressEvent.total) * 100;
          setUploadProgress(progress);
          if (progress === 100) {
            setTimeout(() => {
              setSelectedFiles([]);
              setUploadProgress(0);
              setIsUploading(false);
            }, 1000);
          }
        },
      });
      console.log('Files uploaded successfully:', response.data);
    } catch (error) {
      if (axios.isCancel(error)) {
        console.log('File upload cancelled');
      } else {
        console.error('Error uploading files:', error);
      }
      setIsUploading(false);
    }
  };

  const handleLoadFromPath = async () => {
    try {
      const paths = selectedFiles.map(file => file.path);
      const names = selectedFiles.map(file => file.name.split('.').slice(0, -1).join('.'));

      const response = await axios.post('http://localhost:8000/load_from_path', { paths, names });
      console.log('Files loaded successfully from path:', response.data);
      setSelectedFiles([]);
    } catch (error) {
      console.error('Error loading files from path:', error);
    }
  };

  const handleCancelUpload = () => {
    if (uploadCancelToken.current) {
      uploadCancelToken.current.cancel();
      setUploadProgress(0);
      setSelectedFiles([]);
      setIsUploading(false);
    }
  };

  return (
    <div className="container mt-5">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="border border-primary rounded p-5 d-flex justify-content-center align-items-center"
        style={{ height: '200px' }}
      >
        <p className="text-center">
          Drag and drop files here <br />
          Note: It may take a few minutes after uploading for the model to become available
        </p>
      </div>
      {selectedFiles.length > 0 && (
        <div className="mt-3">
          <p>Selected files:</p>
          <ul className="list-group">
            {selectedFiles.map((file, index) => (
              <li key={index} className="list-group-item">
                {file.name}
              </li>
            ))}
          </ul>
          <div className="mt-3">
            <button className="btn btn-primary" onClick={handleFileUpload} disabled={isUploading}>
              Upload Files
            </button>
            {isUploading && (
              <button className="btn btn-secondary ms-2" onClick={handleCancelUpload}>
                Cancel Upload
              </button>
            )}
            <button className="btn btn-primary ms-2" disabled={isUploading} onClick={handleLoadFromPath}>
              Load from Path
            </button>
            {uploadProgress > 0 && (
              <div className="progress mt-2">
                <div
                  className={`progress-bar ${uploadProgress === 100 ? 'bg-success' : 'bg-primary'}`}
                  role="progressbar"
                  style={{ width: `${uploadProgress}%` }}
                  aria-valuenow={uploadProgress}
                  aria-valuemin="0"
                  aria-valuemax="100"
                >
                  {uploadProgress.toFixed(2)}%
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DragAndDrop;

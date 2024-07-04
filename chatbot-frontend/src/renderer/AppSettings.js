import React, { useState, useEffect } from 'react';
import { Form, Spinner } from 'react-bootstrap';
import DefaultModelSelect from './DefaultModelSelect';

const AppSettings = ({cudaAvailable, availableModels, showModal, setShowModal}) => {
  const [loadOnStartup, setLoadOnStartup] = useState(false);
  const [loading, setLoading] = useState(true); // State to handle loading animation for initial fetch

  useEffect(() => {
    fetchLoadOnStartup();
  }, []);

  const fetchLoadOnStartup = async () => {
    try {
      const response = await fetch('http://localhost:8000/settings/load_on_startup');
      if (!response.ok) {
        console.error('Failed to fetch load on startup');
        return;
      }
      const data = await response.json();
      setLoadOnStartup(data.load_on_startup);
    } catch (error) {
      console.error('Error fetching load on startup:', error);
    } finally {
      setLoading(false); // Stop loading animation after fetch
    }
  };

  const handleLoadOnStartupChange = async () => {
    const newValue = !loadOnStartup;
    setLoadOnStartup(newValue);
    try {
      const response = await fetch('http://localhost:8000/settings/load_on_startup', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ load_on_startup: newValue }),
      });
      if (!response.ok) {
        console.error('Failed to update load on startup');
        return;
      }
      const data = await response.json();
      setLoadOnStartup(data.load_on_startup);
    } catch (error) {
      console.error('Error updating load on startup:', error);
    }
  };

  return (
    <div>
      {loading ? (
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      ) : (
        <Form>
          <Form.Check
            type="checkbox"
            id="load_on_startup"
            label="Load on Startup"
            className="mb-3 checkbox-with-padding-top" // Custom class for padding top
            checked={loadOnStartup}
            onChange={handleLoadOnStartupChange}
          />
        </Form>
      )}

      {loadOnStartup && <DefaultModelSelect cudaAvailable={cudaAvailable} availableModels={availableModels} showModal={showModal} setShowModal={setShowModal} />}
    </div>
  );
};

export default AppSettings;

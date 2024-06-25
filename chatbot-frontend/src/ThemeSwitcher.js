import React from 'react';
import themes from './themes.json';
import './css/Chatbot.css';

const ThemeSwitcher = ({ selectedTheme, setSelectedTheme }) => {

  const handleThemeChange = async (event) => {
    const themePath = event.target.value;
    setSelectedTheme(themePath);

    try {
      const response = await fetch('http://localhost:8000/update-theme', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ themePath })
      });

      if (!response.ok) {
        throw new Error('Failed to update theme');
      }

      console.log('Theme updated successfully');
    } catch (error) {
      console.error('Error updating theme:', error);
    }
  };

  return (
    <div className="container mt-3">
      <div className="form-group">
        <label htmlFor="themeSelector">Select Theme:</label>
        <select
          id="themeSelector"
          className="selectpicker" // Use the specified class name for styling
          onChange={handleThemeChange}
          value={selectedTheme}
        >
          {themes.map((theme) => (
            <option key={theme.themeName} value={theme.path}>
              {theme.themeName}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default ThemeSwitcher;

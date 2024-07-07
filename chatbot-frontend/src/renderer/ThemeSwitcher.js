import React, { useEffect, useState } from 'react';
import themes from './themes.json'; // Assuming you have a JSON file listing your themes

const ThemeSwitcher = ({ selectedTheme, setSelectedTheme }) => {
  const [currentTheme, setCurrentTheme] = useState(selectedTheme);

  // Fetch the current theme from the backend immediately after component mounts
  useEffect(() => {
    const fetchCurrentTheme = async () => {
      try {
        const response = await fetch('http://localhost:8000/current_theme');
        if (response.ok) {
          const data = await response.json();
          const themeName = data.themePath.toLowerCase();

          // Find the path for the fetched theme
          const selectedThemeObject = themes.find(theme => theme.themeName.toLowerCase() === themeName);
          const themePath = selectedThemeObject ? selectedThemeObject.path : '';

          // Update the selected theme and the current theme state
          setSelectedTheme(themeName);
          setCurrentTheme(themeName);

          // Update the theme dynamically
          const linkElement = document.getElementById('themeStylesheet');
          if (linkElement) {
            linkElement.href = themePath; // Update the href attribute to switch the stylesheet
          }
        } else {
          console.error('Failed to fetch current theme:', response.statusText);
        }
      } catch (error) {
        console.error('Failed to fetch current theme:', error);
      }
    };

    fetchCurrentTheme();
  }, [setSelectedTheme]);

  const handleThemeChange = async (event) => {
    const themeName = event.target.value.toLowerCase();
    setSelectedTheme(themeName);
    setCurrentTheme(themeName);

    // Find the path for the selected theme
    const selectedThemeObject = themes.find(theme => theme.themeName.toLowerCase() === themeName);
    const themePath = selectedThemeObject ? selectedThemeObject.path : '';

    // Update the theme dynamically
    const linkElement = document.getElementById('themeStylesheet');
    if (linkElement) {
      linkElement.href = themePath; // Update the href attribute to switch the stylesheet
    }

    // Update the theme in the backend
    try {
      const response = await fetch('http://localhost:8000/update-theme', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ themePath: themeName }),
      });

      if (!response.ok) {
        console.error('Failed to update theme:', response.statusText);
      }
    } catch (error) {
      console.error('Failed to update theme:', error);
    }
  };

  return (
    <div className="container mt-3">
      <div className="form-group">
        <label htmlFor="themeSelector">Select Theme:</label>
        <select
          id="themeSelector"
          className="selectpicker"
          onChange={handleThemeChange}
          value={currentTheme}
        >
          {themes.map((theme) => (
            <option key={theme.themeName} value={theme.themeName.toLowerCase()}>
              {theme.themeName}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default ThemeSwitcher;

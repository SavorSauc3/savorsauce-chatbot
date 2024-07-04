import React from 'react';
import themes from './themes.json'; // Assuming you have a JSON file listing your themes

const ThemeSwitcher = ({ selectedTheme, setSelectedTheme }) => {

  const handleThemeChange = (event) => {
    const themePath = event.target.value;
    setSelectedTheme(themePath);

    // Update the theme dynamically
    const linkElement = document.getElementById('themeStylesheet');
    if (linkElement) {
      linkElement.href = themePath; // Update the href attribute to switch the stylesheet
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

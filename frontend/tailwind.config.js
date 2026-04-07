/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  // Added safelist to preserve dynamically generated class names and common utility prefixes
  safelist: [
    {
      // This pattern retains any class that starts with common utility prefixes
      pattern: /^(bg|text|border|shadow|ring|outline|stroke|fill|hover:bg|hover:text|hover:border)-/,
    },
  ],
  plugins: [require('tailwindcss-animate')],
}


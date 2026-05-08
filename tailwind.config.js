/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./*.html",
    "./projects/*.html",
  ],
  safelist: [
    "slideshow-arrow",
    "slideshow-arrow-prev",
    "slideshow-arrow-next",
    "slideshow-slide",
  ],
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        brand: {
          green: "#3fb66e",
          "green-header": "#29ae4d",
        },
      },
      fontFamily: {
        writer: ['"PP Writer"', "Georgia", "serif"],
        grotesk: ['"KMR Melange Grotesk"', '"Helvetica Neue"', "sans-serif"],
      },
    },
  },
  plugins: [],
};

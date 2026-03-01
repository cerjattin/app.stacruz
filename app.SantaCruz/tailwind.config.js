/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        food: {
          wine: "#7F1D1D", // vino
          red: "#B91C1C", // rojo cocina
          mustard: "#D97706", // mostaza
          orange: "#EA580C", // progreso
          olive: "#4D7C0F", // listo
          cream: "#FFFBEB", // fondo claro
          stone: "#F5F5F4", // fondo oscuro
        },
      },
    },
  },
  plugins: [],
};

import React from 'react';
import { Schedule } from './pages/Schedule'; // Punto 1: Importamos el archivo de la agenda

export function App() {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Punto 3: Aquí renderizamos tu componente Schedule */}
      <Schedule />
    </div>
  );
}

export default App;
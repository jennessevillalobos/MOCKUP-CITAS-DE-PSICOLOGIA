import React, { useState } from 'react';
import { Calendar, Clock, Plus, User } from 'lucide-react';

export const Schedule: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState('2026-08-15');
  const [appointments] = useState([
    { id: 1, time: '09:00 AM', patient: 'María Delgado', type: 'Consulta Psicológica', status: 'Confirmada' },
    { id: 2, time: '11:00 AM', patient: 'Carlos Ruiz', type: 'Terapia de Pareja', status: 'Pendiente' },
    { id: 3, time: '03:30 PM', patient: 'Ana Gómez', type: 'Seguimiento', status: 'Confirmada' },
  ]);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Encabezado */}
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Agenda de Citas</h1>
          <p className="text-gray-500 text-sm">Gestiona tus consultas y horarios disponibles</p>
        </div>
        <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl transition font-medium text-sm">
          <Plus size={18} /> Nueva Cita
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Selector de fecha */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
          <h2 className="font-semibold text-gray-700 flex items-center gap-2">
            <Calendar className="text-indigo-600" size={20} /> Seleccionar Fecha
          </h2>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-700"
          />
          <div className="pt-4 border-t border-gray-100 text-xs text-gray-500 space-y-2">
            <div className="flex justify-between">
              <span>Total Citas:</span>
              <span className="font-bold text-gray-700">{appointments.length}</span>
            </div>
          </div>
        </div>

        {/* Lista de citas */}
        <div className="md:col-span-2 bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
          <h2 className="font-semibold text-gray-700 flex items-center gap-2">
            <Clock className="text-indigo-600" size={20} /> Citas para el {selectedDate}
          </h2>

          <div className="space-y-3">
            {appointments.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-4 bg-gray-50 hover:bg-indigo-50/50 rounded-xl border border-gray-100 transition"
              >
                <div className="flex items-center gap-4">
                  <span className="text-sm font-semibold text-indigo-600 bg-indigo-100 px-3 py-1 rounded-lg">
                    {item.time}
                  </span>
                  <div>
                    <h3 className="font-medium text-gray-800 flex items-center gap-1">
                      <User size={15} className="text-gray-400" /> {item.patient}
                    </h3>
                    <p className="text-xs text-gray-500">{item.type}</p>
                  </div>
                </div>
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    item.status === 'Confirmada'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}
                >
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
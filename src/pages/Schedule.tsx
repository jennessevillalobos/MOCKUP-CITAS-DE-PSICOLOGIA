import React, { useState } from 'react';
import { Calendar, Clock, User, Globe, DollarSign, CreditCard, CheckCircle, ChevronRight } from 'lucide-react';

export const Schedule: React.FC = () => {
  // Estados de navegación superior
  const [language, setLanguage] = useState<'ES' | 'EN'>('ES');
  const [currency, setCurrency] = useState<'USD' | 'VES' | 'EUR'>('USD');

  // Estados del formulario
  const [step, setStep] = useState(1);
  const [service, setService] = useState('Terapia Individual');
  const [professional, setProfessional] = useState('Laura Méndez');
  const [modality, setModality] = useState('Online');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('09:00 AM');
  
  // Datos del paciente y pago
  const [patientName, setPatientName] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  const [reason, setReason] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Pago Móvil');

  // Precios
  const rates = { USD: 1, VES: 36.5, EUR: 0.92 };
  const basePrice = service === 'Terapia Individual' ? 45 : service === 'Terapia de pareja' ? 60 : 65;
  const finalPrice = (basePrice * rates[currency]).toFixed(2);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans pb-12">
      {/* Navbar Superior Idéntico al Mockup */}
      <nav className="bg-white border-b border-slate-100 px-8 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-2 font-bold text-xl text-slate-900">
          <span className="text-indigo-900">Psique Amor</span>
        </div>

        <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          <span>Inicio</span>
          <span>Servicios</span>
          <span>Profesionales</span>
          <span>Cursos</span>
          <span>Recursos</span>
          <span>Contacto</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Selector de Idioma */}
          <div className="flex bg-slate-100 p-1 rounded-full text-xs font-semibold">
            <button
              onClick={() => setLanguage('ES')}
              className={`px-3 py-1 rounded-full transition ${
                language === 'ES' ? 'bg-indigo-900 text-white' : 'text-slate-600'
              }`}
            >
              ES
            </button>
            <button
              onClick={() => setLanguage('EN')}
              className={`px-3 py-1 rounded-full transition ${
                language === 'EN' ? 'bg-indigo-900 text-white' : 'text-slate-600'
              }`}
            >
              EN
            </button>
          </div>

          {/* Selector de Moneda */}
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value as any)}
            className="bg-slate-100 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-full border-none focus:outline-none cursor-pointer"
          >
            <option value="USD">USD ($)</option>
            <option value="VES">VES (Bs.)</option>
            <option value="EUR">EUR (€)</option>
          </select>

          <button className="bg-indigo-900 text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-indigo-800 transition flex items-center gap-2">
            {language === 'ES' ? 'Agendar una cita' : 'Book Appointment'} <ChevronRight size={16} />
          </button>
        </div>
      </nav>

      {/* Contenido Principal */}
      <div className="max-w-4xl mx-auto mt-8 px-4">
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
          <h1 className="text-3xl font-serif font-semibold text-indigo-950 mb-2">
            {language === 'ES' ? 'Reserva tu consulta' : 'Book your consultation'}
          </h1>
          <p className="text-slate-500 text-sm mb-8">
            {language === 'ES'
              ? 'Selecciona el servicio, profesional y horario de tu preferencia'
              : 'Select your preferred service, professional, and schedule'}
          </p>

          {step === 1 && (
            <div className="space-y-6">
              {/* Selección de Servicio */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-3">1. Selecciona el Servicio</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {['Terapia Individual', 'Terapia de pareja', 'Terapia familiar'].map((item) => (
                    <div
                      key={item}
                      onClick={() => setService(item)}
                      className={`p-4 rounded-2xl border-2 cursor-pointer transition ${
                        service === item
                          ? 'border-indigo-900 bg-indigo-50/30'
                          : 'border-slate-100 hover:border-slate-200'
                      }`}
                    >
                      <h3 className="font-semibold text-indigo-950">{item}</h3>
                      <p className="text-xs text-slate-500 mt-1">Un espacio para escucharte y volver a ti.</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Selección de Profesional */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-3">2. Selecciona a la Profesional</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { name: 'Laura Méndez', desc: 'Un espacio para comprenderte con calma.', tag: 'Online y presencial' },
                    { name: 'Valentina Ríos', desc: 'Conversaciones que abren nuevas posibilidades.', tag: 'Online' },
                    { name: 'Sofía Herrera', desc: 'Herramientas para volver a ti.', tag: 'Presencial' },
                  ].map((prof) => (
                    <div
                      key={prof.name}
                      onClick={() => setProfessional(prof.name)}
                      className={`p-4 rounded-2xl border-2 cursor-pointer transition ${
                        professional === prof.name
                          ? 'border-indigo-900 bg-indigo-50/30'
                          : 'border-slate-100 hover:border-slate-200'
                      }`}
                    >
                      <h3 className="font-semibold text-indigo-950">{prof.name}</h3>
                      <p className="text-xs text-slate-500 mt-1 mb-2">{prof.desc}</p>
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded-full font-medium">
                        {prof.tag}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Selección de Fecha y Hora */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                    <Calendar size={16} className="text-indigo-900" /> Fecha
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                    <Clock size={16} className="text-indigo-900" /> Hora disponible
                  </label>
                  <select
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-900"
                  >
                    <option>09:00 AM</option>
                    <option>11:00 AM</option>
                    <option>02:00 PM</option>
                    <option>04:00 PM</option>
                  </select>
                </div>
              </div>

              <button
                disabled={!date}
                onClick={() => setStep(2)}
                className="w-full bg-indigo-900 text-white font-medium py-3.5 rounded-2xl hover:bg-indigo-800 transition disabled:opacity-50 mt-4"
              >
                Continuar a Datos del Paciente
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-indigo-950">Datos del Paciente y Pago</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Nombre Completo</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. María Pérez"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    className="w-full p-3 border border-slate-200 rounded-xl text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Correo Electrónico</label>
                  <input
                    type="email"
                    required
                    placeholder="ejemplo@correo.com"
                    value={patientEmail}
                    onChange={(e) => setPatientEmail(e.target.value)}
                    className="w-full p-3 border border-slate-200 rounded-xl text-sm"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Motivo de la Consulta</label>
                  <textarea
                    rows={2}
                    placeholder="Escribe brevemente el motivo..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full p-3 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
              </div>

              {/* Módulo de Pago Multimoneda */}
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                  <span className="font-semibold text-slate-700">Monto a pagar ({currency})</span>
                  <span className="text-2xl font-bold text-indigo-950">
                    {currency === 'USD' ? '$' : currency === 'EUR' ? '€' : 'Bs. '} {finalPrice}
                  </span>
                </div>

                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Método de Pago Ficticio
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['Pago Móvil', 'Zelle', 'Tarjeta'].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPaymentMethod(m)}
                      className={`py-2 px-3 text-xs rounded-xl font-medium border transition ${
                        paymentMethod === m
                          ? 'bg-indigo-900 text-white border-indigo-900'
                          : 'bg-white text-slate-700 border-slate-200'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-1/3 bg-slate-100 text-slate-700 font-medium py-3 rounded-2xl hover:bg-slate-200 transition"
                >
                  Volver
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="w-2/3 bg-indigo-900 text-white font-medium py-3 rounded-2xl hover:bg-indigo-800 transition"
                >
                  Confirmar y Pagar
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="text-center py-8 space-y-4">
              <CheckCircle size={64} className="text-emerald-500 mx-auto" />
              <h2 className="text-2xl font-serif font-bold text-indigo-950">¡Cita Confirmada!</h2>
              <p className="text-slate-600 text-sm max-w-md mx-auto">
                Hemos enviado los detalles de tu cita con <strong>{professional}</strong> para el <strong>{date}</strong> a las <strong>{time}</strong> al correo {patientEmail}.
              </p>
              <button
                onClick={() => setStep(1)}
                className="mt-4 bg-indigo-900 text-white px-8 py-3 rounded-2xl font-medium hover:bg-indigo-800 transition"
              >
                Volver al Inicio
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

const POSLoginPage: React.FC = () => {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();
  const { posLogin } = useAuthStore();

  const handlePinInput = (digit: string) => {
    if (pin.length < 3) {
      const newPin = pin + digit;
      setPin(newPin);
      setError('');
    }
  };

  const clearPin = () => {
    setPin('');
    setError('');
  };

  const deleteLastDigit = () => {
    setPin(pin.slice(0, -1));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (pin.length !== 3) {
      setError('El PIN debe tener exactamente 3 dígitos');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await posLogin(pin);
      navigate('/pos');
    } catch (err: any) {
      setError(err.message || 'PIN incorrecto');
      clearPin();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-600 via-teal-600 to-blue-600">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-teal-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-green-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse delay-700"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-1000"></div>
      </div>

      <div className="relative bg-white p-10 rounded-3xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-block p-3 bg-gradient-to-br from-green-500 to-teal-600 rounded-2xl mb-4">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Terminal Garzones</h1>
          <p className="text-gray-600">Ingresa tu PIN de 3 dígitos</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* PIN Display */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3 text-center">
              PIN de Garzon
            </label>
            <div className="flex justify-center mb-6">
              <div className="flex space-x-3">
                {[0, 1, 2].map((index) => (
                  <div
                    key={index}
                    className={`w-14 h-14 border-3 rounded-xl flex items-center justify-center text-2xl font-bold transition-all ${
                      pin[index]
                        ? 'border-green-500 bg-green-50 scale-110'
                        : 'border-gray-300 bg-white'
                    }`}
                  >
                    {pin[index] ? '●' : ''}
                  </div>
                ))}
              </div>
            </div>

            {/* Numeric Keypad */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handlePinInput(digit.toString())}
                  disabled={loading}
                  className="h-14 bg-gradient-to-br from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 disabled:from-gray-200 disabled:to-gray-300 rounded-xl text-2xl font-bold transition-all shadow-sm hover:shadow-md active:scale-95 disabled:cursor-not-allowed"
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                onClick={clearPin}
                disabled={loading}
                className="h-14 bg-gradient-to-br from-red-100 to-red-200 hover:from-red-200 hover:to-red-300 disabled:from-gray-200 disabled:to-gray-300 rounded-xl text-base font-semibold text-red-700 transition-all shadow-sm hover:shadow-md active:scale-95 disabled:cursor-not-allowed"
              >
                Limpiar
              </button>
              <button
                type="button"
                onClick={() => handlePinInput('0')}
                disabled={loading}
                className="h-14 bg-gradient-to-br from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 disabled:from-gray-200 disabled:to-gray-300 rounded-xl text-2xl font-bold transition-all shadow-sm hover:shadow-md active:scale-95 disabled:cursor-not-allowed"
              >
                0
              </button>
              <button
                type="button"
                onClick={deleteLastDigit}
                disabled={loading}
                className="h-14 bg-gradient-to-br from-yellow-100 to-yellow-200 hover:from-yellow-200 hover:to-yellow-300 disabled:from-gray-200 disabled:to-gray-300 rounded-xl text-xl font-semibold text-yellow-700 transition-all shadow-sm hover:shadow-md active:scale-95 disabled:cursor-not-allowed"
              >
                ←
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg animate-shake">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700 font-medium">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || pin.length !== 3}
            className="w-full bg-gradient-to-r from-green-600 to-teal-600 text-white py-4 px-4 rounded-xl hover:from-green-700 hover:to-teal-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all font-bold text-lg shadow-lg transform hover:scale-[1.02] active:scale-[0.98]"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-2"></div>
                Verificando PIN...
              </div>
            ) : (
              <>
                <svg className="inline-block w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Ingresar al Sistema
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600">
            ¿Eres administrador?{' '}
            <Link to="/admin/login" className="font-medium text-green-600 hover:text-green-500">
              Ingresa con usuario y contraseña
            </Link>
          </p>
          <p className="text-xs text-gray-500 mt-4">
            SYSME 2.0 - Sistema POS Restaurante
          </p>
        </div>

        {/* Test PINs */}
        <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-teal-50 rounded-xl border border-green-200">
          <p className="text-xs text-gray-700 font-semibold mb-2 flex items-center">
            <svg className="w-4 h-4 mr-1 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            PINs de prueba:
          </p>
          <div className="space-y-1 text-xs text-gray-600">
            <p className="font-mono bg-white px-2 py-1 rounded">
              <span className="font-semibold">123</span> - María García (Garzona)
            </p>
            <p className="font-mono bg-white px-2 py-1 rounded">
              <span className="font-semibold">456</span> - Carlos López (Garzon)
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default POSLoginPage;

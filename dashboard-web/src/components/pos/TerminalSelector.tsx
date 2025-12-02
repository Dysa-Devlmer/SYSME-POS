import React, { useState, useEffect } from 'react';
import { Monitor, Check } from 'lucide-react';
import axios from 'axios';

interface Terminal {
  id: number;
  code: string;
  name: string;
  location: string;
  terminal_type: string;
  active: boolean;
}

interface TerminalSelectorProps {
  onTerminalSelected: (terminal: Terminal) => void;
  currentTerminalId?: number;
}

export const TerminalSelector: React.FC<TerminalSelectorProps> = ({ onTerminalSelected, currentTerminalId }) => {
  const [terminals, setTerminals] = useState<Terminal[]>([]);
  const [selected, setSelected] = useState<number | null>(currentTerminalId || null);

  useEffect(() => {
    fetchTerminals();
  }, []);

  const fetchTerminals = async () => {
    const res = await axios.get('/api/v1/terminals');
    const active = res.data.filter((t: Terminal) => t.active);
    setTerminals(active);
    if (!selected && active.length > 0) {
      const saved = localStorage.getItem('selectedTerminalId');
      setSelected(saved ? parseInt(saved) : active[0].id);
    }
  };

  const selectTerminal = (terminal: Terminal) => {
    setSelected(terminal.id);
    localStorage.setItem('selectedTerminalId', String(terminal.id));
    onTerminalSelected(terminal);
  };

  const getTypeIcon = (type: string) => {
    const icons = { pos: '💳', kitchen: '🍳', bar: '🍺', delivery: '🚚' };
    return icons[type as keyof typeof icons] || '🖥️';
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h3 className="font-semibold mb-3 flex items-center gap-2">
        <Monitor className="w-5 h-5" />
        Seleccionar Terminal TPV
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {terminals.map(terminal => (
          <button key={terminal.id} onClick={() => selectTerminal(terminal)} className={`p-4 rounded-lg border-2 transition-all text-left ${selected === terminal.id ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}>
            <div className="flex items-start justify-between mb-2">
              <span className="text-2xl">{getTypeIcon(terminal.terminal_type)}</span>
              {selected === terminal.id && <Check className="w-5 h-5 text-blue-600" />}
            </div>
            <div className="font-bold text-lg">{terminal.name}</div>
            <div className="text-sm text-gray-600">{terminal.code}</div>
            <div className="text-xs text-gray-500 mt-1">{terminal.location}</div>
          </button>
        ))}
      </div>
      {terminals.length === 0 && <div className="text-center py-8 text-gray-500">No hay terminales configurados</div>}
    </div>
  );
};

export default TerminalSelector;

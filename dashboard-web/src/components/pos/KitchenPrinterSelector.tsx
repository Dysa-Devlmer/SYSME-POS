import React, { useState, useEffect } from 'react';
import { Printer, Check } from 'lucide-react';
import axios from 'axios';

interface Kitchen Station {
  id: number;
  code: string;
  name: string;
  printer: string;
  color: string;
  active: boolean;
}

interface KitchenPrinterSelectorProps {
  productId: number;
  onStationsSelected: (stations: number[]) => void;
}

export const KitchenPrinterSelector: React.FC<KitchenPrinterSelectorProps> = ({ productId, onStationsSelected }) => {
  const [stations, setStations] = useState<KitchenStation[]>([]);
  const [selected, setSelected] = useState<number[]>([]);

  useEffect(() => {
    fetchStations();
  }, []);

  const fetchStations = async () => {
    const res = await axios.get('/api/v1/kitchen-stations');
    setStations(res.data.filter((s: KitchenStation) => s.active));
  };

  const toggleStation = (id: number) => {
    const newSelected = selected.includes(id) ? selected.filter(s => s !== id) : [...selected, id];
    setSelected(newSelected);
    onStationsSelected(newSelected);
  };

  return (
    <div className="bg-white rounded-lg p-4">
      <h3 className="font-semibold mb-3 flex items-center gap-2">
        <Printer className="w-5 h-5" />
        Seleccionar Estaciones de Cocina
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {stations.map(station => (
          <button key={station.id} onClick={() => toggleStation(station.id)} className={`p-3 rounded-lg border-2 transition-all ${selected.includes(station.id) ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-gray-400'}`} style={{ borderLeftWidth: '4px', borderLeftColor: station.color }}>
            <div className="flex items-center justify-between">
              <div className="text-left">
                <div className="font-medium">{station.name}</div>
                <div className="text-xs text-gray-500">{station.printer || 'Sin impresora'}</div>
              </div>
              {selected.includes(station.id) && <Check className="w-5 h-5 text-green-600" />}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default KitchenPrinterSelector;

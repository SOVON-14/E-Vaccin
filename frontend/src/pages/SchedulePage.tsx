import { useEffect, useState } from 'react';
import api from '../services/api';
import { VaccineSchedule } from '../types';
import { Calendar, Info } from 'lucide-react';

export const SchedulePage: React.FC = () => {
  const [schedules, setSchedules] = useState<VaccineSchedule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/vaccines/schedule')
      .then((res: any) => setSchedules(res.data))
      .catch((err: any) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex p-3 bg-indigo-50 text-indigo-600 rounded-xl mb-3">
          <Calendar className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
          Calendrier National de Vaccination (PEV)
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Programme Élargi de Vaccination officiel pour la protection et l'immunisation des nourrissons et enfants.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-500">Chargement du calendrier vaccinal...</div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left font-semibold text-gray-700">Période / Âge</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-700">Vaccin</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-700">Dose</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-700">Description & Protection</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {schedules.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 font-semibold text-indigo-600">
                      {item.description}
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-900">
                      {item.vaccine?.name} ({item.vaccine?.code})
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-gray-100 rounded-lg text-xs font-semibold text-gray-800">
                        Dose {item.doseNumber}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-xs">
                      {item.vaccine?.description || 'Immunisation pédiatrique essentielle'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-8 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start space-x-3 text-xs text-amber-800">
        <Info className="h-5 w-5 flex-shrink-0 text-amber-600 mt-0.5" />
        <div>
          <p className="font-semibold">Important :</p>
          <p className="mt-0.5">
            Ce calendrier s'aligne sur les recommandations officielles de l'OMS et des ministères de la santé. En cas de retard dans le calendrier, consultez votre centre de santé pour une mise à niveau sans recommencer la série depuis le début.
          </p>
        </div>
      </div>
    </div>
  );
};

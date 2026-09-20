import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Child, Vaccine } from '../../types';
import { Search, Syringe, CheckCircle, Clock, AlertCircle, X, User } from 'lucide-react';

export const AgentDashboard: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [upcomingDoses, setUpcomingDoses] = useState<any[]>([]);
  const [vaccines, setVaccines] = useState<Vaccine[]>([]);
  const [loading, setLoading] = useState(false);

  // Vaccine administration modal state
  const [showAdministerModal, setShowAdministerModal] = useState(false);
  const [selectedVaccineId, setSelectedVaccineId] = useState('');
  const [doseNumber, setDoseNumber] = useState(1);
  const [batchNumber, setBatchNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [administering, setAdministering] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadVaccines();
    searchChildren();
  }, []);

  const loadVaccines = async () => {
    try {
      const res = await api.get('/vaccines');
      setVaccines(res.data);
      if (res.data.length > 0) {
        setSelectedVaccineId(res.data[0].id);
        setBatchNumber(`${res.data[0].code}-2026-LOT1`);
      }
    } catch (err) {
      console.error('Error fetching vaccines:', err);
    }
  };

  const searchChildren = async (term = '') => {
    setLoading(true);
    try {
      const res = await api.get('/children', {
        params: { search: term || undefined, limit: 15 },
      });
      setChildren(res.data.data);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectChild = async (childId: string) => {
    try {
      const [childRes, upcomingRes] = await Promise.all([
        api.get(`/children/${childId}`),
        api.get(`/children/${childId}/upcoming-vaccinations`),
      ]);
      setSelectedChild(childRes.data);
      setUpcomingDoses(upcomingRes.data);
    } catch (err) {
      console.error('Error loading child profile:', err);
    }
  };

  const handleAdministerVaccine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChild) return;

    setActionError(null);
    setAdministering(true);

    try {
      await api.post('/vaccinations', {
        childId: selectedChild.id,
        vaccineId: selectedVaccineId,
        doseNumber: Number(doseNumber),
        batchNumber,
        notes: notes || undefined,
      });

      setSuccessMessage('Vaccination enregistrée avec succès ! Le stock a été mis à jour.');
      setShowAdministerModal(false);
      setNotes('');
      // Refresh child details
      handleSelectChild(selectedChild.id);
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Erreur lors de l’enregistrement de la vaccination');
    } finally {
      setAdministering(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Espace Agent de Santé</h1>
          <p className="text-sm text-gray-500 mt-1">
            Recherche de dossier médical pédiatrique et enregistrement sécurisé des doses vaccinales
          </p>
        </div>

        {/* Search Bar */}
        <div className="w-full md:w-96">
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchChildren(searchTerm)}
              placeholder="Rechercher par ID (ex: EV-2026...) ou Nom..."
              className="w-full pl-10 pr-24 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
            />
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
            <button
              onClick={() => searchChildren(searchTerm)}
              className="absolute right-1.5 top-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition"
            >
              Chercher
            </button>
          </div>
        </div>
      </div>

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm font-medium flex items-center space-x-2">
          <CheckCircle className="h-5 w-5 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Children List */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-3">
          <h2 className="font-bold text-gray-900 text-sm uppercase tracking-wider px-2">
            Résultats / Enfants récents ({children.length})
          </h2>

          {loading ? (
            <div className="py-12 text-center text-sm text-gray-400">Recherche en cours...</div>
          ) : children.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-500">Aucun enfant trouvé.</div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {children.map((child) => (
                <div
                  key={child.id}
                  onClick={() => handleSelectChild(child.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition ${
                    selectedChild?.id === child.id
                      ? 'bg-indigo-50 border-indigo-300 shadow-sm'
                      : 'hover:bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">
                        {child.firstName} {child.lastName}
                      </p>
                      <p className="font-mono text-xs text-indigo-600 font-semibold mt-0.5">
                        {child.uniqueId}
                      </p>
                    </div>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                      {child.gender === 'MALE' ? 'Garçon' : 'Fille'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    Né(e) le : {new Date(child.dateOfBirth).toLocaleDateString('fr')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selected Child Health Record */}
        <div className="lg:col-span-2 space-y-6">
          {selectedChild ? (
            <>
              {/* Profile Card */}
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      {selectedChild.firstName} {selectedChild.lastName}
                    </h2>
                    <p className="font-mono text-indigo-600 text-sm font-semibold mt-0.5">
                      Identifiant Unique : {selectedChild.uniqueId}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2 text-xs text-gray-600">
                      <span>Né(e) le : <strong>{new Date(selectedChild.dateOfBirth).toLocaleDateString('fr')}</strong></span>
                      <span>•</span>
                      <span>Genre : <strong>{selectedChild.gender === 'MALE' ? 'Masculin' : 'Féminin'}</strong></span>
                      {selectedChild.bloodType && (
                        <>
                          <span>•</span>
                          <span>Groupe : <strong>{selectedChild.bloodType}</strong></span>
                        </>
                      )}
                      <span>•</span>
                      <span>Parent : <strong>{selectedChild.parent ? `${selectedChild.parent.firstName} ${selectedChild.parent.lastName}` : 'N/A'}</strong></span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setActionError(null);
                      setShowAdministerModal(true);
                    }}
                    className="inline-flex items-center px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl shadow-sm transition"
                  >
                    <Syringe className="h-4 w-4 mr-2" />
                    Administrer un vaccin
                  </button>
                </div>
              </div>

              {/* Upcoming / Overdue Doses */}
              {upcomingDoses.length > 0 && (
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                  <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wider mb-4 flex items-center">
                    <Clock className="h-4 w-4 text-indigo-600 mr-2" />
                    Calendrier : Prochaines Doses Attendues ({upcomingDoses.length})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {upcomingDoses.map((item, idx) => (
                      <div
                        key={idx}
                        className={`p-3.5 rounded-xl border flex justify-between items-center text-xs ${
                          item.status === 'OVERDUE'
                            ? 'bg-red-50 border-red-200 text-red-900'
                            : 'bg-indigo-50/50 border-indigo-100 text-indigo-900'
                        }`}
                      >
                        <div>
                          <p className="font-bold text-sm">{item.vaccine.name}</p>
                          <p className="mt-0.5 text-gray-600">Dose {item.doseNumber} - {item.description}</p>
                        </div>
                        <div className="text-right">
                          <span
                            className={`font-semibold px-2 py-0.5 rounded-full ${
                              item.status === 'OVERDUE'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-indigo-100 text-indigo-800'
                            }`}
                          >
                            {item.status === 'OVERDUE' ? 'En Retard' : 'Prévu'}
                          </span>
                          <p className="mt-1 text-gray-500 font-medium">
                            {new Date(item.dueDate).toLocaleDateString('fr')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Vaccination History */}
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wider mb-4 flex items-center">
                  <CheckCircle className="h-4 w-4 text-emerald-600 mr-2" />
                  Historique des Doses Reçues ({selectedChild.vaccinations?.length || 0})
                </h3>

                {(!selectedChild.vaccinations || selectedChild.vaccinations.length === 0) ? (
                  <p className="text-sm text-gray-400 py-4 text-center">
                    Aucun vaccin encore administré pour cet enfant.
                  </p>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {selectedChild.vaccinations.map((vac) => (
                      <div key={vac.id} className="py-3 flex justify-between items-center text-sm">
                        <div>
                          <p className="font-semibold text-gray-900">
                            {vac.vaccine?.name} (Dose {vac.doseNumber})
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5 font-mono">
                            Lot: {vac.batchNumber} • Soignant: {vac.healthWorker?.firstName} {vac.healthWorker?.lastName}
                          </p>
                          {vac.notes && <p className="text-xs text-gray-400 italic mt-0.5">"{vac.notes}"</p>}
                        </div>
                        <div className="text-right">
                          <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-semibold">
                            Validé
                          </span>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(vac.vaccinationDate).toLocaleDateString('fr')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-24 bg-white rounded-2xl border border-gray-200">
              <User className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-2 text-sm text-gray-500">
                Sélectionnez un enfant dans la colonne de gauche pour afficher son dossier et administrer un vaccin.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Administration Modal */}
      {showAdministerModal && selectedChild && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b">
              <h3 className="font-bold text-gray-900 text-lg">
                Enregistrer une vaccination
              </h3>
              <button
                onClick={() => setShowAdministerModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="bg-indigo-50 p-3 rounded-xl text-xs text-indigo-900">
              Patient : <strong>{selectedChild.firstName} {selectedChild.lastName}</strong> ({selectedChild.uniqueId})
            </div>

            {actionError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            <form onSubmit={handleAdministerVaccine} className="space-y-4 text-sm">
              <div>
                <label className="block font-medium text-gray-700 mb-1">Vaccin à administrer</label>
                <select
                  required
                  value={selectedVaccineId}
                  onChange={(e) => {
                    setSelectedVaccineId(e.target.value);
                    const vac = vaccines.find((v) => v.id === e.target.value);
                    if (vac) setBatchNumber(`${vac.code}-2026-LOT1`);
                  }}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  {vaccines.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-gray-700 mb-1">N° de Dose</label>
                  <input
                    type="number"
                    min={1}
                    max={6}
                    required
                    value={doseNumber}
                    onChange={(e) => setDoseNumber(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Numéro de Lot</label>
                  <input
                    type="text"
                    required
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value)}
                    placeholder="ex: BCG-2026-LOT1"
                    className="w-full px-3 py-2 border rounded-lg font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">Observations / Notes (facultatif)</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Vaccination effectuée sans réaction immédiate"
                  className="w-full px-3 py-2 border rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowAdministerModal(false)}
                  className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={administering}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 disabled:opacity-50"
                >
                  {administering ? 'Enregistrement...' : 'Valider la dose'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

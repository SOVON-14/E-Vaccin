import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Child, HealthCenter } from '../../types';
import { Baby, QrCode, ShieldCheck, Plus, AlertCircle, X, Clock } from 'lucide-react';

export const ParentDashboard: React.FC = () => {
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [centers, setCenters] = useState<HealthCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState<Child | null>(null);

  // New child form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState<'MALE' | 'FEMALE'>('MALE');
  const [placeOfBirth, setPlaceOfBirth] = useState('');
  const [bloodType, setBloodType] = useState('O+');
  const [healthCenterId, setHealthCenterId] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchChildren = async () => {
    try {
      setLoading(true);
      const res = await api.get('/children');
      setChildren(res.data.data);
      if (res.data.data.length > 0 && !selectedChild) {
        fetchChildDetails(res.data.data[0].id);
      }
    } catch (err) {
      console.error('Error fetching children:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchChildDetails = async (id: string) => {
    try {
      const res = await api.get(`/children/${id}`);
      setSelectedChild(res.data);
    } catch (err) {
      console.error('Error fetching child details:', err);
    }
  };

  useEffect(() => {
    fetchChildren();
    api.get('/health-centers').then((res) => {
      setCenters(res.data);
      if (res.data.length > 0) setHealthCenterId(res.data[0].id);
    });
  }, []);

  const handleAddChild = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSaving(true);

    try {
      await api.post('/children', {
        firstName,
        lastName,
        dateOfBirth,
        gender,
        placeOfBirth: placeOfBirth || undefined,
        bloodType: bloodType || undefined,
        healthCenterId,
      });

      setShowAddModal(false);
      setFirstName('');
      setLastName('');
      setDateOfBirth('');
      fetchChildren();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Erreur lors de l’enregistrement de l’enfant');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-6 border-b border-gray-200 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Carnet Numérique de mes Enfants</h1>
          <p className="text-sm text-gray-500 mt-1">
            Suivez en direct les vaccinations, prochaines échéances et conservez les QR codes officiels
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-sm transition"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Enregistrer un enfant
        </button>
      </div>

      {loading ? (
        <div className="py-20 text-center text-gray-500">Chargement de votre carnet...</div>
      ) : children.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300 mt-6 p-8">
          <Baby className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-base font-semibold text-gray-900">Aucun enfant enregistré</h3>
          <p className="mt-1 text-sm text-gray-500">
            Commencez par ajouter votre enfant pour suivre son calendrier vaccinal numérique.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-4 inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Ajouter mon enfant
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-6">
          {/* Children selector list */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
              Mes Enfants ({children.length})
            </h2>
            <div className="space-y-3">
              {children.map((child) => (
                <div
                  key={child.id}
                  onClick={() => fetchChildDetails(child.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition ${
                    selectedChild?.id === child.id
                      ? 'bg-indigo-50 border-indigo-300 shadow-sm'
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-3">
                      <div className="p-2.5 bg-white text-indigo-600 rounded-lg border border-indigo-100">
                        <Baby className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {child.firstName} {child.lastName}
                        </h3>
                        <p className="text-xs text-indigo-600 font-mono font-medium mt-0.5">
                          {child.uniqueId}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowQrModal(child);
                      }}
                      className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-white rounded-lg transition"
                      title="Afficher le QR Code"
                    >
                      <QrCode className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                    <span>Né(e) le : {new Date(child.dateOfBirth).toLocaleDateString('fr')}</span>
                    <span className="bg-emerald-50 text-emerald-700 font-medium px-2 py-0.5 rounded-full border border-emerald-100">
                      {child._count?.vaccinations || 0} vaccin(s)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Child health record details */}
          <div className="lg:col-span-2 space-y-6">
            {selectedChild ? (
              <>
                {/* Child identity banner */}
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <div className="flex items-center space-x-3">
                        <h2 className="text-xl font-bold text-gray-900">
                          {selectedChild.firstName} {selectedChild.lastName}
                        </h2>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800">
                          {selectedChild.gender === 'MALE' ? 'Garçon' : 'Fille'}
                        </span>
                        {selectedChild.bloodType && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                            Groupe {selectedChild.bloodType}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-1 font-mono">
                        N° d'identification : <strong className="text-gray-900">{selectedChild.uniqueId}</strong>
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Centre de rattachement : <strong>{selectedChild.healthCenter?.name}</strong>
                      </p>
                    </div>

                    <button
                      onClick={() => setShowQrModal(selectedChild)}
                      className="inline-flex items-center px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-medium rounded-xl transition"
                    >
                      <QrCode className="h-4 w-4 mr-2 text-indigo-600" />
                      QR Code Médical
                    </button>
                  </div>
                </div>

                {/* Vaccinations history */}
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                  <h3 className="text-base font-bold text-gray-900 flex items-center mb-4">
                    <ShieldCheck className="h-5 w-5 text-emerald-600 mr-2" />
                    Vaccins reçus ({selectedChild.vaccinations?.length || 0})
                  </h3>

                  {(!selectedChild.vaccinations || selectedChild.vaccinations.length === 0) ? (
                    <p className="text-sm text-gray-500 py-4 text-center">
                      Aucune dose de vaccin enregistrée pour le moment.
                    </p>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {selectedChild.vaccinations.map((v) => (
                        <div key={v.id} className="py-3.5 flex items-center justify-between">
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-semibold text-gray-900 text-sm">
                                {v.vaccine?.name}
                              </span>
                              <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md font-medium">
                                Dose {v.doseNumber}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              Lot: <span className="font-mono">{v.batchNumber}</span> • Par:{' '}
                              {v.healthWorker ? `${v.healthWorker.firstName} ${v.healthWorker.lastName}` : 'Agent'}
                            </p>
                            {v.notes && (
                              <p className="text-xs text-gray-400 italic mt-0.5">"{v.notes}"</p>
                            )}
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-semibold px-2 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
                              Effectué
                            </span>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(v.vaccinationDate).toLocaleDateString('fr')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Upcoming appointments */}
                {selectedChild.appointments && selectedChild.appointments.length > 0 && (
                  <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <h3 className="text-base font-bold text-gray-900 flex items-center mb-4">
                      <Clock className="h-5 w-5 text-indigo-600 mr-2" />
                      Prochains Rendez-vous programmés
                    </h3>
                    <div className="space-y-2">
                      {selectedChild.appointments.map((apt: any) => (
                        <div key={apt.id} className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex justify-between items-center text-sm">
                          <div>
                            <p className="font-semibold text-amber-900">
                              {apt.vaccine?.name} (Dose {apt.doseNumber})
                            </p>
                            <p className="text-xs text-amber-700 mt-0.5">
                              {apt.notes || 'Rendez-vous de routine au centre de santé'}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-amber-900">
                              {new Date(apt.scheduledDate).toLocaleDateString('fr')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-20 text-gray-400">Sélectionnez un enfant pour voir son dossier</div>
            )}
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQrModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center space-y-4 shadow-xl">
            <div className="flex justify-between items-center pb-2 border-b">
              <h3 className="font-bold text-gray-900 text-lg">
                QR Code - {showQrModal.firstName}
              </h3>
              <button
                onClick={() => setShowQrModal(null)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {showQrModal.qrCode ? (
              <div className="p-4 bg-gray-50 rounded-xl inline-block border">
                <img
                  src={showQrModal.qrCode}
                  alt={`QR Code ${showQrModal.uniqueId}`}
                  className="w-48 h-48 mx-auto"
                />
              </div>
            ) : (
              <p className="text-sm text-gray-500">QR Code en cours de génération...</p>
            )}

            <div>
              <p className="font-mono text-sm font-bold text-indigo-600">
                {showQrModal.uniqueId}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Présentez ce QR Code à l'agent de santé lors de votre visite au centre.
              </p>
            </div>

            <button
              onClick={() => setShowQrModal(null)}
              className="w-full py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* Add Child Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b">
              <h3 className="font-bold text-gray-900 text-lg">
                Enregistrer un enfant
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleAddChild} className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Prénom</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Kévin"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Nom</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Dosseh"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Date de naissance</label>
                  <input
                    type="date"
                    required
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Genre</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as any)}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="MALE">Garçon</option>
                    <option value="FEMALE">Fille</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Lieu de naissance</label>
                  <input
                    type="text"
                    value={placeOfBirth}
                    onChange={(e) => setPlaceOfBirth(e.target.value)}
                    placeholder="Lomé"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Groupe Sanguin</label>
                  <select
                    value={bloodType}
                    onChange={(e) => setBloodType(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">Centre de Santé de référence</label>
                <select
                  required
                  value={healthCenterId}
                  onChange={(e) => setHealthCenterId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  {centers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.region})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saving ? 'Enregistrement...' : 'Confirmer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

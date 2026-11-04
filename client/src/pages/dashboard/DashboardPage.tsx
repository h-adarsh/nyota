import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  LogOut,
  Plus,
  Calendar,
  MapPin,
  Clock,
  Trash2,
  ChevronDown,
  ChevronRight,
  Loader2,
  Users,
  Calculator,
  UserCheck,
} from 'lucide-react';
import { Wedding, WeddingFunction } from '../../types/wedding';
import { Household } from '../../types/household';
import {
  getWeddingsApi,
  getFunctionsApi,
  deleteWeddingApi,
  deleteFunctionApi,
} from '../../api/weddings';
import { getHouseholdsApi } from '../../api/households';
import { CreateWeddingModal } from '../../components/CreateWeddingModal';
import { CreateFunctionModal } from '../../components/CreateFunctionModal';
import { CreateHouseholdModal } from '../../components/CreateHouseholdModal';
import { CsvImportModal } from '../../components/CsvImportModal';
import { FunctionInvitationsModal } from '../../components/FunctionInvitationsModal';
import { HouseholdList } from '../../components/HouseholdList';
import { HeadcountDashboard } from '../../components/HeadcountDashboard';
import { VenueCheckIn } from '../../components/VenueCheckIn';

type DashboardTab = 'headcount' | 'checkin' | 'functions' | 'guests';

export const DashboardPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [weddings, setWeddings] = useState<Wedding[]>([]);
  const [activeWedding, setActiveWedding] = useState<Wedding | null>(null);
  const [activeTab, setActiveTab] = useState<DashboardTab>('headcount');

  const [functions, setFunctions] = useState<WeddingFunction[]>([]);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [selectedFunctionForInvites, setSelectedFunctionForInvites] = useState<WeddingFunction | null>(null);

  const [isLoadingWeddings, setIsLoadingWeddings] = useState(true);
  const [isLoadingContent, setIsLoadingContent] = useState(false);

  const [isWeddingModalOpen, setIsWeddingModalOpen] = useState(false);
  const [isFunctionModalOpen, setIsFunctionModalOpen] = useState(false);
  const [isHouseholdModalOpen, setIsHouseholdModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Load all weddings for the current planner
  const loadWeddings = useCallback(async () => {
    try {
      setIsLoadingWeddings(true);
      const data = await getWeddingsApi();
      setWeddings(data);
      if (data.length > 0) {
        setActiveWedding((prev) => (prev && data.find((w) => w.id === prev.id) ? prev : data[0]));
      } else {
        setActiveWedding(null);
        setFunctions([]);
        setHouseholds([]);
      }
    } catch (err) {
      console.error('Failed to load events:', err);
    } finally {
      setIsLoadingWeddings(false);
    }
  }, []);

  // Load functions and households for active wedding
  const loadWeddingData = useCallback(async (weddingId: string) => {
    try {
      setIsLoadingContent(true);
      const [fns, hhs] = await Promise.all([
        getFunctionsApi(weddingId).catch(() => []),
        getHouseholdsApi(weddingId).catch(() => []),
      ]);
      setFunctions(fns);
      setHouseholds(hhs);
    } catch (err) {
      console.error('Failed to load event data:', err);
    } finally {
      setIsLoadingContent(false);
    }
  }, []);

  useEffect(() => {
    loadWeddings();
  }, [loadWeddings]);

  useEffect(() => {
    if (activeWedding) {
      loadWeddingData(activeWedding.id);
    }
  }, [activeWedding, loadWeddingData]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Failed to logout:', err);
    }
  };

  const handleWeddingCreated = (newWedding: Wedding) => {
    setWeddings((prev) => [newWedding, ...prev]);
    setActiveWedding(newWedding);
  };

  const handleDeleteWedding = async () => {
    if (!activeWedding) return;
    const confirmed = window.confirm(
      `Are you sure you want to delete "${activeWedding.title}"? This will permanently delete all functions, guest lists, and RSVPs.`
    );
    if (!confirmed) return;

    try {
      await deleteWeddingApi(activeWedding.id);
      await loadWeddings();
    } catch (err) {
      console.error('Failed to delete event:', err);
      alert('Failed to delete event');
    }
  };

  const handleFunctionCreated = (newFn: WeddingFunction) => {
    setFunctions((prev) => [...prev, newFn]);
  };

  const handleDeleteFunction = async (fn: WeddingFunction) => {
    const confirmed = window.confirm(
      `Delete function "${fn.name}"? This will remove all invitation assignments and RSVPs for this function.`
    );
    if (!confirmed) return;

    try {
      await deleteFunctionApi(fn.id);
      setFunctions((prev) => prev.filter((f) => f.id !== fn.id));
    } catch (err) {
      console.error('Failed to delete function:', err);
      alert('Failed to delete function');
    }
  };

  const handleHouseholdDeleted = (id: string) => {
    setHouseholds((prev) => prev.filter((h) => h.id !== id));
  };

  const handleHouseholdUpdated = (updated: Household) => {
    setHouseholds((prev) => prev.map((h) => (h.id === updated.id ? updated : h)));
  };

  const formatEventDateTime = (dateStr: string) => {
    const timeZone = activeWedding?.timezone || 'Asia/Kolkata';
    const d = new Date(dateStr);
    return d.toLocaleString('en-IN', {
      timeZone,
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDateRange = (start: string, end: string) => {
    const timeZone = activeWedding?.timezone || 'Asia/Kolkata';
    const s = new Date(start).toLocaleDateString('en-IN', { timeZone, month: 'short', day: 'numeric' });
    const e = new Date(end).toLocaleDateString('en-IN', { timeZone, month: 'short', day: 'numeric', year: 'numeric' });
    return `${s} - ${e}`;
  };

  return (
    <div className="min-h-screen bg-[#ffffff] text-[#0a1217] flex flex-col font-sans">
      {/* Sana Minimal Top Navigation */}
      <header className="bg-[#ffffff] border-b border-[#0a1217]/10 sticky top-0 z-30">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-serif text-2xl font-normal tracking-tight text-[#0a1217]">
              Nyota.
            </span>
            <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#e4eff7] text-[#0a1217]">
              Planner Portal
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-[13px] font-medium text-[#0a1217]">{user?.name}</p>
              <p className="text-[11px] text-[#85898b]">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 sm:px-4 sm:py-2 rounded-full border border-[#0a1217]/20 text-[#0a1217] hover:bg-[#e4eff7] text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Area (1200px max width) */}
      <main className="flex-1 max-w-[1200px] w-full mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {isLoadingWeddings ? (
          <div className="py-24 flex flex-col items-center justify-center text-[#85898b]">
            <Loader2 className="w-8 h-8 animate-spin text-[#0a1217] mb-3" />
            <p className="text-sm font-normal">Loading your events...</p>
          </div>
        ) : weddings.length === 0 ? (
          /* Empty State */
          <div className="bg-[#e4eff7] rounded-[24px] p-8 sm:p-16 text-center my-6 border border-[#0a1217]/10">
            <h2 className="font-serif text-3xl sm:text-4xl font-normal text-[#0a1217] tracking-tight">
              No family functions registered yet
            </h2>
            <p className="text-[#85898b] text-sm sm:text-base max-w-md mx-auto mt-3 mb-8">
              Create your first event project to configure individual functions, manage guest households, and calculate exact catering headcounts.
            </p>
            <button
              onClick={() => setIsWeddingModalOpen(true)}
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-[#0a1217] text-white text-sm font-medium hover:opacity-90 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create First Function</span>
            </button>
          </div>
        ) : (
          /* Active Event Dashboard View */
          <div>
            {/* Top Controls: Event Switcher & Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <select
                    value={activeWedding?.id || ''}
                    onChange={(e) => {
                      const found = weddings.find((w) => w.id === e.target.value);
                      if (found) setActiveWedding(found);
                    }}
                    className="appearance-none bg-white border border-[#000000] text-[#0a1217] font-medium text-sm sm:text-base rounded-full pl-4 pr-10 py-2.5 focus:outline-none cursor-pointer"
                  >
                    {weddings.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.title}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-[#0a1217] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                <button
                  onClick={() => setIsWeddingModalOpen(true)}
                  className="px-4 py-2.5 rounded-full border border-[#0a1217]/20 text-[#0a1217] hover:bg-[#e4eff7] text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Create another event"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Add Event</span>
                </button>
              </div>

              {activeWedding && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#e4eff7] text-[#0a1217] text-xs font-medium">
                    <Calendar className="w-3.5 h-3.5 text-[#85898b]" />
                    <span>{formatDateRange(activeWedding.startDate, activeWedding.endDate)}</span>
                  </div>

                  <button
                    onClick={handleDeleteWedding}
                    className="p-2 rounded-full text-[#85898b] hover:text-[#0a1217] hover:bg-[#e4eff7] transition-colors cursor-pointer"
                    title="Delete this event"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Sana Dark Product Showcase Card (#0a1217, 24px radius, Electric Lime Accent) */}
            {activeWedding && (
              <div className="bg-[#0a1217] text-white rounded-[24px] p-6 sm:p-10 mb-8 border border-[#0a1217] flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                  <span className="text-[13px] font-normal uppercase tracking-wider text-[#85898b]">
                    Active Celebration
                  </span>
                  <h2 className="text-2xl sm:text-3xl lg:text-4xl font-medium tracking-tight mt-1 mb-2 text-white">
                    {activeWedding.coupleNames}
                  </h2>
                  <p className="text-[#85898b] text-sm sm:text-base max-w-xl">
                    {activeWedding.title} • {formatDateRange(activeWedding.startDate, activeWedding.endDate)}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => setIsFunctionModalOpen(true)}
                    className="px-5 py-2.5 rounded-full bg-[#cdfe00] hover:bg-[#bfee00] text-[#0a1217] text-xs sm:text-sm font-medium transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Plus className="w-4 h-4 text-[#0a1217]" />
                    <span>Add Function</span>
                  </button>
                  <button
                    onClick={() => setIsHouseholdModalOpen(true)}
                    className="px-5 py-2.5 rounded-full bg-white text-[#0a1217] hover:bg-[#e4eff7] text-xs sm:text-sm font-medium transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Users className="w-4 h-4 text-[#0a1217]" />
                    <span>Add Household</span>
                  </button>
                </div>
              </div>
            )}

            {/* Sana Geometric Pill Navigation Tabs */}
            <div className="flex items-center gap-2 mb-8 overflow-x-auto scrollbar-none pb-1">
              <button
                onClick={() => setActiveTab('headcount')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs sm:text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'headcount'
                    ? 'bg-[#0a1217] text-white'
                    : 'bg-[#e4eff7] text-[#0a1217] hover:bg-[#d5e5f0]'
                }`}
              >
                <Calculator className="w-3.5 h-3.5" />
                <span>Headcount & Catering</span>
              </button>

              <button
                onClick={() => setActiveTab('checkin')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs sm:text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'checkin'
                    ? 'bg-[#0a1217] text-white'
                    : 'bg-[#e4eff7] text-[#0a1217] hover:bg-[#d5e5f0]'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Venue Check-In</span>
              </button>

              <button
                onClick={() => setActiveTab('functions')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs sm:text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'functions'
                    ? 'bg-[#0a1217] text-white'
                    : 'bg-[#e4eff7] text-[#0a1217] hover:bg-[#d5e5f0]'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Functions ({functions.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('guests')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs sm:text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'guests'
                    ? 'bg-[#0a1217] text-white'
                    : 'bg-[#e4eff7] text-[#0a1217] hover:bg-[#d5e5f0]'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Guest Registry ({households.length})</span>
              </button>
            </div>

            {/* Tab: Headcount Dashboard View */}
            {activeTab === 'headcount' && (
              <HeadcountDashboard
                functions={functions}
                onNavigateToFunctions={() => setActiveTab('functions')}
              />
            )}

            {/* Tab: Venue Check-In View */}
            {activeTab === 'checkin' && (
              <VenueCheckIn
                functions={functions}
                weddingTimezone={activeWedding?.timezone || 'Asia/Kolkata'}
                onNavigateToFunctions={() => setActiveTab('functions')}
              />
            )}

            {/* Tab: Functions View */}
            {activeTab === 'functions' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-medium text-[#0a1217] tracking-tight">Celebration Functions</h3>
                    <p className="text-[#85898b] text-[13px] mt-0.5">
                      Sub-events with individual dates, venues, and RSVP assignments
                    </p>
                  </div>

                  <button
                    onClick={() => setIsFunctionModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#0a1217] text-white text-xs sm:text-sm font-medium hover:opacity-90 transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Function</span>
                  </button>
                </div>

                {isLoadingContent ? (
                  <div className="py-16 flex justify-center items-center text-[#85898b]">
                    <Loader2 className="w-6 h-6 animate-spin text-[#0a1217]" />
                  </div>
                ) : functions.length === 0 ? (
                  <div className="bg-[#e4eff7] rounded-[24px] p-8 text-center border border-[#0a1217]/10">
                    <p className="text-[#0a1217] text-sm font-medium">No functions added to this event yet.</p>
                    <p className="text-[#85898b] text-xs mt-1 mb-6">
                      Add Haldi, Mehendi, Sangeet, Ceremony, or Reception to begin inviting guests.
                    </p>
                    <button
                      onClick={() => setIsFunctionModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#0a1217] text-white text-xs font-medium cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add First Function</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {functions.map((fn) => (
                      <div
                        key={fn.id}
                        className="bg-[#e4eff7] rounded-[24px] p-6 border border-[#0a1217]/10 flex flex-col justify-between transition-colors"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-4">
                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-white text-[#0a1217] border border-[#0a1217]/10">
                              {fn.name}
                            </span>
                            <button
                              onClick={() => handleDeleteFunction(fn)}
                              className="p-1.5 rounded-full text-[#85898b] hover:text-[#0a1217] hover:bg-white/50 transition-colors cursor-pointer"
                              title="Delete function"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="space-y-2 text-xs text-[#0a1217]/80">
                            <div className="flex items-center gap-2">
                              <Clock className="w-3.5 h-3.5 text-[#85898b] flex-shrink-0" />
                              <span className="font-normal">{formatEventDateTime(fn.dateTime)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="w-3.5 h-3.5 text-[#85898b] flex-shrink-0" />
                              <span className="truncate">{fn.venue}</span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setSelectedFunctionForInvites(fn)}
                          className="mt-6 pt-4 border-t border-[#0a1217]/10 w-full flex items-center justify-between text-xs font-medium text-[#0a1217] hover:opacity-75 transition-opacity cursor-pointer"
                        >
                          <span>Manage Invitations</span>
                          <ChevronRight className="w-4 h-4 text-[#85898b]" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab: Guests View */}
            {activeTab === 'guests' && activeWedding && (
              <HouseholdList
                weddingId={activeWedding.id}
                households={households}
                onHouseholdDeleted={handleHouseholdDeleted}
                onHouseholdUpdated={handleHouseholdUpdated}
                onOpenAddModal={() => setIsHouseholdModalOpen(true)}
                onOpenImportModal={() => setIsImportModalOpen(true)}
              />
            )}
          </div>
        )}
      </main>

      {/* Modals */}
      <CreateWeddingModal
        isOpen={isWeddingModalOpen}
        onClose={() => setIsWeddingModalOpen(false)}
        onWeddingCreated={handleWeddingCreated}
      />

      {activeWedding && (
        <>
          <CreateFunctionModal
            isOpen={isFunctionModalOpen}
            onClose={() => setIsFunctionModalOpen(false)}
            weddingId={activeWedding.id}
            onFunctionCreated={handleFunctionCreated}
          />

          <CreateHouseholdModal
            isOpen={isHouseholdModalOpen}
            onClose={() => setIsHouseholdModalOpen(false)}
            weddingId={activeWedding.id}
            onHouseholdCreated={(newHh) => setHouseholds((prev) => [newHh, ...prev])}
          />

          <CsvImportModal
            isOpen={isImportModalOpen}
            onClose={() => setIsImportModalOpen(false)}
            weddingId={activeWedding.id}
            onImportComplete={() => loadWeddingData(activeWedding.id)}
          />

          {selectedFunctionForInvites && (
            <FunctionInvitationsModal
              isOpen={Boolean(selectedFunctionForInvites)}
              onClose={() => setSelectedFunctionForInvites(null)}
              weddingFunction={selectedFunctionForInvites}
              onInvitationsUpdated={() => {
                if (activeWedding) loadWeddingData(activeWedding.id);
              }}
            />
          )}
        </>
      )}
    </div>
  );
};

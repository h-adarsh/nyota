import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users,
  Search,
  CheckCircle2,
  UserCheck,
  UserPlus,
  RotateCcw,
  SlidersHorizontal,
  Plus,
  Minus,
  Clock,
  Phone,
  AlertCircle,
  Loader2,
  Calendar,
  MapPin,
  Sparkles,
  X,
  FileText,
  RefreshCw,
} from 'lucide-react';
import { WeddingFunction } from '../types/wedding';
import {
  FunctionCheckinOverview,
} from '../types/checkin';
import {
  getFunctionCheckinOverviewApi,
  recordCheckinApi,
  undoCheckinApi,
  updateCheckinApi,
} from '../api/checkin';

interface VenueCheckInProps {
  functions: WeddingFunction[];
  initialFunctionId?: string;
  weddingTimezone?: string;
  onNavigateToFunctions?: () => void;
}

type CheckinFilter = 'all' | 'pending' | 'arrived' | 'walkin';

export const VenueCheckIn: React.FC<VenueCheckInProps> = ({
  functions,
  initialFunctionId,
  weddingTimezone,
  onNavigateToFunctions,
}) => {
  const [selectedFunctionId, setSelectedFunctionId] = useState<string>(
    initialFunctionId || (functions.length > 0 ? functions[0].id : '')
  );

  const [overview, setOverview] = useState<FunctionCheckinOverview | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [failedCheckins, setFailedCheckins] = useState<Record<string, string>>({});

  // Search & Filtering
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<CheckinFilter>('all');

  // Adjust / Stepper Modal State
  const [adjustModalData, setAdjustModalData] = useState<{
    householdId?: string | null;
    checkinId?: string | null;
    name: string;
    contactName?: string | null;
    currentPartySize: number;
    expectedPartySize: number;
    notes: string;
    isAlreadyCheckedIn: boolean;
  } | null>(null);

  // Walk-in Modal State
  const [isWalkinModalOpen, setIsWalkinModalOpen] = useState<boolean>(false);
  const [walkinClientId, setWalkinClientId] = useState<string>('');
  const [walkinName, setWalkinName] = useState<string>('');
  const [walkinPartySize, setWalkinPartySize] = useState<number>(1);
  const [walkinNotes, setWalkinNotes] = useState<string>('');

  // Undo Confirmation State
  const [undoTarget, setUndoTarget] = useState<{
    checkinId: string;
    name: string;
  } | null>(null);

  // Fetch check-in overview whenever selected function changes
  const loadOverview = useCallback(async (functionId: string) => {
    if (!functionId) return;
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const data = await getFunctionCheckinOverviewApi(functionId);
      setOverview(data);
    } catch (err: any) {
      console.error('Failed to load check-in overview:', err);
      setErrorMessage(err.message || 'Could not load venue check-in data.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedFunctionId) {
      loadOverview(selectedFunctionId);
    }
  }, [selectedFunctionId, loadOverview]);

  // Auto-polling for multi-device live sync across gate volunteers (every 15s)
  useEffect(() => {
    if (!selectedFunctionId) return;

    const interval = setInterval(() => {
      getFunctionCheckinOverviewApi(selectedFunctionId)
        .then((data) => setOverview(data))
        .catch((err) => console.warn('[checkin] Background poll error:', err));
    }, 15000);

    return () => clearInterval(interval);
  }, [selectedFunctionId]);

  // Keep selectedFunctionId valid when functions array changes
  useEffect(() => {
    if (functions.length > 0 && !functions.some((f) => f.id === selectedFunctionId)) {
      setSelectedFunctionId(functions[0].id);
    }
  }, [functions, selectedFunctionId]);

  // Dismiss auto-disappearing success notifications
  useEffect(() => {
    if (successBanner) {
      const timer = setTimeout(() => setSuccessBanner(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [successBanner]);

  // Find currently selected function metadata
  const selectedFunction = useMemo(
    () => functions.find((f) => f.id === selectedFunctionId),
    [functions, selectedFunctionId]
  );

  // Combined and filtered guest items for attendance list
  // 1. Invited Households
  // 2. Walk-in Check-ins (not linked to an invited household)
  const combinedGuestList = useMemo(() => {
    if (!overview) return [];

    const invited = overview.invitedHouseholds.map((hh) => ({
      type: 'invited' as const,
      id: hh.householdId,
      name: hh.householdName,
      contact: hh.primaryContactName,
      phone: hh.phone,
      expectedPartySize: hh.expectedPartySize,
      rsvpStatus: hh.rsvpStatus,
      rsvpPartySize: hh.rsvpPartySize,
      isCheckedIn: hh.isCheckedIn,
      checkinId: hh.checkinId,
      actualPartySize: hh.actualPartySize,
      checkedInAt: hh.checkedInAt,
      notes: hh.notes,
    }));

    // Walk-ins only (isWalkin === true or householdId === null)
    const walkins = overview.checkins
      .filter((c) => c.isWalkin || !c.householdId)
      .map((c) => ({
        type: 'walkin' as const,
        id: c.id,
        name: c.guestName,
        contact: c.primaryContactName || c.guestName,
        phone: c.phone,
        expectedPartySize: c.actualPartySize,
        rsvpStatus: null,
        rsvpPartySize: null,
        isCheckedIn: true,
        checkinId: c.id,
        actualPartySize: c.actualPartySize,
        checkedInAt: c.checkedInAt,
        notes: c.notes,
      }));

    return [...invited, ...walkins];
  }, [overview]);

  // Apply search query and active filter tab
  const filteredList = useMemo(() => {
    let list = combinedGuestList;

    // Filter tab
    if (activeFilter === 'pending') {
      list = list.filter((item) => item.type === 'invited' && !item.isCheckedIn);
    } else if (activeFilter === 'arrived') {
      list = list.filter((item) => item.isCheckedIn);
    } else if (activeFilter === 'walkin') {
      list = list.filter((item) => item.type === 'walkin');
    }

    // Search query
    const query = searchQuery.trim().toLowerCase();
    if (query) {
      list = list.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          item.contact?.toLowerCase().includes(query) ||
          item.phone?.toLowerCase().includes(query) ||
          item.notes?.toLowerCase().includes(query)
      );
    }

    return list;
  }, [combinedGuestList, activeFilter, searchQuery]);

  // Counts for filter tabs
  const tabCounts = useMemo(() => {
    const total = combinedGuestList.length;
    const pending = combinedGuestList.filter((item) => item.type === 'invited' && !item.isCheckedIn).length;
    const arrived = combinedGuestList.filter((item) => item.isCheckedIn).length;
    const walkin = combinedGuestList.filter((item) => item.type === 'walkin').length;
    return { total, pending, arrived, walkin };
  }, [combinedGuestList]);

  // Handle direct 1-tap check-in with expected/RSVP party size
  const handleDirectCheckin = async (item: (typeof combinedGuestList)[0]) => {
    if (item.type !== 'invited' || item.isCheckedIn) return;

    // Use RSVP party size if confirmed, otherwise expected party size
    const defaultSize =
      item.rsvpStatus === 'yes' && item.rsvpPartySize && item.rsvpPartySize > 0
        ? item.rsvpPartySize
        : item.expectedPartySize || 1;

    try {
      setActionLoadingId(item.id);
      setErrorMessage(null);
      await recordCheckinApi(selectedFunctionId, {
        householdId: item.id,
        actualPartySize: defaultSize,
        notes: null,
      });

      // Clear any prior failure state for this household
      setFailedCheckins((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });

      setSuccessBanner(`Checked in ${item.name} (${defaultSize} guests)`);
      await loadOverview(selectedFunctionId);
    } catch (err: any) {
      console.error('Check-in error:', err);
      const msg = err.message || 'Network connection issue. Tap to retry.';
      setErrorMessage(msg);
      setFailedCheckins((prev) => ({ ...prev, [item.id]: msg }));
    } finally {
      setActionLoadingId(null);
    }
  };

  // Open Adjust / Stepper Modal
  const openAdjustModal = (item: (typeof combinedGuestList)[0]) => {
    const defaultSize = item.isCheckedIn
      ? item.actualPartySize || 1
      : item.rsvpStatus === 'yes' && item.rsvpPartySize && item.rsvpPartySize > 0
      ? item.rsvpPartySize
      : item.expectedPartySize || 1;

    setAdjustModalData({
      householdId: item.type === 'invited' ? item.id : null,
      checkinId: item.checkinId,
      name: item.name,
      contactName: item.contact,
      currentPartySize: defaultSize,
      expectedPartySize: item.expectedPartySize,
      notes: item.notes || '',
      isAlreadyCheckedIn: item.isCheckedIn,
    });
  };

  // Save changes from Adjust Modal
  const handleSaveAdjustModal = async () => {
    if (!adjustModalData) return;

    try {
      setIsLoading(true);
      setErrorMessage(null);

      if (adjustModalData.isAlreadyCheckedIn && adjustModalData.checkinId) {
        // Update existing check-in
        await updateCheckinApi(selectedFunctionId, adjustModalData.checkinId, {
          actualPartySize: adjustModalData.currentPartySize,
          notes: adjustModalData.notes.trim() || null,
        });
        setSuccessBanner(`Updated ${adjustModalData.name} arrival details`);
      } else {
        // Record new check-in with custom party size
        await recordCheckinApi(selectedFunctionId, {
          householdId: adjustModalData.householdId,
          actualPartySize: adjustModalData.currentPartySize,
          notes: adjustModalData.notes.trim() || null,
        });
        setSuccessBanner(
          `Checked in ${adjustModalData.name} (${adjustModalData.currentPartySize} guests)`
        );
      }

      setAdjustModalData(null);
      await loadOverview(selectedFunctionId);
    } catch (err: any) {
      console.error('Adjust check-in error:', err);
      setErrorMessage(err.message || 'Failed to save check-in adjustments.');
    } finally {
      setIsLoading(false);
    }
  };

  // Open Walk-in Modal
  const openWalkinModal = () => {
    setWalkinClientId(crypto.randomUUID());
    setWalkinName('');
    setWalkinPartySize(1);
    setWalkinNotes('');
    setIsWalkinModalOpen(true);
  };

  // Submit Walk-in
  const handleSaveWalkin = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = walkinName.trim();
    if (!trimmed) {
      setErrorMessage('Please enter guest or group name for walk-in.');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);
      await recordCheckinApi(selectedFunctionId, {
        clientGeneratedId: walkinClientId || crypto.randomUUID(),
        guestName: trimmed,
        actualPartySize: walkinPartySize,
        isWalkin: true,
        notes: walkinNotes.trim() || null,
      });

      setSuccessBanner(`Walk-in recorded: ${trimmed} (${walkinPartySize} guests)`);
      setIsWalkinModalOpen(false);
      await loadOverview(selectedFunctionId);
    } catch (err: any) {
      console.error('Walk-in error:', err);
      setErrorMessage(err.message || 'Failed to record walk-in arrival.');
    } finally {
      setIsLoading(false);
    }
  };

  // Confirm and execute Undo
  const handleConfirmUndo = async () => {
    if (!undoTarget) return;

    try {
      setIsLoading(true);
      setErrorMessage(null);
      await undoCheckinApi(selectedFunctionId, undoTarget.checkinId);
      setSuccessBanner(`Check-in undone for ${undoTarget.name}`);
      setUndoTarget(null);
      await loadOverview(selectedFunctionId);
    } catch (err: any) {
      console.error('Undo check-in error:', err);
      setErrorMessage(err.message || 'Failed to undo check-in.');
    } finally {
      setIsLoading(false);
    }
  };

  // Format timestamp helper
  const formatTime = (isoString?: string | null) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString('en-IN', {
        timeZone: weddingTimezone || 'Asia/Kolkata',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return '';
    }
  };

  if (functions.length === 0) {
    return (
      <div className="bg-[#e4eff7] rounded-[24px] border border-[#0a1217]/10 p-8 text-center max-w-lg mx-auto">
        <Calendar className="w-12 h-12 text-[#85898b] mx-auto mb-3" />
        <h3 className="font-serif text-2xl font-normal text-[#0a1217]">No Functions Configured</h3>
        <p className="text-xs text-[#85898b] mt-1 mb-6">
          Venue check-in requires at least one event function to record arrivals.
        </p>
        {onNavigateToFunctions && (
          <button
            onClick={onNavigateToFunctions}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#0a1217] text-white text-xs font-medium transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Function</span>
          </button>
        )}
      </div>
    );
  }

  const summary = overview?.summary;
  const confirmedTarget = summary?.confirmedHeadcount || summary?.invitedHeadcount || 1;
  const checkedInTotal = summary?.totalCheckedInGuests || 0;
  const progressPercent = Math.min(
    100,
    Math.round((checkedInTotal / (confirmedTarget > 0 ? confirmedTarget : 1)) * 100)
  );

  return (
    <div className="space-y-6">
      {/* Function Selector & Top Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Function Dropdown */}
        <div className="flex-1 max-w-md">
          <label className="block text-[11px] font-medium uppercase tracking-wider text-[#85898b] mb-1.5">
            Active Function Venue
          </label>
          <div className="relative">
            <select
              value={selectedFunctionId}
              onChange={(e) => setSelectedFunctionId(e.target.value)}
              className="w-full appearance-none bg-white border border-[#000000] text-[#0a1217] font-medium text-sm sm:text-base rounded-[24px] px-4 py-3 pr-10 focus:outline-none cursor-pointer"
            >
              {functions.map((fn) => (
                <option key={fn.id} value={fn.id}>
                  {fn.name} {fn.venue ? `(${fn.venue})` : ''}
                </option>
              ))}
            </select>
            <SlidersHorizontal className="w-4 h-4 text-[#85898b] absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          {selectedFunction?.venue && (
            <p className="text-xs text-[#85898b] mt-1.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#85898b] shrink-0" />
              <span>{selectedFunction.venue}</span>
            </p>
          )}
        </div>

        {/* Action Buttons: Refresh & Add Walk-In */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadOverview(selectedFunctionId)}
            disabled={isLoading}
            className="p-3 rounded-full border border-[#0a1217]/20 bg-white hover:bg-[#e4eff7] text-[#0a1217] font-medium text-xs transition-all min-h-[48px] min-w-[48px] flex items-center justify-center cursor-pointer"
            title="Refresh check-in overview"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#0a1217]' : 'text-[#85898b]'}`} />
          </button>

          <button
            onClick={openWalkinModal}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#0a1217] hover:opacity-90 text-white font-medium text-xs sm:text-sm transition-all min-h-[48px] cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-[#cdfe00]" />
            <span>+ Add Walk-In Guest</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {errorMessage && (
        <div className="bg-[#e4eff7] border border-[#0a1217]/10 rounded-[24px] p-4 flex items-start gap-3 text-[#0a1217] text-xs sm:text-sm animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-[#0a1217] shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium">{errorMessage}</p>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-[#85898b] hover:text-[#0a1217] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successBanner && (
        <div className="bg-[#e4eff7] border border-[#0a1217]/10 rounded-[24px] p-4 flex items-center gap-3 text-[#0a1217] text-xs sm:text-sm animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-[#0a1217] shrink-0" />
          <p className="font-medium flex-1">{successBanner}</p>
        </div>
      )}

      {/* Attendance Summary Dashboard Hero (Sana Dark Card with Electric Lime Accent) */}
      <div className="bg-[#0a1217] text-white rounded-[24px] border border-[#0a1217] p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium uppercase tracking-wider text-[#cdfe00]">
              Live Attendance
            </span>
            <h3 className="text-xl sm:text-2xl font-medium text-white tracking-tight mt-0.5">
              Venue Check-In
            </h3>
          </div>
          <div className="text-right">
            <span className="text-3xl sm:text-4xl font-medium text-[#cdfe00] tabular-nums">
              {progressPercent}%
            </span>
            <p className="text-[11px] text-[#85898b] font-normal">Arrival Rate</p>
          </div>
        </div>

        {/* Visual Progress Bar in Electric Lime */}
        <div className="w-full bg-white/20 rounded-full h-2.5 overflow-hidden">
          <div
            className="bg-[#cdfe00] h-full rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* KPI Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 pt-1">
          {/* 1. Arrived Guests */}
          <div className="bg-white/5 border border-white/10 rounded-[24px] p-4">
            <div className="flex items-center gap-1.5 text-[#cdfe00] text-xs font-medium mb-1">
              <UserCheck className="w-3.5 h-3.5" />
              <span>Arrived</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-medium text-white tabular-nums">
                {summary?.totalCheckedInGuests ?? 0}
              </span>
              <span className="text-xs text-[#85898b]">
                / {summary?.confirmedHeadcount ?? 0}
              </span>
            </div>
          </div>

          {/* 2. Households Arrived */}
          <div className="bg-white/5 border border-white/10 rounded-[24px] p-4">
            <div className="flex items-center gap-1.5 text-white text-xs font-medium mb-1">
              <Users className="w-3.5 h-3.5 text-[#85898b]" />
              <span>Households</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-medium text-white tabular-nums">
                {summary?.totalCheckedInHouseholds ?? 0}
              </span>
              <span className="text-xs text-[#85898b]">
                / {overview?.invitedHouseholds.length ?? 0}
              </span>
            </div>
          </div>

          {/* 3. Walk-Ins Recorded */}
          <div className="bg-white/5 border border-white/10 rounded-[24px] p-4">
            <div className="flex items-center gap-1.5 text-white text-xs font-medium mb-1">
              <Sparkles className="w-3.5 h-3.5 text-[#cdfe00]" />
              <span>Walk-Ins</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-medium text-white tabular-nums">
                {summary?.walkinGuests ?? 0}
              </span>
              <span className="text-xs text-[#85898b]">
                ({summary?.walkinCount ?? 0} groups)
              </span>
            </div>
          </div>

          {/* 4. Pending Expected */}
          <div className="bg-white/5 border border-white/10 rounded-[24px] p-4">
            <div className="flex items-center gap-1.5 text-white text-xs font-medium mb-1">
              <Clock className="w-3.5 h-3.5 text-[#85898b]" />
              <span>Pending</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-medium text-white tabular-nums">
                {tabCounts.pending}
              </span>
              <span className="text-xs text-[#85898b]">households</span>
            </div>
          </div>
        </div>
      </div>

      {/* Fast Name Search & Filter Chips Bar */}
      <div className="space-y-3">
        {/* Large Touch Search Input (24px radius, Obsidian outline) */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search guest by household name, contact, or phone..."
            className="w-full bg-white border border-[#000000] text-[#0a1217] placeholder-[#85898b] text-sm sm:text-base rounded-[24px] pl-12 pr-10 py-3.5 focus:outline-none min-h-[48px]"
          />
          <Search className="w-4 h-4 text-[#85898b] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-[#85898b] hover:text-[#0a1217] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-4 py-2 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-all min-h-[38px] cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-[#0a1217] text-white'
                : 'bg-[#e4eff7] text-[#0a1217] hover:bg-[#d5e5f0]'
            }`}
          >
            All Guests ({tabCounts.total})
          </button>

          <button
            onClick={() => setActiveFilter('pending')}
            className={`px-4 py-2 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-all min-h-[38px] cursor-pointer ${
              activeFilter === 'pending'
                ? 'bg-[#0a1217] text-white'
                : 'bg-[#e4eff7] text-[#0a1217] hover:bg-[#d5e5f0]'
            }`}
          >
            Pending Arrival ({tabCounts.pending})
          </button>

          <button
            onClick={() => setActiveFilter('arrived')}
            className={`px-4 py-2 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-all min-h-[38px] cursor-pointer ${
              activeFilter === 'arrived'
                ? 'bg-[#0a1217] text-white'
                : 'bg-[#e4eff7] text-[#0a1217] hover:bg-[#d5e5f0]'
            }`}
          >
            Checked In ({tabCounts.arrived})
          </button>

          <button
            onClick={() => setActiveFilter('walkin')}
            className={`px-4 py-2 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-all min-h-[38px] cursor-pointer ${
              activeFilter === 'walkin'
                ? 'bg-[#0a1217] text-white'
                : 'bg-[#e4eff7] text-[#0a1217] hover:bg-[#d5e5f0]'
            }`}
          >
            Walk-ins ({tabCounts.walkin})
          </button>
        </div>
      </div>

      {/* Guest Check-In Cards List */}
      <div className="space-y-3">
        {isLoading && !overview ? (
          <div className="py-16 text-center text-[#85898b]">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-[#0a1217]" />
            <p className="text-xs font-medium">Loading venue check-in list...</p>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="bg-white rounded-[24px] border border-[#0a1217]/10 p-8 text-center">
            <Users className="w-8 h-8 text-[#85898b] mx-auto mb-2" />
            <h4 className="text-sm font-medium text-[#0a1217]">No Guests Found</h4>
            <p className="text-xs text-[#85898b] mt-1">
              {searchQuery
                ? `No guests matched "${searchQuery}".`
                : 'No guests match the selected filter.'}
            </p>
          </div>
        ) : (
          filteredList.map((item) => {
            const isActing = actionLoadingId === item.id;
            const isCheckedIn = item.isCheckedIn;

            // Suggested party size for direct check-in button
            const directPartySize =
              item.rsvpStatus === 'yes' && item.rsvpPartySize && item.rsvpPartySize > 0
                ? item.rsvpPartySize
                : item.expectedPartySize || 1;

            return (
              <div
                key={`${item.type}-${item.id}`}
                className={`rounded-[24px] border transition-all p-4 sm:p-5 ${
                  isCheckedIn
                    ? 'bg-[#e4eff7]/60 border-[#0a1217]/15'
                    : 'bg-white border-[#0a1217]/10 hover:border-[#0a1217]/25'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Left: Guest Details & Status Badges */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-medium text-[#0a1217] text-base tracking-tight truncate">
                        {item.name}
                      </h4>

                      {/* Walkin Tag */}
                      {item.type === 'walkin' && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-[#e4eff7] text-[#0a1217] border border-[#0a1217]/10">
                          Walk-in
                        </span>
                      )}

                      {/* RSVP Badge */}
                      {item.type === 'invited' && (
                        <>
                          {item.rsvpStatus === 'yes' ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-[#e4eff7] text-[#0a1217]">
                              Attending ({item.rsvpPartySize || item.expectedPartySize})
                            </span>
                          ) : item.rsvpStatus === 'maybe' ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-[#e4eff7] text-[#0a1217]">
                              Maybe ({item.rsvpPartySize || item.expectedPartySize})
                            </span>
                          ) : item.rsvpStatus === 'no' ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-white text-[#85898b] border border-[#0a1217]/10">
                              Declined
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-[#e4eff7] text-[#85898b]">
                              Pending
                            </span>
                          )}
                        </>
                      )}

                      {/* Checked In Tag */}
                      {isCheckedIn && (
                        <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-[11px] font-medium bg-[#0a1217] text-white">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#cdfe00]" />
                          <span>Checked In ({item.actualPartySize})</span>
                        </span>
                      )}

                      {/* Offline/Failed Arrival Warning Badge */}
                      {!isCheckedIn && failedCheckins[item.id] && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-[#e4eff7] text-[#0a1217] border border-[#0a1217]">
                          <AlertCircle className="w-3 h-3 text-[#0a1217]" />
                          <span>Tap to retry</span>
                        </span>
                      )}
                    </div>

                    {/* Contact & Meta Subtext */}
                    <div className="flex items-center gap-3 text-xs text-[#85898b] flex-wrap">
                      {item.contact && item.contact !== item.name && (
                        <span>Contact: <strong className="text-[#0a1217] font-medium">{item.contact}</strong></span>
                      )}
                      {item.phone && (
                        <a
                          href={`tel:${item.phone}`}
                          className="flex items-center gap-1 text-[#0a1217] hover:underline"
                        >
                          <Phone className="w-3 h-3 text-[#85898b]" />
                          <span>{item.phone}</span>
                        </a>
                      )}
                      <span>
                        Expected: <strong className="text-[#0a1217] font-medium">{item.expectedPartySize} guests</strong>
                      </span>
                      {isCheckedIn && item.checkedInAt && (
                        <span className="flex items-center gap-1 text-[#0a1217]">
                          <Clock className="w-3 h-3 text-[#85898b]" />
                          <span>Arrived at {formatTime(item.checkedInAt)}</span>
                        </span>
                      )}
                    </div>

                    {/* Notes preview if any */}
                    {item.notes && (
                      <p className="text-xs text-[#85898b] bg-[#e4eff7] rounded-[24px] px-3 py-1 border border-[#0a1217]/5 flex items-center gap-1.5 mt-1 max-w-xl truncate">
                        <FileText className="w-3 h-3 text-[#85898b] shrink-0" />
                        <span className="truncate">{item.notes}</span>
                      </p>
                    )}
                  </div>

                  {/* Right: Touch Actions (≥48px min height, Sana Pill Buttons) */}
                  <div className="flex items-center gap-2 pt-2 sm:pt-0 shrink-0">
                    {!isCheckedIn ? (
                      /* Not Checked In: Fast 1-Tap & Adjust Buttons */
                      <>
                        <button
                          onClick={() => handleDirectCheckin(item)}
                          disabled={isActing}
                          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-full font-medium text-xs sm:text-sm bg-[#0a1217] hover:opacity-90 text-white min-h-[48px] disabled:opacity-50 cursor-pointer transition-all"
                        >
                          {isActing ? (
                            <Loader2 className="w-4 h-4 animate-spin text-white" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4 text-[#cdfe00]" />
                          )}
                          <span>
                            {failedCheckins[item.id]
                              ? `Retry (${directPartySize})`
                              : `Check In (${directPartySize})`}
                          </span>
                        </button>

                        <button
                          onClick={() => openAdjustModal(item)}
                          title="Adjust headcount or add arrival notes"
                          className="px-4 py-2.5 rounded-full border border-[#0a1217]/20 text-[#0a1217] hover:bg-[#e4eff7] font-medium text-xs sm:text-sm transition-colors min-h-[48px] flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5 text-[#85898b]" />
                          <span>Adjust</span>
                        </button>
                      </>
                    ) : (
                      /* Already Checked In: Adjust & Undo Buttons */
                      <>
                        <button
                          onClick={() => openAdjustModal(item)}
                          className="px-4 py-2.5 rounded-full border border-[#0a1217]/20 text-[#0a1217] hover:bg-white font-medium text-xs sm:text-sm transition-colors min-h-[48px] flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5 text-[#0a1217]" />
                          <span>Edit Count</span>
                        </button>

                        <button
                          onClick={() =>
                            setUndoTarget({
                              checkinId: item.checkinId!,
                              name: item.name,
                            })
                          }
                          title="Undo check-in for this guest"
                          className="px-3.5 py-2.5 rounded-full text-[#85898b] hover:text-[#0a1217] hover:bg-white transition-colors min-h-[48px] flex items-center justify-center cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span className="text-xs font-medium ml-1 hidden sm:inline">Undo</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Adjust Party Size & Notes Modal */}
      {adjustModalData && (
        <div className="fixed inset-0 z-50 bg-[#0a1217]/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] max-w-md w-full p-6 sm:p-8 border border-[#000000] space-y-5 animate-in fade-in">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-medium uppercase tracking-wider text-[#85898b]">
                  {adjustModalData.isAlreadyCheckedIn ? 'Edit Arrival' : 'Venue Check-In'}
                </span>
                <h3 className="text-xl font-medium text-[#0a1217] mt-0.5">
                  {adjustModalData.name}
                </h3>
                {adjustModalData.contactName && (
                  <p className="text-xs text-[#85898b]">Contact: {adjustModalData.contactName}</p>
                )}
              </div>
              <button
                onClick={() => setAdjustModalData(null)}
                className="text-[#85898b] hover:text-[#0a1217] p-1 rounded-full cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stepper Input (party size) */}
            <div className="bg-[#e4eff7] rounded-[24px] p-5 border border-[#0a1217]/10 space-y-3">
              <label className="block text-xs font-medium text-[#0a1217]">
                Actual Arrived Headcount:
              </label>

              <div className="flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() =>
                    setAdjustModalData((prev) =>
                      prev
                        ? {
                            ...prev,
                            currentPartySize: Math.max(1, prev.currentPartySize - 1),
                          }
                        : null
                    )
                  }
                  disabled={adjustModalData.currentPartySize <= 1}
                  className="w-12 h-12 rounded-full bg-white border border-[#000000] text-[#0a1217] font-medium text-lg flex items-center justify-center transition-all cursor-pointer disabled:opacity-40 min-h-[48px] min-w-[48px]"
                >
                  <Minus className="w-5 h-5" />
                </button>

                <div className="w-24 text-center">
                  <span className="text-4xl font-medium text-[#0a1217] tabular-nums">
                    {adjustModalData.currentPartySize}
                  </span>
                  <p className="text-[11px] font-medium text-[#85898b] uppercase tracking-wider">
                    {adjustModalData.currentPartySize === 1 ? 'Guest' : 'Guests'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setAdjustModalData((prev) =>
                      prev
                        ? {
                            ...prev,
                            currentPartySize: Math.min(50, prev.currentPartySize + 1),
                          }
                        : null
                    )
                  }
                  className="w-12 h-12 rounded-full bg-white border border-[#000000] text-[#0a1217] font-medium text-lg flex items-center justify-center transition-all cursor-pointer min-h-[48px] min-w-[48px]"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>

              {/* Quick Preset Buttons */}
              {adjustModalData.expectedPartySize &&
                adjustModalData.expectedPartySize !== adjustModalData.currentPartySize && (
                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() =>
                        setAdjustModalData((prev) =>
                          prev
                            ? {
                                ...prev,
                                currentPartySize: prev.expectedPartySize,
                              }
                            : null
                        )
                      }
                      className="text-xs text-[#0a1217] hover:underline font-medium cursor-pointer"
                    >
                      Reset to expected headcount ({adjustModalData.expectedPartySize})
                    </button>
                  </div>
                )}
            </div>

            {/* Optional Arrival Notes */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#0a1217]">
                Gate Notes (Optional):
              </label>
              <textarea
                value={adjustModalData.notes}
                onChange={(e) =>
                  setAdjustModalData((prev) =>
                    prev ? { ...prev, notes: e.target.value } : null
                  )
                }
                maxLength={500}
                placeholder="e.g. Arrived late, special seating request..."
                rows={2}
                className="w-full bg-white border border-[#000000] text-[#0a1217] placeholder-[#85898b] text-xs rounded-[24px] p-3.5 focus:outline-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setAdjustModalData(null)}
                className="flex-1 py-3 px-4 rounded-full border border-[#0a1217]/20 text-[#0a1217] font-medium text-xs sm:text-sm hover:bg-[#e4eff7] transition-colors min-h-[48px] cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSaveAdjustModal}
                disabled={isLoading}
                className="flex-1 py-3 px-4 rounded-full bg-[#0a1217] hover:opacity-90 text-white font-medium text-xs sm:text-sm transition-all min-h-[48px] flex items-center justify-center gap-2 cursor-pointer"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-[#cdfe00]" />
                )}
                <span>
                  {adjustModalData.isAlreadyCheckedIn ? 'Update Check-In' : 'Confirm Check-In'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Walk-in Guest Modal */}
      {isWalkinModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#0a1217]/50 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveWalkin}
            className="bg-white rounded-[24px] max-w-md w-full p-6 sm:p-8 border border-[#000000] space-y-5 animate-in fade-in"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-medium uppercase tracking-wider text-[#85898b]">
                  Unregistered Arrival
                </span>
                <h3 className="text-xl font-medium text-[#0a1217] mt-0.5">
                  Record Walk-In Guest
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsWalkinModalOpen(false)}
                className="text-[#85898b] hover:text-[#0a1217] p-1 rounded-full cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Guest / Group Name */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#0a1217]">
                Guest or Group Name:
              </label>
              <input
                type="text"
                required
                maxLength={150}
                value={walkinName}
                onChange={(e) => setWalkinName(e.target.value)}
                placeholder="e.g. Ramesh Uncle & Family"
                className="w-full bg-white border border-[#000000] text-[#0a1217] text-sm rounded-[24px] px-4 py-3 focus:outline-none min-h-[48px]"
              />
            </div>

            {/* Party Size Stepper */}
            <div className="bg-[#e4eff7] rounded-[24px] p-5 border border-[#0a1217]/10 space-y-3">
              <label className="block text-xs font-medium text-[#0a1217]">
                Number of Arriving Guests:
              </label>

              <div className="flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => setWalkinPartySize((prev) => Math.max(1, prev - 1))}
                  disabled={walkinPartySize <= 1}
                  className="w-12 h-12 rounded-full bg-white border border-[#000000] text-[#0a1217] font-medium text-lg flex items-center justify-center transition-all cursor-pointer disabled:opacity-40 min-h-[48px] min-w-[48px]"
                >
                  <Minus className="w-5 h-5" />
                </button>

                <div className="w-24 text-center">
                  <span className="text-4xl font-medium text-[#0a1217] tabular-nums">
                    {walkinPartySize}
                  </span>
                  <p className="text-[11px] font-medium text-[#85898b] uppercase tracking-wider">
                    {walkinPartySize === 1 ? 'Guest' : 'Guests'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setWalkinPartySize((prev) => Math.min(50, prev + 1))}
                  className="w-12 h-12 rounded-full bg-white border border-[#000000] text-[#0a1217] font-medium text-lg flex items-center justify-center transition-all cursor-pointer min-h-[48px] min-w-[48px]"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Walk-in Notes */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#0a1217]">
                Notes (Optional):
              </label>
              <textarea
                value={walkinNotes}
                onChange={(e) => setWalkinNotes(e.target.value)}
                maxLength={500}
                placeholder="e.g. Accompanied groom's friends..."
                rows={2}
                className="w-full bg-white border border-[#000000] text-[#0a1217] placeholder-[#85898b] text-xs rounded-[24px] p-3.5 focus:outline-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsWalkinModalOpen(false)}
                className="flex-1 py-3 px-4 rounded-full border border-[#0a1217]/20 text-[#0a1217] font-medium text-xs sm:text-sm hover:bg-[#e4eff7] transition-colors min-h-[48px] cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isLoading || !walkinName.trim()}
                className="flex-1 py-3 px-4 rounded-full bg-[#0a1217] hover:opacity-90 text-white font-medium text-xs sm:text-sm transition-all min-h-[48px] flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <UserPlus className="w-4 h-4 text-[#cdfe00]" />
                )}
                <span>Record Walk-In</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Undo Check-In Confirmation Dialog */}
      {undoTarget && (
        <div className="fixed inset-0 z-50 bg-[#0a1217]/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] max-w-sm w-full p-6 sm:p-8 border border-[#000000] space-y-4 animate-in fade-in text-center">
            <div>
              <h4 className="text-base font-medium text-[#0a1217]">
                Undo Check-In?
              </h4>
              <p className="text-xs text-[#85898b] mt-1.5">
                Revert check-in for <strong className="text-[#0a1217]">{undoTarget.name}</strong>? Their status will return to pending.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-3">
              <button
                type="button"
                onClick={() => setUndoTarget(null)}
                className="flex-1 py-2.5 px-4 rounded-full border border-[#0a1217]/20 text-[#0a1217] font-medium text-xs hover:bg-[#e4eff7] min-h-[44px] cursor-pointer"
              >
                Keep Checked In
              </button>

              <button
                type="button"
                onClick={handleConfirmUndo}
                disabled={isLoading}
                className="flex-1 py-2.5 px-4 rounded-full bg-[#0a1217] hover:opacity-90 text-white font-medium text-xs transition-all min-h-[44px] flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="w-3.5 h-3.5 text-[#cdfe00]" />
                )}
                <span>Yes, Undo</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

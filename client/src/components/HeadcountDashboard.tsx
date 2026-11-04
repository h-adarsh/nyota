import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Utensils,
  Calculator,
  RefreshCw,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  Info,
  Download,
  Loader2,
  Phone,
} from 'lucide-react';
import { WeddingFunction } from '../types/wedding';
import { HeadcountData } from '../types/headcount';
import { getFunctionHeadcountApi, exportCatererCsvApi } from '../api/headcount';

interface HeadcountDashboardProps {
  functions: WeddingFunction[];
  onNavigateToFunctions: () => void;
}

export const HeadcountDashboard: React.FC<HeadcountDashboardProps> = ({
  functions,
  onNavigateToFunctions,
}) => {
  const [selectedFunctionId, setSelectedFunctionId] = useState<string>(
    functions[0]?.id || ''
  );
  const [headcount, setHeadcount] = useState<HeadcountData | null>(null);
  const [maybePct, setMaybePct] = useState<number>(50);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);
  const [showStaleDrawer, setShowStaleDrawer] = useState<boolean>(false);

  // Sync selected function if functions list changes
  useEffect(() => {
    if (functions.length > 0 && (!selectedFunctionId || !functions.some((f) => f.id === selectedFunctionId))) {
      setSelectedFunctionId(functions[0].id);
    }
  }, [functions, selectedFunctionId]);

  const loadHeadcount = useCallback(
    async (funcId: string, pct: number) => {
      if (!funcId) return;
      try {
        setIsLoading(true);
        setError(null);
        const data = await getFunctionHeadcountApi(funcId, { maybePct: pct });
        setHeadcount(data);
        setLastRefreshedAt(new Date());
      } catch (err) {
        console.error('Failed to load headcount:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch headcount');
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (selectedFunctionId) {
      loadHeadcount(selectedFunctionId, maybePct);
    }
  }, [selectedFunctionId, maybePct, loadHeadcount]);

  const handleRefresh = () => {
    if (selectedFunctionId) {
      loadHeadcount(selectedFunctionId, maybePct);
    }
  };

  const handleExportCsv = async () => {
    if (!selectedFunctionId) return;
    try {
      setIsExporting(true);
      setError(null);
      const { blob, filename } = await exportCatererCsvApi(selectedFunctionId, maybePct);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to export caterer CSV:', err);
      setError(err instanceof Error ? err.message : 'Failed to export caterer CSV');
    } finally {
      setIsExporting(false);
    }
  };

  const selectedFunction = functions.find((f) => f.id === selectedFunctionId);

  if (functions.length === 0) {
    return (
      <div className="bg-[#e4eff7] rounded-[24px] border border-[#0a1217]/10 p-8 sm:p-14 text-center my-4">
        <h3 className="font-serif text-2xl font-normal text-[#0a1217] tracking-tight">No Functions Created Yet</h3>
        <p className="text-[#85898b] text-sm max-w-md mx-auto mt-2 mb-6">
          Add celebration functions to begin tracking confirmed headcounts, dietary splits, and planning estimates.
        </p>
        <button
          onClick={onNavigateToFunctions}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#0a1217] text-white text-xs sm:text-sm font-medium hover:opacity-90 transition-all cursor-pointer"
        >
          <span>Go to Functions & Invites</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Bar: Function Switcher Pills & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-[24px] border border-[#0a1217]/10">
        {/* Function Switcher Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {functions.map((fn) => {
            const isSelected = fn.id === selectedFunctionId;
            return (
              <button
                key={fn.id}
                onClick={() => setSelectedFunctionId(fn.id)}
                className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#0a1217] text-white'
                    : 'bg-[#e4eff7] text-[#0a1217] hover:bg-[#d5e5f0]'
                }`}
              >
                {fn.name}
              </button>
            );
          })}
        </div>

        {/* Live on Refresh & Actions */}
        <div className="flex items-center gap-3 self-end md:self-auto text-xs text-[#85898b]">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#0a1217] animate-pulse" />
            <span className="font-medium text-[#0a1217]">Live</span>
            <span className="text-[#85898b]">• {lastRefreshedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
          </div>

          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-[#0a1217]/20 hover:bg-[#e4eff7] text-[#0a1217] font-medium transition-all disabled:opacity-50 cursor-pointer"
            title="Refresh latest RSVP responses"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#0a1217]' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={handleExportCsv}
            disabled={isExporting || isLoading || !selectedFunctionId}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#0a1217] hover:opacity-90 text-white font-medium transition-all disabled:opacity-50 cursor-pointer"
            title="Download sanitized caterer spreadsheet with dietary details"
          >
            {isExporting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">Export Caterer CSV</span>
            <span className="sm:hidden">Export</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-[24px] bg-[#e4eff7] border border-[#0a1217]/10 text-[#0a1217] text-xs font-medium">
          {error}
        </div>
      )}

      {/* Stale RSVP Alert Banner */}
      {headcount && headcount.staleCount > 0 && (
        <div className="rounded-[24px] bg-[#e4eff7] border border-[#0a1217]/10 text-[#0a1217] overflow-hidden">
          <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-[#0a1217] shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-medium text-[#0a1217]">
                  Attention: {headcount.staleCount} RSVP response(s) are older than {headcount.staleDays} days.
                </span>
                <p className="text-[#85898b] mt-0.5">
                  Guest plans can shift over time. Consider verifying with early responders before finalizing caterer numbers.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowStaleDrawer(!showStaleDrawer)}
              className="px-4 py-2 rounded-full bg-white hover:bg-white/80 text-[#0a1217] text-xs font-medium transition-all self-start sm:self-auto shrink-0 flex items-center gap-1.5 border border-[#0a1217]/10 cursor-pointer"
            >
              <span>{showStaleDrawer ? 'Hide Stale List' : `View Stale Responses (${headcount.staleCount})`}</span>
              {showStaleDrawer ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          </div>

          {showStaleDrawer && headcount.staleHouseholds && headcount.staleHouseholds.length > 0 && (
            <div className="border-t border-[#0a1217]/10 bg-white p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3">
                <h5 className="text-[11px] font-medium uppercase tracking-wider text-[#85898b]">
                  Households Awaiting Re-Confirmation ({headcount.staleCount})
                </h5>
                <span className="text-[11px] text-[#85898b]">
                  Threshold: &gt; {headcount.staleDays} days old
                </span>
              </div>
              <div className="divide-y divide-[#0a1217]/10 border border-[#0a1217]/10 rounded-[24px] overflow-hidden bg-white">
                {headcount.staleHouseholds.map((item) => (
                  <div
                    key={item.householdId}
                    className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-[#e4eff7]/30 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[#0a1217] text-xs">{item.householdName}</span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-[#e4eff7] text-[#0a1217] border border-[#0a1217]/10">
                          {item.status === 'yes'
                            ? `Confirmed (${item.partySize} guests)`
                            : `Tentative (${item.partySize} guests)`}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#85898b] mt-1 flex flex-wrap items-center gap-2">
                        <span>Contact: <strong className="text-[#0a1217] font-medium">{item.primaryContactName}</strong></span>
                        {item.phone && (
                          <>
                            <span>•</span>
                            <a
                              href={`tel:${item.phone}`}
                              className="text-[#0a1217] hover:underline font-mono inline-flex items-center gap-1"
                            >
                              <Phone className="w-3 h-3 text-[#85898b]" />
                              <span>{item.phone}</span>
                            </a>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <span className="px-3 py-1 rounded-full bg-[#e4eff7] text-[#0a1217] font-medium text-[11px]">
                        {item.daysAgo} days ago
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {headcount && (
        <>
          {/* Main Numbers: 3 Primary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Card 1: Confirmed Headcount (Frost Wash Surface) */}
            <div className="bg-[#e4eff7] rounded-[24px] p-6 sm:p-8 border border-[#0a1217]/10 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-[#0a1217] bg-white px-3 py-1 rounded-full border border-[#0a1217]/10">
                    Confirmed Headcount
                  </span>
                  <Users className="w-4 h-4 text-[#0a1217]" />
                </div>
                <div className="flex items-baseline gap-2 mt-3">
                  <span className="text-4xl sm:text-5xl font-medium text-[#0a1217] tracking-tight tabular-nums">
                    {headcount.confirmedHeadcount}
                  </span>
                  <span className="text-xs font-medium text-[#85898b] uppercase tracking-wider">
                    Guests (People)
                  </span>
                </div>
                <p className="text-xs text-[#85898b] mt-1.5">
                  from <span className="font-medium text-[#0a1217]">{headcount.households.confirmed}</span> confirmed household(s)
                </p>
              </div>

              {/* Dietary Split (Strictly from Confirmed guests) */}
              <div className="mt-6 pt-4 border-t border-[#0a1217]/10">
                <div className="text-[11px] font-medium uppercase tracking-wider text-[#85898b] mb-2.5 flex items-center gap-1.5">
                  <Utensils className="w-3.5 h-3.5 text-[#0a1217]" />
                  <span>Dietary Breakdown</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="px-3.5 py-2.5 rounded-[24px] bg-white border border-[#0a1217]/10 flex items-center justify-between">
                    <span className="text-xs font-medium text-[#0a1217]">Vegetarian</span>
                    <span className="text-sm font-medium text-[#0a1217] tabular-nums">{headcount.vegCount}</span>
                  </div>
                  <div className="px-3.5 py-2.5 rounded-[24px] bg-white border border-[#0a1217]/10 flex items-center justify-between">
                    <span className="text-xs font-medium text-[#0a1217]">Non-Veg</span>
                    <span className="text-sm font-medium text-[#0a1217] tabular-nums">{headcount.nonvegCount}</span>
                  </div>
                </div>
                <p className="text-[11px] text-[#85898b] mt-2">
                  *Excludes tentative and declined guests.
                </p>
              </div>
            </div>

            {/* Card 2: Planning Estimate (Sana Dark Card with Electric Lime Accent) */}
            <div className="bg-[#0a1217] text-white rounded-[24px] p-6 sm:p-8 border border-[#0a1217] flex flex-col justify-between md:col-span-2">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium uppercase tracking-wider text-[#0a1217] bg-[#cdfe00] px-3 py-1 rounded-full">
                      Planning Estimate
                    </span>
                    <span className="text-[11px] text-[#85898b] font-normal">Buffer Capacity</span>
                  </div>
                  <Calculator className="w-4 h-4 text-[#85898b]" />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 mt-3">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl sm:text-5xl font-medium text-white tracking-tight tabular-nums">
                      {headcount.planningEstimate}
                    </span>
                    <span className="text-xs font-normal text-[#85898b] uppercase tracking-wider">
                      Guests to cater for
                    </span>
                  </div>
                  <span className="text-xs text-[#0a1217] font-medium bg-[#cdfe00] px-3 py-1 rounded-full w-fit">
                    Buffer: +{headcount.planningEstimate - headcount.confirmedHeadcount} guests
                  </span>
                </div>

                {/* Explicit Formula */}
                <div className="mt-5 p-4 rounded-[24px] bg-white/5 border border-white/10 text-xs">
                  <div className="flex items-center gap-1.5 text-[#cdfe00] font-medium text-[11px] mb-1">
                    <Info className="w-3.5 h-3.5" />
                    <span>Calculation Formula:</span>
                  </div>
                  <p className="font-mono text-xs sm:text-sm text-white">
                    {headcount.formula}
                  </p>
                </div>
              </div>

              {/* Maybe % Slider */}
              <div className="mt-6 pt-4 border-t border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="maybe-slider" className="text-xs font-normal text-white flex items-center gap-2">
                    <span>Include Tentative Ratio:</span>
                    <span className="text-[#cdfe00] font-mono font-medium">{maybePct}% of Maybe</span>
                  </label>
                  <span className="text-[11px] text-[#85898b]">
                    ({Math.floor((maybePct / 100) * headcount.maybeHeadcount)} of {headcount.maybeHeadcount} tentative people)
                  </span>
                </div>

                <input
                  id="maybe-slider"
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={maybePct}
                  onChange={(e) => setMaybePct(Number(e.target.value))}
                  className="w-full accent-[#cdfe00] cursor-pointer h-2 bg-white/20 rounded-lg appearance-none"
                />

                <div className="flex items-center justify-between text-[10px] text-[#85898b] mt-2">
                  <span>0% (Confirmed only)</span>
                  <div className="flex gap-1.5">
                    {[0, 25, 50, 75, 100].map((preset) => (
                      <button
                        key={preset}
                        onClick={() => setMaybePct(preset)}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors cursor-pointer ${
                          maybePct === preset
                            ? 'bg-[#cdfe00] text-[#0a1217]'
                            : 'bg-white/10 text-white hover:bg-white/20'
                        }`}
                      >
                        {preset}%
                      </button>
                    ))}
                  </div>
                  <span>100% (All tentative)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Secondary Metrics: Tentative, Declined, Pending */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {/* Maybe / Tentative */}
            <div className="bg-white rounded-[24px] p-5 sm:p-6 border border-[#0a1217]/10">
              <span className="text-[11px] font-medium uppercase tracking-wider text-[#0a1217] bg-[#e4eff7] px-3 py-1 rounded-full">
                Tentative (Maybe)
              </span>
              <div className="flex items-baseline gap-2 mt-3">
                <span className="text-2xl sm:text-3xl font-medium text-[#0a1217] tabular-nums">{headcount.maybeHeadcount}</span>
                <span className="text-xs text-[#85898b]">People</span>
              </div>
              <p className="text-xs text-[#85898b] mt-1.5">
                from <span className="font-medium text-[#0a1217]">{headcount.households.maybe}</span> household(s)
              </p>
            </div>

            {/* Declined (No) */}
            <div className="bg-white rounded-[24px] p-5 sm:p-6 border border-[#0a1217]/10">
              <span className="text-[11px] font-medium uppercase tracking-wider text-[#0a1217] bg-[#e4eff7] px-3 py-1 rounded-full">
                Declined (No)
              </span>
              <div className="flex items-baseline gap-2 mt-3">
                <span className="text-2xl sm:text-3xl font-medium text-[#0a1217] tabular-nums">{headcount.declinedHeadcount}</span>
                <span className="text-xs text-[#85898b]">People</span>
              </div>
              <p className="text-xs text-[#85898b] mt-1.5">
                from <span className="font-medium text-[#0a1217]">{headcount.households.declined}</span> household(s)
              </p>
            </div>

            {/* Pending / No Response */}
            <div className="bg-white rounded-[24px] p-5 sm:p-6 border border-[#0a1217]/10">
              <span className="text-[11px] font-medium uppercase tracking-wider text-[#0a1217] bg-[#e4eff7] px-3 py-1 rounded-full">
                Pending (No Response)
              </span>
              <div className="flex items-baseline gap-2 mt-3">
                <span className="text-2xl sm:text-3xl font-medium text-[#0a1217] tabular-nums">{headcount.noResponseHeadcount}</span>
                <span className="text-xs text-[#85898b]">People</span>
              </div>
              <p className="text-xs text-[#85898b] mt-1.5">
                from <span className="font-medium text-[#0a1217]">{headcount.households.noResponse}</span> household(s)
              </p>
            </div>
          </div>

          {/* Household Breakdown Details Drawer / Card */}
          <div className="bg-white rounded-[24px] border border-[#0a1217]/10 p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
              <div>
                <h4 className="text-base font-medium text-[#0a1217]">Household Breakdown</h4>
                <p className="text-[#85898b] text-[13px] mt-0.5">
                  Status and headcount allocations for {selectedFunction?.name}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#85898b]">Total Invited:</span>
                <span className="text-xs font-medium text-[#0a1217] px-3 py-1 rounded-full bg-[#e4eff7]">
                  {headcount.households.total} Households ({headcount.totalInvitedHeadcount} Guests)
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-4 rounded-[24px] bg-[#e4eff7] border border-[#0a1217]/10">
                <p className="text-[11px] font-medium text-[#85898b] uppercase tracking-wider">Confirmed</p>
                <p className="text-xl font-medium text-[#0a1217] mt-1 tabular-nums">{headcount.households.confirmed}</p>
                <p className="text-[11px] text-[#85898b] mt-0.5">{headcount.confirmedHeadcount} guests</p>
              </div>
              <div className="p-4 rounded-[24px] bg-[#e4eff7] border border-[#0a1217]/10">
                <p className="text-[11px] font-medium text-[#85898b] uppercase tracking-wider">Tentative</p>
                <p className="text-xl font-medium text-[#0a1217] mt-1 tabular-nums">{headcount.households.maybe}</p>
                <p className="text-[11px] text-[#85898b] mt-0.5">{headcount.maybeHeadcount} guests</p>
              </div>
              <div className="p-4 rounded-[24px] bg-[#e4eff7] border border-[#0a1217]/10">
                <p className="text-[11px] font-medium text-[#85898b] uppercase tracking-wider">Declined</p>
                <p className="text-xl font-medium text-[#0a1217] mt-1 tabular-nums">{headcount.households.declined}</p>
                <p className="text-[11px] text-[#85898b] mt-0.5">{headcount.declinedHeadcount} guests</p>
              </div>
              <div className="p-4 rounded-[24px] bg-[#e4eff7] border border-[#0a1217]/10">
                <p className="text-[11px] font-medium text-[#85898b] uppercase tracking-wider">Pending</p>
                <p className="text-xl font-medium text-[#0a1217] mt-1 tabular-nums">{headcount.households.noResponse}</p>
                <p className="text-[11px] text-[#85898b] mt-0.5">{headcount.noResponseHeadcount} guests</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Modal } from './Modal';
import { WeddingFunction, FunctionInvitationHousehold } from '../types/wedding';
import {
  getFunctionInvitationsApi,
  updateFunctionInvitationsApi,
  resetFunctionRsvpApi,
} from '../api/weddings';
import {
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Check,
  X,
  HelpCircle,
  Lock,
  UserPlus,
  UserMinus,
  RotateCcw,
} from 'lucide-react';

interface FunctionInvitationsModalProps {
  isOpen: boolean;
  weddingFunction: WeddingFunction | null;
  onClose: () => void;
  onInvitationsUpdated?: () => void;
}

type FilterTab = 'all' | 'invited' | 'not_invited' | 'replied' | 'stale';

export const FunctionInvitationsModal: React.FC<FunctionInvitationsModalProps> = ({
  isOpen,
  weddingFunction,
  onClose,
  onInvitationsUpdated,
}) => {
  const [households, setHouseholds] = useState<FunctionInvitationHousehold[]>([]);
  // Set of currently invited household IDs in UI state
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set());
  // Initial set of invited household IDs when modal fetched data
  const [initialInvitedIds, setInitialInvitedIds] = useState<Set<string>>(new Set());

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadInvitations = useCallback(async () => {
    if (!weddingFunction) return;

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const data = await getFunctionInvitationsApi(weddingFunction.id);
      setHouseholds(data);

      const invited = new Set(data.filter((h) => h.invited).map((h) => h.id));
      setInvitedIds(invited);
      setInitialInvitedIds(new Set(invited));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load invitations';
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  }, [weddingFunction]);

  useEffect(() => {
    if (isOpen && weddingFunction) {
      loadInvitations();
    } else {
      setHouseholds([]);
      setInvitedIds(new Set());
      setInitialInvitedIds(new Set());
      setSearchQuery('');
      setActiveTab('all');
      setErrorMsg(null);
      setSuccessMsg(null);
      setResettingId(null);
    }
  }, [isOpen, weddingFunction, loadInvitations]);

  // Compute pending delta changes
  const { toAdd, toRemove, hasChanges } = useMemo(() => {
    const add: string[] = [];
    const remove: string[] = [];

    for (const id of invitedIds) {
      if (!initialInvitedIds.has(id)) {
        add.push(id);
      }
    }

    for (const id of initialInvitedIds) {
      if (!invitedIds.has(id)) {
        remove.push(id);
      }
    }

    return {
      toAdd: add,
      toRemove: remove,
      hasChanges: add.length > 0 || remove.length > 0,
    };
  }, [invitedIds, initialInvitedIds]);

  // Summary counts
  const stats = useMemo(() => {
    let invitedCount = 0;
    let yesCount = 0;
    let yesGuests = 0;
    let noCount = 0;
    let maybeCount = 0;
    let repliedCount = 0;
    let staleCount = 0;

    for (const h of households) {
      const isInvited = invitedIds.has(h.id);
      if (isInvited) {
        invitedCount++;
      }
      if (isInvited && h.isStale) {
        staleCount++;
      }
      if (h.rsvpStatus === 'yes') {
        yesCount++;
        yesGuests += h.rsvpPartySize || h.expectedPartySize;
        repliedCount++;
      } else if (h.rsvpStatus === 'no') {
        noCount++;
        repliedCount++;
      } else if (h.rsvpStatus === 'maybe') {
        maybeCount++;
        repliedCount++;
      }
    }

    return {
      total: households.length,
      invitedCount,
      notInvitedCount: households.length - invitedCount,
      yesCount,
      yesGuests,
      noCount,
      maybeCount,
      repliedCount,
      staleCount,
    };
  }, [households, invitedIds]);

  // Filtered list
  const filteredHouseholds = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return households.filter((h) => {
      const isInvited = invitedIds.has(h.id);

      // Tab filter
      if (activeTab === 'invited' && !isInvited) return false;
      if (activeTab === 'not_invited' && isInvited) return false;
      if (activeTab === 'replied' && !h.rsvpStatus) return false;
      if (activeTab === 'stale' && (!isInvited || !h.isStale)) return false;

      // Search filter
      if (!q) return true;
      const matchName = h.name.toLowerCase().includes(q);
      const matchContact = h.primaryContactName.toLowerCase().includes(q);
      const matchPhone = h.phone.toLowerCase().includes(q);
      return matchName || matchContact || matchPhone;
    });
  }, [households, invitedIds, activeTab, searchQuery]);

  // Toggle single household invitation
  const handleToggle = (household: FunctionInvitationHousehold) => {
    if (household.rsvpStatus === 'yes' || household.rsvpStatus === 'maybe') {
      return;
    }

    setInvitedIds((prev) => {
      const next = new Set(prev);
      if (next.has(household.id)) {
        next.delete(household.id);
      } else {
        next.add(household.id);
      }
      return next;
    });
    setErrorMsg(null);
  };

  // Reset RSVP for a household to allow modifying or uninviting
  const handleResetRsvp = async (householdId: string) => {
    if (!weddingFunction) return;

    const confirmed = window.confirm(
      "Are you sure you want to reset this RSVP? This will erase the guest's response and cannot be undone."
    );
    if (!confirmed) return;

    setResettingId(householdId);
    setErrorMsg(null);

    try {
      await resetFunctionRsvpApi(weddingFunction.id, householdId);
      // Update local household record to pending
      setHouseholds((prev) =>
        prev.map((h) =>
          h.id === householdId ? { ...h, rsvpStatus: null, rsvpPartySize: null } : h
        )
      );
      setSuccessMsg('RSVP has been reset to pending. You can now modify the invitation.');
      if (onInvitationsUpdated) {
        onInvitationsUpdated();
      }
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to reset RSVP';
      setErrorMsg(msg);
    } finally {
      setResettingId(null);
    }
  };

  // Bulk invite visible uninvited
  const handleInviteVisible = () => {
    setInvitedIds((prev) => {
      const next = new Set(prev);
      for (const h of filteredHouseholds) {
        next.add(h.id);
      }
      return next;
    });
  };

  // Bulk uninvite visible (skips locked active headcounts)
  const handleUninviteVisibleNoReply = () => {
    setInvitedIds((prev) => {
      const next = new Set(prev);
      for (const h of filteredHouseholds) {
        if (h.rsvpStatus !== 'yes' && h.rsvpStatus !== 'maybe') {
          next.delete(h.id);
        }
      }
      return next;
    });
  };

  // Reset unsaved changes to original state
  const handleReset = () => {
    setInvitedIds(new Set(initialInvitedIds));
    setErrorMsg(null);
  };

  // Save changes via delta endpoint
  const handleSave = async () => {
    if (!weddingFunction || !hasChanges) return;

    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await updateFunctionInvitationsApi(weddingFunction.id, {
        add: toAdd,
        remove: toRemove,
      });

      setSuccessMsg(
        `Updated successfully! (+${res.addedCount} invited, -${res.removedCount} uninvited)`
      );
      setInitialInvitedIds(new Set(invitedIds));

      if (onInvitationsUpdated) {
        onInvitationsUpdated();
      }

      setTimeout(() => {
        setSuccessMsg(null);
      }, 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update invitations';
      setErrorMsg(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Manage Invitations: ${weddingFunction?.name || ''}`}
      subtitle={`${weddingFunction?.venue || ''} • Total Registry: ${stats.total} Households`}
      maxWidth="max-w-4xl"
    >
      <div className="space-y-4">
        {/* Metric Summary Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-[24px] bg-[#e4eff7] text-center border border-[#e4eff7]">
            <span className="text-[10px] font-medium uppercase tracking-wider text-[#85898b]">
              Invited Households
            </span>
            <p className="text-xl font-medium text-[#0a1217] mt-0.5">
              {stats.invitedCount}
              <span className="text-xs font-normal text-[#85898b]"> / {stats.total}</span>
            </p>
          </div>

          <div className="p-3.5 rounded-[24px] bg-[#0a1217] text-white text-center">
            <span className="text-[10px] font-medium uppercase tracking-wider text-[#85898b]">
              Confirmed (Yes)
            </span>
            <p className="text-xl font-medium text-white mt-0.5">
              {stats.yesCount}
              <span className="text-xs font-medium text-[#cdfe00]"> ({stats.yesGuests} guests)</span>
            </p>
          </div>

          <div className="p-3.5 rounded-[24px] bg-[#ffffff] border border-[#0a1217]/20 text-center">
            <span className="text-[10px] font-medium uppercase tracking-wider text-[#85898b]">
              Declined (No)
            </span>
            <p className="text-xl font-medium text-[#0a1217] mt-0.5">{stats.noCount}</p>
          </div>

          <div className="p-3.5 rounded-[24px] bg-[#ffffff] border border-[#000000] text-center">
            <span className="text-[10px] font-medium uppercase tracking-wider text-[#85898b]">
              Tentative (Maybe)
            </span>
            <p className="text-xl font-medium text-[#0a1217] mt-0.5">{stats.maybeCount}</p>
          </div>
        </div>

        {/* Notifications */}
        {errorMsg && (
          <div className="p-3.5 rounded-[24px] bg-[#e4eff7] border border-[#000000] flex items-start gap-2 text-[#0a1217] text-xs">
            <AlertCircle className="w-4 h-4 text-[#0a1217] flex-shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 rounded-[24px] bg-[#0a1217] text-white flex items-start gap-2 text-xs">
            <CheckCircle2 className="w-4 h-4 text-[#cdfe00] flex-shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Search & Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#85898b] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by household, contact, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-[#000000] rounded-[24px] text-xs text-[#0a1217] focus:outline-none transition-all placeholder:text-[#85898b]"
            />
          </div>

          {/* Filter Tabs - Full Pills */}
          <div className="flex items-center gap-1 p-1 bg-[#e4eff7] rounded-full text-xs font-medium text-[#85898b]">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1 rounded-full transition-all ${
                activeTab === 'all' ? 'bg-[#0a1217] text-white' : 'hover:text-[#0a1217]'
              }`}
            >
              All ({stats.total})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('invited')}
              className={`px-3 py-1 rounded-full transition-all ${
                activeTab === 'invited' ? 'bg-[#0a1217] text-white' : 'hover:text-[#0a1217]'
              }`}
            >
              Invited ({stats.invitedCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('not_invited')}
              className={`px-3 py-1 rounded-full transition-all ${
                activeTab === 'not_invited' ? 'bg-[#0a1217] text-white' : 'hover:text-[#0a1217]'
              }`}
            >
              Not Invited ({stats.notInvitedCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('replied')}
              className={`px-3 py-1 rounded-full transition-all ${
                activeTab === 'replied' ? 'bg-[#0a1217] text-white' : 'hover:text-[#0a1217]'
              }`}
            >
              Replied ({stats.repliedCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('stale')}
              className={`px-3 py-1 rounded-full transition-all ${
                activeTab === 'stale' ? 'bg-[#0a1217] text-white' : 'hover:text-[#0a1217]'
              }`}
            >
              Stale ({stats.staleCount})
            </button>
          </div>
        </div>

        {/* Quick Bulk Action Helpers */}
        <div className="flex items-center justify-between text-xs text-[#85898b] border-b border-[#0a1217]/10 pb-2">
          <span>
            Showing <strong className="text-[#0a1217]">{filteredHouseholds.length}</strong> households
          </span>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleInviteVisible}
              className="text-xs text-[#0a1217] hover:underline font-medium flex items-center gap-1 transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Invite Visible</span>
            </button>

            <span className="text-[#85898b]">•</span>

            <button
              type="button"
              onClick={handleUninviteVisibleNoReply}
              className="text-xs text-[#85898b] hover:text-[#0a1217] font-medium flex items-center gap-1 transition-colors"
              title="Only removes households that have not submitted an RSVP"
            >
              <UserMinus className="w-3.5 h-3.5" />
              <span>Uninvite Visible (No RSVP)</span>
            </button>
          </div>
        </div>

        {/* Household Invitation Checklist Table */}
        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center text-[#85898b] gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#0a1217]" />
            <span className="text-xs">Loading invitation assignments...</span>
          </div>
        ) : filteredHouseholds.length === 0 ? (
          <div className="py-12 text-center text-[#85898b] text-xs bg-[#e4eff7]/40 rounded-[24px] border border-[#e4eff7]">
            No households match your search or filter.
          </div>
        ) : (
          <div className="max-h-[380px] overflow-y-auto rounded-[24px] border border-[#000000]">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-[#e4eff7] sticky top-0 border-b border-[#000000] text-[10px] uppercase font-medium text-[#0a1217] z-10">
                <tr>
                  <th className="py-2.5 px-3.5 w-10 text-center">Invite</th>
                  <th className="py-2.5 px-3.5">Household Name</th>
                  <th className="py-2.5 px-3.5">Primary Contact</th>
                  <th className="py-2.5 px-3.5">Phone</th>
                  <th className="py-2.5 px-3.5 text-center">Party Size</th>
                  <th className="py-2.5 px-3.5 text-right">Reply Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#0a1217]/10 bg-white">
                {filteredHouseholds.map((h) => {
                  const isInvited = invitedIds.has(h.id);
                  const isLocked = h.rsvpStatus === 'yes' || h.rsvpStatus === 'maybe';

                  return (
                    <tr
                      key={h.id}
                      className={`transition-colors ${
                        isInvited ? 'bg-[#e4eff7]/20 hover:bg-[#e4eff7]/40' : 'hover:bg-slate-50/60'
                      }`}
                    >
                      {/* Checkbox / Lock indicator */}
                      <td className="py-2.5 px-3.5 text-center">
                        {isLocked ? (
                          <div
                            className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#0a1217] text-white cursor-not-allowed"
                            title={`Locked: Household has active attendance ('${h.rsvpStatus}'). To uninvite, click "Reset RSVP" on the right.`}
                          >
                            <Lock className="w-3 h-3" />
                          </div>
                        ) : (
                          <input
                            type="checkbox"
                            checked={isInvited}
                            onChange={() => handleToggle(h)}
                            className="w-4 h-4 rounded accent-[#0a1217] cursor-pointer"
                          />
                        )}
                      </td>

                      {/* Household Name */}
                      <td className="py-2.5 px-3.5 font-medium text-[#0a1217]">
                        {h.name}
                        {h.notes && (
                          <span className="block text-[10px] font-normal text-[#85898b] truncate max-w-xs">
                            {h.notes}
                          </span>
                        )}
                      </td>

                      {/* Primary Contact */}
                      <td className="py-2.5 px-3.5 text-[#85898b]">{h.primaryContactName}</td>

                      {/* Phone */}
                      <td className="py-2.5 px-3.5 text-[11px] text-[#85898b]">{h.phone}</td>

                      {/* Expected Party Size */}
                      <td className="py-2.5 px-3.5 text-center font-medium text-[#0a1217]">
                        {h.expectedPartySize}
                      </td>

                      {/* Reply Status Badge & Reset Action */}
                      <td className="py-2.5 px-3.5 text-right">
                        {h.rsvpStatus === 'yes' ? (
                          <div className="inline-flex items-center justify-end gap-1.5 flex-wrap">
                            {h.isStale && (
                              <span
                                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-[#e4eff7] text-[#0a1217] border border-[#0a1217]/20"
                                title={`RSVP submitted ${h.daysAgo} days ago without updates`}
                              >
                                Stale ({h.daysAgo}d)
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-medium bg-[#0a1217] text-white">
                              <Check className="w-3 h-3" />
                              <span>Attending ({h.rsvpPartySize || h.expectedPartySize})</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleResetRsvp(h.id)}
                              disabled={resettingId === h.id}
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium text-[#0a1217] border border-[#0a1217]/20 hover:border-[#0a1217] transition-colors disabled:opacity-50"
                              title="Reset RSVP to uninvite or modify"
                            >
                              {resettingId === h.id ? (
                                <Loader2 className="w-2.5 h-2.5 animate-spin" />
                              ) : (
                                <RotateCcw className="w-2.5 h-2.5" />
                              )}
                              <span>Reset</span>
                            </button>
                          </div>
                        ) : h.rsvpStatus === 'maybe' ? (
                          <div className="inline-flex items-center justify-end gap-1.5 flex-wrap">
                            {h.isStale && (
                              <span
                                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-[#e4eff7] text-[#0a1217] border border-[#0a1217]/20"
                                title={`RSVP submitted ${h.daysAgo} days ago without updates`}
                              >
                                Stale ({h.daysAgo}d)
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-medium bg-[#e4eff7] border border-[#0a1217] text-[#0a1217]">
                              <HelpCircle className="w-3 h-3" />
                              <span>Maybe</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleResetRsvp(h.id)}
                              disabled={resettingId === h.id}
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium text-[#0a1217] border border-[#0a1217]/20 hover:border-[#0a1217] transition-colors disabled:opacity-50"
                              title="Reset RSVP to uninvite or modify"
                            >
                              {resettingId === h.id ? (
                                <Loader2 className="w-2.5 h-2.5 animate-spin" />
                              ) : (
                                <RotateCcw className="w-2.5 h-2.5" />
                              )}
                              <span>Reset</span>
                            </button>
                          </div>
                        ) : h.rsvpStatus === 'no' ? (
                          <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-medium bg-[#85898b]/20 text-[#0a1217]">
                            <X className="w-3 h-3" />
                            <span>Declined</span>
                          </span>
                        ) : isInvited ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#e4eff7] text-[#0a1217]">
                            No Reply Yet
                          </span>
                        ) : (
                          <span className="text-xs text-[#85898b]">
                            Not Invited
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer / Save Bar */}
        <div className="pt-4 border-t border-[#0a1217]/10 flex items-center justify-between">
          <div>
            {hasChanges ? (
              <span className="text-xs font-medium text-[#0a1217] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#0a1217] animate-ping" />
                Unsaved changes: {toAdd.length > 0 && `+${toAdd.length} to invite`}{' '}
                {toRemove.length > 0 && `-${toRemove.length} to uninvite`}
              </span>
            ) : (
              <span className="text-xs text-[#85898b]">All invitation assignments saved.</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {hasChanges && (
              <button
                type="button"
                onClick={handleReset}
                disabled={isSaving}
                className="px-4 py-2 rounded-full text-xs font-medium text-[#0a1217] border border-[#0a1217]/20 hover:border-[#0a1217] flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Revert</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-5 py-2.5 rounded-full text-xs font-medium text-[#0a1217] border border-[#0a1217]/20 hover:border-[#0a1217] transition-colors disabled:opacity-50"
            >
              Close
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || !hasChanges}
              className="px-6 py-2.5 rounded-full bg-[#0a1217] hover:bg-[#0a1217]/90 text-white text-xs font-medium transition-all flex items-center gap-2 disabled:opacity-40"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Invitations</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

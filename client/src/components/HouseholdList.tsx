import React, { useState, useMemo } from 'react';
import { Household } from '../types/household';
import { deleteHouseholdApi, regenerateTokenApi } from '../api/households';
import {
  Search,
  Users,
  User,
  Phone,
  Link as LinkIcon,
  Check,
  Trash2,
  Plus,
  RefreshCw,
  MessageSquare,
} from 'lucide-react';

interface HouseholdListProps {
  weddingId: string;
  households: Household[];
  onHouseholdDeleted: (id: string) => void;
  onHouseholdUpdated?: (household: Household) => void;
  onOpenAddModal: () => void;
  onOpenImportModal?: () => void;
}

export const HouseholdList: React.FC<HouseholdListProps> = ({
  households,
  onHouseholdDeleted,
  onHouseholdUpdated,
  onOpenAddModal,
  onOpenImportModal,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);

  const filteredHouseholds = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return households;
    return households.filter(
      (h) =>
        h.name.toLowerCase().includes(term) ||
        h.primaryContactName.toLowerCase().includes(term) ||
        h.phone.includes(term)
    );
  }, [households, searchTerm]);

  const totalExpectedGuests = useMemo(() => {
    return households.reduce((sum, h) => sum + (h.expectedPartySize || 0), 0);
  }, [households]);

  const handleCopyLink = (token: string) => {
    const origin = window.location.origin;
    const url = `${origin}/rsvp/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => {
      setCopiedToken(null);
    }, 2000);
  };

  const handleWhatsAppShare = (household: Household) => {
    const origin = window.location.origin;
    const url = `${origin}/rsvp/${household.inviteToken}`;
    const message = `Namaste ${household.name}! You are cordially invited to our celebrations. Please confirm your attendance and meal preferences using your private Nyota RSVP link:\n\n${url}`;

    let cleanDigits = household.phone ? household.phone.replace(/\D/g, '') : '';
    // If standard 10-digit Indian mobile number without country code, prepend 91
    if (cleanDigits.length === 10) {
      cleanDigits = `91${cleanDigits}`;
    }

    const whatsappUrl = cleanDigits
      ? `https://wa.me/${cleanDigits}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;

    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  const handleRegenerateToken = async (household: Household) => {
    const confirmed = window.confirm(
      `Regenerate private RSVP link for "${household.name}"?\n\nThis will immediately invalidate and revoke the existing link. Any guest using the old link will get an Invitation Not Found error.`
    );
    if (!confirmed) return;

    setRegeneratingId(household.id);
    try {
      const res = await regenerateTokenApi(household.id);
      if (onHouseholdUpdated) {
        onHouseholdUpdated({
          ...household,
          inviteToken: res.inviteToken,
        });
      }
      const url = `${window.location.origin}/rsvp/${res.inviteToken}`;
      await navigator.clipboard.writeText(url);
      setCopiedToken(res.inviteToken);
      setTimeout(() => setCopiedToken(null), 3000);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to regenerate invite link');
    } finally {
      setRegeneratingId(null);
    }
  };

  const handleDelete = async (household: Household) => {
    const confirmed = window.confirm(
      `Remove "${household.name}"? This will delete all invitation links and RSVPs for this household.`
    );
    if (!confirmed) return;

    try {
      await deleteHouseholdApi(household.id);
      onHouseholdDeleted(household.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete household');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Bar: Summary Stats & Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-[#e4eff7] rounded-[24px] border border-[#0a1217]/10 p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-white text-[#0a1217] flex items-center justify-center border border-[#0a1217]/10">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-[#85898b]">Total Households</p>
            <p className="text-2xl font-medium text-[#0a1217] tabular-nums">{households.length}</p>
          </div>
        </div>

        <div className="bg-[#e4eff7] rounded-[24px] border border-[#0a1217]/10 p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-white text-[#0a1217] flex items-center justify-center border border-[#0a1217]/10">
            <User className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-[#85898b]">Expected Guests</p>
            <p className="text-2xl font-medium text-[#0a1217] tabular-nums">{totalExpectedGuests}</p>
          </div>
        </div>

        <div className="bg-white rounded-[24px] border border-[#0a1217]/10 p-4 flex items-center justify-end gap-2.5">
          {onOpenImportModal && (
            <button
              onClick={onOpenImportModal}
              className="px-4 py-2 rounded-full border border-[#0a1217]/20 text-[#0a1217] hover:bg-[#e4eff7] text-xs font-medium transition-colors cursor-pointer"
            >
              Import CSV
            </button>
          )}
          <button
            onClick={onOpenAddModal}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-[#0a1217] hover:opacity-90 text-white text-xs font-medium transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Household</span>
          </button>
        </div>
      </div>

      {/* Search Input Bar (24px radius, Obsidian outline) */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#85898b]">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by household name, contact person, or phone number..."
          className="w-full pl-11 pr-4 py-3 rounded-[24px] border border-[#000000] bg-white text-[#0a1217] text-sm placeholder:text-[#85898b] focus:outline-none transition-all"
        />
      </div>

      {/* Household Table / List */}
      {households.length === 0 ? (
        <div className="bg-[#e4eff7] rounded-[24px] border border-[#0a1217]/10 p-8 sm:p-14 text-center">
          <h3 className="font-serif text-2xl font-normal text-[#0a1217]">No guest households added yet</h3>
          <p className="text-[#85898b] text-sm max-w-sm mx-auto mt-2 mb-6">
            Add households individually or import a CSV list to start managing invitations and RSVP links.
          </p>
          <button
            onClick={onOpenAddModal}
            className="inline-flex items-center gap-1.5 px-6 py-3 rounded-full bg-[#0a1217] text-white text-xs sm:text-sm font-medium hover:opacity-90 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add First Household</span>
          </button>
        </div>
      ) : filteredHouseholds.length === 0 ? (
        <div className="bg-white rounded-[24px] border border-[#0a1217]/10 p-8 text-center text-[#85898b] text-sm">
          No households match your search query "{searchTerm}".
        </div>
      ) : (
        <div className="bg-white rounded-[24px] border border-[#0a1217]/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-[#0a1217]/10 bg-[#e4eff7]/40 text-[#85898b] font-medium uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-5">Household Name</th>
                  <th className="py-3.5 px-5">Primary Contact</th>
                  <th className="py-3.5 px-5 text-center">Party Size</th>
                  <th className="py-3.5 px-5">Private Invite Link</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#0a1217]/10 text-[#0a1217]">
                {filteredHouseholds.map((household) => {
                  const isCopied = copiedToken === household.inviteToken;
                  return (
                    <tr key={household.id} className="hover:bg-[#e4eff7]/20 transition-colors">
                      <td className="py-3.5 px-5 font-medium text-[#0a1217]">
                        <div>{household.name}</div>
                        {household.notes && (
                          <div className="text-[11px] font-normal text-[#85898b] truncate max-w-xs mt-0.5">
                            {household.notes}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-5">
                        <div className="font-normal text-[#0a1217]">{household.primaryContactName}</div>
                        <div className="text-[11px] text-[#85898b] flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-[#85898b]" />
                          <span>{household.phone}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-5 text-center">
                        <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-medium bg-[#e4eff7] text-[#0a1217] tabular-nums">
                          {household.expectedPartySize}
                        </span>
                      </td>
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleCopyLink(household.inviteToken)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border cursor-pointer ${
                              isCopied
                                ? 'bg-[#0a1217] text-white border-[#0a1217]'
                                : 'bg-white text-[#0a1217] border-[#0a1217]/20 hover:bg-[#e4eff7]'
                            }`}
                            title="Copy unique RSVP link for this household"
                          >
                            {isCopied ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-[#cdfe00]" />
                                <span>Copied Link</span>
                              </>
                            ) : (
                              <>
                                <LinkIcon className="w-3.5 h-3.5 text-[#85898b]" />
                                <span>Copy Link</span>
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => handleWhatsAppShare(household)}
                            className="p-1.5 rounded-full text-[#85898b] hover:text-[#0a1217] hover:bg-[#e4eff7] transition-colors cursor-pointer"
                            title="Share invite link via WhatsApp"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleRegenerateToken(household)}
                            disabled={regeneratingId === household.id}
                            className="p-1.5 rounded-full text-[#85898b] hover:text-[#0a1217] hover:bg-[#e4eff7] transition-colors cursor-pointer"
                            title="Revoke and regenerate new private invite link"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${regeneratingId === household.id ? 'animate-spin text-[#0a1217]' : ''}`} />
                          </button>
                        </div>
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <button
                          onClick={() => handleDelete(household)}
                          className="p-1.5 rounded-full text-[#85898b] hover:text-[#0a1217] hover:bg-[#e4eff7] transition-colors cursor-pointer"
                          title="Delete household"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

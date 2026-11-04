import React, { useState } from 'react';
import { Modal } from './Modal';
import { createHouseholdApi } from '../api/households';
import { Household } from '../types/household';
import { Users, User, Phone, Hash, FileText, AlertCircle, Loader2 } from 'lucide-react';

interface CreateHouseholdModalProps {
  isOpen: boolean;
  weddingId: string;
  onClose: () => void;
  onHouseholdCreated: (household: Household) => void;
}

export const CreateHouseholdModal: React.FC<CreateHouseholdModalProps> = ({
  isOpen,
  weddingId,
  onClose,
  onHouseholdCreated,
}) => {
  const [name, setName] = useState('');
  const [primaryContactName, setPrimaryContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [expectedPartySize, setExpectedPartySize] = useState<number>(2);
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanPhone = phone.replace(/[\s-]/g, '');

    if (!name || !primaryContactName || !cleanPhone) {
      setErrorMsg('Household name, contact name, and phone are required.');
      return;
    }

    if (!/^\+?[0-9]{7,15}$/.test(cleanPhone)) {
      setErrorMsg('Phone number must contain between 7 and 15 digits.');
      return;
    }

    if (expectedPartySize < 1 || expectedPartySize > 50) {
      setErrorMsg('Expected party size must be between 1 and 50.');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await createHouseholdApi(weddingId, {
        name: name.trim(),
        primaryContactName: primaryContactName.trim(),
        phone: cleanPhone,
        expectedPartySize,
        notes: notes.trim() || undefined,
      });

      setName('');
      setPrimaryContactName('');
      setPhone('');
      setExpectedPartySize(2);
      setNotes('');
      onHouseholdCreated(created);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add household';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Guest Household"
      subtitle="Register a family or group with a primary contact and expected attendance"
    >
      {errorMsg && (
        <div className="mb-4 p-3.5 rounded-[24px] bg-[#e4eff7] border border-[#000000] flex items-start gap-2.5 text-[#0a1217] text-xs">
          <AlertCircle className="w-4 h-4 text-[#0a1217] flex-shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-[#0a1217] uppercase tracking-wider mb-1.5">
            Household / Family Name
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#85898b]">
              <Users className="w-4 h-4" />
            </div>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Kapoor Family / Sharma Household"
              className="w-full pl-11 pr-4 py-2.5 rounded-[24px] border border-[#000000] text-[#0a1217] text-sm bg-white focus:outline-none placeholder:text-[#85898b]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-[#0a1217] uppercase tracking-wider mb-1.5">
              Primary Contact Person
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#85898b]">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={primaryContactName}
                onChange={(e) => setPrimaryContactName(e.target.value)}
                placeholder="e.g. Anil Kapoor"
                className="w-full pl-11 pr-4 py-2.5 rounded-[24px] border border-[#000000] text-[#0a1217] text-sm bg-white focus:outline-none placeholder:text-[#85898b]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#0a1217] uppercase tracking-wider mb-1.5">
              Phone Number
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#85898b]">
                <Phone className="w-4 h-4" />
              </div>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full pl-11 pr-4 py-2.5 rounded-[24px] border border-[#000000] text-[#0a1217] text-sm bg-white focus:outline-none placeholder:text-[#85898b]"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-[#0a1217] uppercase tracking-wider mb-1.5">
            Expected Party Size
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#85898b]">
              <Hash className="w-4 h-4" />
            </div>
            <input
              type="number"
              min={1}
              max={50}
              required
              value={expectedPartySize}
              onChange={(e) => setExpectedPartySize(parseInt(e.target.value) || 1)}
              className="w-full pl-11 pr-4 py-2.5 rounded-[24px] border border-[#000000] text-[#0a1217] text-sm bg-white focus:outline-none"
            />
          </div>
          <span className="text-[11px] text-[#85898b] mt-1.5 block">
            Estimated number of attendees for initial catering planning.
          </span>
        </div>

        <div>
          <label className="block text-xs font-medium text-[#0a1217] uppercase tracking-wider mb-1.5">
            Internal Notes (Optional)
          </label>
          <div className="relative">
            <div className="absolute top-3 left-4 flex items-center pointer-events-none text-[#85898b]">
              <FileText className="w-4 h-4" />
            </div>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. VIP groom side, requires ground-floor room"
              className="w-full pl-11 pr-4 py-2.5 rounded-[24px] border border-[#000000] text-[#0a1217] text-sm bg-white focus:outline-none resize-none placeholder:text-[#85898b]"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#0a1217]/10">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-full text-xs font-medium text-[#0a1217] border border-[#0a1217]/20 hover:border-[#0a1217] transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-full bg-[#0a1217] hover:bg-[#0a1217]/90 text-white text-xs font-medium transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <span>Add Household</span>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

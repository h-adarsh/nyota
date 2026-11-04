import React, { useState } from 'react';
import { Modal } from './Modal';
import { createFunctionApi } from '../api/weddings';
import { WeddingFunction } from '../types/wedding';
import { CalendarHeart, MapPin, Clock, AlertCircle, Loader2 } from 'lucide-react';

interface CreateFunctionModalProps {
  isOpen: boolean;
  weddingId: string;
  onClose: () => void;
  onFunctionCreated: (fn: WeddingFunction) => void;
}

const COMMON_PRESETS = ['Haldi', 'Mehendi', 'Sangeet', 'Wedding Ceremony', 'Reception', 'Cocktail Night'];

export const CreateFunctionModal: React.FC<CreateFunctionModalProps> = ({
  isOpen,
  weddingId,
  onClose,
  onFunctionCreated,
}) => {
  const [name, setName] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [venue, setVenue] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name || !dateTime || !venue) {
      setErrorMsg('All fields are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await createFunctionApi(weddingId, {
        name: name.trim(),
        dateTime,
        venue: venue.trim(),
      });

      setName('');
      setDateTime('');
      setVenue('');
      onFunctionCreated(created);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add function';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Wedding Function"
      subtitle="Configure an individual event (Mehendi, Sangeet, Ceremony, Reception)"
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
            Function Name
          </label>
          <div className="relative mb-2.5">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#85898b]">
              <CalendarHeart className="w-4 h-4" />
            </div>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sangeet & Cocktail"
              className="w-full pl-11 pr-4 py-2.5 rounded-[24px] border border-[#000000] text-[#0a1217] text-sm bg-white focus:outline-none placeholder:text-[#85898b]"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {COMMON_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setName(preset)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  name === preset
                    ? 'bg-[#0a1217] text-white'
                    : 'bg-[#e4eff7] text-[#0a1217] hover:bg-[#0a1217]/10'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-[#0a1217] uppercase tracking-wider mb-1.5">
            Date & Scheduled Time
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#85898b]">
              <Clock className="w-4 h-4" />
            </div>
            <input
              type="datetime-local"
              required
              value={dateTime}
              onChange={(e) => setDateTime(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 rounded-[24px] border border-[#000000] text-[#0a1217] text-sm bg-white focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-[#0a1217] uppercase tracking-wider mb-1.5">
            Venue / Hall Location
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#85898b]">
              <MapPin className="w-4 h-4" />
            </div>
            <input
              type="text"
              required
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              placeholder="e.g. The Grand Ballroom / Poolside Lawn"
              className="w-full pl-11 pr-4 py-2.5 rounded-[24px] border border-[#000000] text-[#0a1217] text-sm bg-white focus:outline-none placeholder:text-[#85898b]"
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
              <span>Add Function</span>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

import React, { useState } from 'react';
import { Modal } from './Modal';
import { createWeddingApi } from '../api/weddings';
import { Wedding } from '../types/wedding';
import { CalendarHeart, Users, Calendar, AlertCircle, Loader2, Globe } from 'lucide-react';

interface CreateWeddingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWeddingCreated: (wedding: Wedding) => void;
}

const TIMEZONE_OPTIONS = [
  { value: 'Asia/Kolkata', label: 'India Standard Time (IST — Asia/Kolkata)' },
  { value: 'Asia/Dubai', label: 'Gulf Standard Time (GST — Asia/Dubai)' },
  { value: 'Asia/Singapore', label: 'Singapore Time (SGT — Asia/Singapore)' },
  { value: 'Asia/Bangkok', label: 'Indochina Time (ICT — Asia/Bangkok)' },
  { value: 'Europe/London', label: 'UK / London (GMT/BST — Europe/London)' },
  { value: 'Europe/Paris', label: 'Central European Time (CET — Europe/Paris)' },
  { value: 'America/New_York', label: 'US Eastern (EST/EDT — America/New_York)' },
  { value: 'America/Chicago', label: 'US Central (CST/CDT — America/Chicago)' },
  { value: 'America/Los_Angeles', label: 'US Pacific (PST/PDT — America/Los_Angeles)' },
  { value: 'Australia/Sydney', label: 'Australia Eastern (AEST — Australia/Sydney)' },
];

export const CreateWeddingModal: React.FC<CreateWeddingModalProps> = ({
  isOpen,
  onClose,
  onWeddingCreated,
}) => {
  const [title, setTitle] = useState('');
  const [coupleNames, setCoupleNames] = useState('');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!title || !coupleNames || !startDate || !endDate) {
      setErrorMsg('All fields are required.');
      return;
    }

    if (endDate < startDate) {
      setErrorMsg('Wedding end date must be on or after start date.');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await createWeddingApi({
        title: title.trim(),
        coupleNames: coupleNames.trim(),
        timezone,
        startDate,
        endDate,
      });

      // Reset form state
      setTitle('');
      setCoupleNames('');
      setTimezone('Asia/Kolkata');
      setStartDate('');
      setEndDate('');
      onWeddingCreated(created);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create wedding';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Wedding"
      subtitle="Set up event details and date ranges for your celebrations"
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
            Wedding Title
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#85898b]">
              <CalendarHeart className="w-4 h-4" />
            </div>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Aditi & Rahul's Wedding"
              className="w-full pl-11 pr-4 py-2.5 rounded-[24px] border border-[#000000] text-[#0a1217] text-sm bg-white focus:outline-none placeholder:text-[#85898b]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-[#0a1217] uppercase tracking-wider mb-1.5">
            Couple Names
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#85898b]">
              <Users className="w-4 h-4" />
            </div>
            <input
              type="text"
              required
              value={coupleNames}
              onChange={(e) => setCoupleNames(e.target.value)}
              placeholder="e.g. Aditi Sharma & Rahul Verma"
              className="w-full pl-11 pr-4 py-2.5 rounded-[24px] border border-[#000000] text-[#0a1217] text-sm bg-white focus:outline-none placeholder:text-[#85898b]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-[#0a1217] uppercase tracking-wider mb-1.5">
            Wedding Timezone
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#85898b]">
              <Globe className="w-4 h-4" />
            </div>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 rounded-[24px] border border-[#000000] text-[#0a1217] text-sm bg-white focus:outline-none appearance-none"
            >
              {TIMEZONE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <p className="text-[11px] text-[#85898b] mt-1.5">
            All guest invitation times and schedules will be formatted in this timezone.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-[#0a1217] uppercase tracking-wider mb-1.5">
              Start Date
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#85898b]">
                <Calendar className="w-4 h-4" />
              </div>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 rounded-[24px] border border-[#000000] text-[#0a1217] text-sm bg-white focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#0a1217] uppercase tracking-wider mb-1.5">
              End Date
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#85898b]">
                <Calendar className="w-4 h-4" />
              </div>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 rounded-[24px] border border-[#000000] text-[#0a1217] text-sm bg-white focus:outline-none"
              />
            </div>
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
                <span>Creating...</span>
              </>
            ) : (
              <span>Create Wedding</span>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

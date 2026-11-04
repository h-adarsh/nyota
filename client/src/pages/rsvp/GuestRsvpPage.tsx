import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  Calendar,
  MapPin,
  Users,
  Utensils,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Edit3,
  Clock,
  X,
  Check,
} from 'lucide-react';
import { getInvitationByToken, submitRsvpApi } from '../../api/rsvp';
import { PublicRsvpLookupResponse, RsvpSubmissionItem } from '../../types/rsvp';

interface FunctionFormState {
  functionId: string;
  status: 'yes' | 'no' | 'maybe' | '';
  partySize: number;
  vegCount: number;
  nonvegCount: number;
  dietaryNotes: string;
  touched: boolean;
}

export const GuestRsvpPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [invitationData, setInvitationData] = useState<PublicRsvpLookupResponse | null>(null);

  // Form states keyed by functionId
  const [formResponses, setFormResponses] = useState<Record<string, FunctionFormState>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const submitErrorRef = useRef<HTMLDivElement>(null);
  const [isSubmittedSuccess, setIsSubmittedSuccess] = useState(false);
  const [hasExistingReplies, setHasExistingReplies] = useState(false);

  // Load invitation details by token
  useEffect(() => {
    if (!token) {
      setErrorMsg('No invitation token provided. Please check your link.');
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setErrorMsg(null);

    getInvitationByToken(token)
      .then((data) => {
        if (!isMounted) return;
        setInvitationData(data);

        // Prepopulate form responses
        const initialStates: Record<string, FunctionFormState> = {};
        let anyResponded = false;

        data.functions.forEach((fn) => {
          const defaultStatus: 'yes' | 'no' | 'maybe' | '' =
            fn.rsvpStatus === 'yes' || fn.rsvpStatus === 'no' || fn.rsvpStatus === 'maybe'
              ? fn.rsvpStatus
              : '';
          const hasReplied = defaultStatus !== '';
          if (hasReplied) anyResponded = true;

          const defaultParty = hasReplied
            ? fn.partySize
            : data.household.expectedPartySize || 1;
          const defaultVeg = hasReplied ? fn.vegCount : defaultParty;
          const defaultNonveg = hasReplied ? fn.nonvegCount : 0;

          initialStates[fn.id] = {
            functionId: fn.id,
            status: defaultStatus,
            partySize: defaultStatus === 'no' ? 0 : defaultParty,
            vegCount: defaultStatus === 'no' ? 0 : defaultVeg,
            nonvegCount: defaultStatus === 'no' ? 0 : defaultNonveg,
            dietaryNotes: fn.dietaryNotes || '',
            touched: false,
          };
        });

        setFormResponses(initialStates);
        setHasExistingReplies(anyResponded);
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        const msg = err instanceof Error ? err.message : 'Unable to load invitation details.';
        setErrorMsg(msg);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [token]);

  // Update a single field in a function's response state
  const handleUpdate = (
    functionId: string,
    updates: Partial<FunctionFormState>
  ) => {
    setFormResponses((prev) => {
      const current = prev[functionId];
      if (!current) return prev;

      const next = { ...current, ...updates, touched: true };

      // When switching to 'no', partySize and meals automatically become 0
      if (updates.status === 'no') {
        next.partySize = 0;
        next.vegCount = 0;
        next.nonvegCount = 0;
      } else if (updates.status === 'yes' && current.partySize === 0) {
        // Restore party size if it was 0
        const defaultParty = invitationData?.household.expectedPartySize || 1;
        next.partySize = defaultParty;
        next.vegCount = defaultParty;
        next.nonvegCount = 0;
      }

      return {
        ...prev,
        [functionId]: next,
      };
    });
  };

  // Helper: auto-balance non-veg when party size changes
  const handlePartySizeChange = (functionId: string, newPartySize: number) => {
    const clamped = Math.max(0, Math.min(50, newPartySize));
    setFormResponses((prev) => {
      const current = prev[functionId];
      if (!current) return prev;

      let newVeg = current.vegCount;
      let newNonveg = current.nonvegCount;

      if (newVeg + newNonveg !== clamped) {
        newVeg = clamped;
        newNonveg = 0;
      }

      return {
        ...prev,
        [functionId]: {
          ...current,
          partySize: clamped,
          vegCount: newVeg,
          nonvegCount: newNonveg,
          touched: true,
        },
      };
    });
  };

  // Validation checker for the entire form
  const getValidationErrors = (): string[] => {
    if (!invitationData) return ['Invitation details missing'];

    const errors: string[] = [];

    invitationData.functions.forEach((fn) => {
      const resp = formResponses[fn.id];
      if (!resp || !resp.status) {
        errors.push(`Please choose an answer for "${fn.name}"`);
        return;
      }

      if (resp.status === 'yes') {
        if (resp.partySize < 1) {
          errors.push(`Party size for "${fn.name}" must be at least 1`);
        }
        if (resp.vegCount + resp.nonvegCount !== resp.partySize) {
          errors.push(
            `In "${fn.name}", Vegetarian (${resp.vegCount}) + Non-Vegetarian (${resp.nonvegCount}) must equal total attending guests (${resp.partySize})`
          );
        }
      }
    });

    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !invitationData || isSubmitting) return;

    setSubmitError(null);

    // Mark all as touched to display validation indicators
    setFormResponses((prev) => {
      const next: Record<string, FunctionFormState> = {};
      Object.keys(prev).forEach((k) => {
        next[k] = { ...prev[k], touched: true };
      });
      return next;
    });

    const errors = getValidationErrors();
    if (errors.length > 0) {
      setSubmitError(errors[0]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const payloadResponses: RsvpSubmissionItem[] = invitationData.functions.map((fn) => {
      const resp = formResponses[fn.id];
      return {
        functionId: fn.id,
        status: resp.status as 'yes' | 'no' | 'maybe',
        partySize: resp.status === 'no' ? 0 : resp.partySize,
        vegCount: resp.status === 'no' ? 0 : resp.vegCount,
        nonvegCount: resp.status === 'no' ? 0 : resp.nonvegCount,
        dietaryNotes: resp.dietaryNotes.trim() ? resp.dietaryNotes.trim() : null,
      };
    });

    setIsSubmitting(true);
    try {
      await submitRsvpApi(token, { responses: payloadResponses });
      setIsSubmittedSuccess(true);
      setHasExistingReplies(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit your RSVP. Please try again.';
      setSubmitError(msg);
      setTimeout(() => {
        submitErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 1. Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-[#ffffff] flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-[#e4eff7] rounded-[24px] border border-[#0a1217]/10 p-8 text-center space-y-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#0a1217] text-white mx-auto">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
          <div>
            <h2 className="text-xl font-medium text-[#0a1217] tracking-tight">Loading Invitation</h2>
            <p className="text-[#85898b] text-sm mt-1">Retrieving wedding functions and RSVP details...</p>
          </div>
        </div>
      </div>
    );
  }

  // 2. Error / Not Found State
  if (errorMsg || !invitationData) {
    return (
      <div className="min-h-screen bg-[#ffffff] flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg bg-[#ffffff] rounded-[24px] border border-[#000000] p-8 sm:p-10 text-center space-y-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#e4eff7] text-[#0a1217] mx-auto border border-[#0a1217]/10">
            <AlertCircle className="w-7 h-7" />
          </div>
          <div>
            <span className="text-[11px] uppercase tracking-[0.2em] text-[#85898b] font-medium">Link Notice</span>
            <h2 className="text-2xl font-serif font-normal text-[#0a1217] mt-1">Invitation Unavailable</h2>
            <p className="text-[#85898b] text-sm mt-3 leading-relaxed">
              {errorMsg || 'We were unable to locate your invitation. The private link may have expired or been regenerated.'}
            </p>
          </div>
          <div className="p-4 rounded-[24px] bg-[#e4eff7] border border-[#e4eff7] text-left text-xs text-[#0a1217] leading-relaxed">
            <p className="font-medium text-[#0a1217] mb-1">What can you do?</p>
            <ul className="list-disc list-inside space-y-1 text-[#85898b]">
              <li>Make sure you opened the complete link shared via WhatsApp or SMS.</li>
              <li>Contact the couple or wedding host to request an updated invite link.</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  const { household, wedding, functions } = invitationData;

  // 3. Confirmation View
  if (isSubmittedSuccess) {
    return (
      <div className="min-h-screen bg-[#ffffff] py-10 sm:py-16 px-4 sm:px-6">
        <div className="max-w-xl mx-auto space-y-8">
          {/* Sana Dark Showcase Confirmation Card */}
          <div className="bg-[#0a1217] text-white rounded-[24px] p-8 sm:p-10 space-y-4 relative overflow-hidden">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#cdfe00] text-[#0a1217] uppercase tracking-wider">
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              RSVP Recorded
            </div>
            <div>
              <h1 className="font-serif font-normal text-3xl sm:text-5xl text-white tracking-tight leading-[1.1]">
                Thank you, {household.name}.
              </h1>
              <p className="text-[#85898b] text-sm sm:text-base mt-2">
                Your response for <span className="text-white font-medium">{wedding.coupleNames}&apos;s</span> celebration has been confirmed.
              </p>
            </div>
          </div>

          {/* Response Summary Card */}
          <div className="bg-[#e4eff7] rounded-[24px] border border-[#e4eff7] p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-[#0a1217] uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#0a1217]" />
                Summary of Responses
              </h2>
              <span className="text-xs text-[#85898b]">{functions.length} {functions.length === 1 ? 'event' : 'events'}</span>
            </div>

            <div className="space-y-3">
              {functions.map((fn) => {
                const resp = formResponses[fn.id];
                const dateObj = new Date(fn.dateTime);
                const timeZone = invitationData?.wedding.timezone || 'Asia/Kolkata';
                const formattedDate = dateObj.toLocaleDateString('en-IN', {
                  timeZone,
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                });
                const formattedTime = dateObj.toLocaleTimeString('en-IN', {
                  timeZone,
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true,
                });

                return (
                  <div
                    key={fn.id}
                    className="p-5 rounded-[24px] bg-[#ffffff] border border-[#0a1217]/10 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-medium text-[#0a1217] text-base">{fn.name}</h3>
                        <p className="text-[#85898b] text-xs mt-0.5">
                          {formattedDate} • {formattedTime}
                        </p>
                        {fn.venue && (
                          <p className="text-[#85898b] text-xs flex items-center gap-1 mt-1">
                            <MapPin className="w-3 h-3 text-[#85898b]" />
                            {fn.venue}
                          </p>
                        )}
                      </div>

                      {resp?.status === 'yes' && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-[#0a1217] text-white">
                          Attending ({resp.partySize})
                        </span>
                      )}
                      {resp?.status === 'no' && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-[#85898b]/20 text-[#0a1217]">
                          Declined
                        </span>
                      )}
                      {resp?.status === 'maybe' && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-[#ffffff] border border-[#0a1217] text-[#0a1217]">
                          Tentative ({resp.partySize || '0'})
                        </span>
                      )}
                    </div>

                    {resp?.status === 'yes' && (
                      <div className="pt-2 border-t border-[#0a1217]/10 flex flex-wrap gap-4 text-xs text-[#0a1217]">
                        <span>🌱 <strong>{resp.vegCount}</strong> Veg</span>
                        <span>🍗 <strong>{resp.nonvegCount}</strong> Non-Veg</span>
                        {resp.dietaryNotes && (
                          <span className="w-full text-[#85898b] italic">
                            Note: &ldquo;{resp.dietaryNotes}&rdquo;
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsSubmittedSuccess(false)}
                className="w-full min-h-[48px] py-3 px-6 rounded-full border border-[#0a1217] text-[#0a1217] bg-[#ffffff] hover:bg-[#0a1217] hover:text-white transition-all text-sm font-medium flex items-center justify-center gap-2"
              >
                <Edit3 className="w-4 h-4" />
                Edit or Change Responses
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 4. Main RSVP Form View
  return (
    <div className="min-h-screen bg-[#ffffff] py-8 sm:py-16 px-4 sm:px-6">
      <div className="max-w-xl mx-auto space-y-8">
        {/* Editorial Header */}
        <header className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#e4eff7] text-[#0a1217] text-xs font-medium uppercase tracking-[0.15em]">
            Nyota • Invitation
          </div>

          <h1 className="font-serif font-normal text-4xl sm:text-6xl text-[#0a1217] leading-[1.08] tracking-tight">
            {wedding.coupleNames}
          </h1>

          {wedding.title && (
            <p className="text-[#85898b] text-base">{wedding.title}</p>
          )}

          {/* Household Card */}
          <div className="mt-6 rounded-[24px] bg-[#e4eff7] p-5 sm:p-6 border border-[#e4eff7] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-left">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-[#85898b] font-medium block">Invited Household</span>
              <span className="text-lg font-medium text-[#0a1217]">{household.name}</span>
            </div>
            {household.expectedPartySize > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#ffffff] border border-[#0a1217]/10 text-xs font-medium text-[#0a1217]">
                <Users className="w-3.5 h-3.5 text-[#85898b]" />
                Up to {household.expectedPartySize} guests
              </span>
            )}
          </div>

          {/* Return-to-edit notice */}
          {hasExistingReplies && (
            <div className="rounded-[24px] bg-[#0a1217] text-white p-4 text-xs flex items-center justify-center gap-2 text-center">
              <span className="w-2 h-2 rounded-full bg-[#cdfe00] flex-shrink-0" />
              <span>You previously submitted an RSVP. You can update your answers anytime below.</span>
            </div>
          )}
        </header>

        {/* Global Error Banner */}
        {submitError && (
          <div className="p-4 rounded-[24px] bg-[#e4eff7] border border-[#000000] text-[#0a1217] text-xs sm:text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-[#0a1217] flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Please check your responses:</p>
              <p className="mt-0.5 text-[#85898b]">{submitError}</p>
            </div>
          </div>
        )}

        {functions.length === 0 ? (
          <div className="bg-[#e4eff7] rounded-[24px] border border-[#e4eff7] p-8 sm:p-10 text-center space-y-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#0a1217] text-white mb-1">
              <Calendar className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-medium text-[#0a1217] tracking-tight">No Events Assigned Yet</h2>
            <p className="text-[#85898b] text-sm leading-relaxed max-w-sm mx-auto">
              Your household invitation is confirmed, but specific events have not yet been assigned to your invite. Please check back soon or contact <span className="font-medium text-[#0a1217]">{wedding.coupleNames}</span>.
            </p>
          </div>
        ) : (
          /* Form Body */
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-xs font-medium text-[#85898b] uppercase tracking-wider">
                  Functions ({functions.length})
                </h2>
                <span className="text-xs text-[#85898b]">Required for each event</span>
              </div>

              {functions.map((fn, idx) => {
                const resp = formResponses[fn.id] || {
                  functionId: fn.id,
                  status: '',
                  partySize: 1,
                  vegCount: 1,
                  nonvegCount: 0,
                  dietaryNotes: '',
                  touched: false,
                };

                const dateObj = new Date(fn.dateTime);
                const timeZone = invitationData?.wedding.timezone || 'Asia/Kolkata';
                const formattedDate = dateObj.toLocaleDateString('en-IN', {
                  timeZone,
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                });
                const formattedTime = dateObj.toLocaleTimeString('en-IN', {
                  timeZone,
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true,
                });

                const isMealMatch =
                  resp.status === 'yes'
                    ? resp.vegCount + resp.nonvegCount === resp.partySize
                    : true;

                return (
                  <div
                    key={fn.id}
                    className={`rounded-[24px] bg-[#ffffff] border transition-all p-6 sm:p-8 space-y-6 ${
                      resp.status
                        ? 'border-[#0a1217]'
                        : 'border-[#0a1217]/20'
                    }`}
                  >
                    {/* Event Details */}
                    <div>
                      <div className="text-[11px] font-medium uppercase tracking-[0.15em] text-[#85898b] mb-1">
                        Event {idx + 1}
                      </div>
                      <h3 className="text-xl sm:text-2xl font-medium text-[#0a1217] tracking-tight">
                        {fn.name}
                      </h3>
                      <div className="mt-2 space-y-1 text-xs text-[#85898b]">
                        <p className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-[#0a1217]" />
                          <span>{formattedDate} at {formattedTime}</span>
                        </p>
                        {fn.venue && (
                          <p className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-[#0a1217]" />
                            <span>{fn.venue}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Attendance Selector (Yes / No / Maybe) - Full Pills */}
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-[#0a1217] uppercase tracking-wider">
                        Will you attend?
                      </label>

                      <div className="grid grid-cols-3 gap-2 sm:gap-3">
                        {/* Yes Button */}
                        <button
                          type="button"
                          onClick={() => handleUpdate(fn.id, { status: 'yes' })}
                          className={`min-h-[48px] py-2.5 px-3 rounded-full border text-xs sm:text-sm font-medium flex items-center justify-center gap-1.5 transition-all ${
                            resp.status === 'yes'
                              ? 'bg-[#0a1217] text-white border-[#0a1217]'
                              : 'bg-[#ffffff] text-[#0a1217] border-[#0a1217]/25 hover:border-[#0a1217]'
                          }`}
                        >
                          <Check className="w-4 h-4 flex-shrink-0" />
                          <span>Attending</span>
                        </button>

                        {/* No Button */}
                        <button
                          type="button"
                          onClick={() => handleUpdate(fn.id, { status: 'no' })}
                          className={`min-h-[48px] py-2.5 px-3 rounded-full border text-xs sm:text-sm font-medium flex items-center justify-center gap-1.5 transition-all ${
                            resp.status === 'no'
                              ? 'bg-[#85898b] text-white border-[#85898b]'
                              : 'bg-[#ffffff] text-[#0a1217] border-[#0a1217]/25 hover:border-[#0a1217]'
                          }`}
                        >
                          <X className="w-4 h-4 flex-shrink-0" />
                          <span>Decline</span>
                        </button>

                        {/* Maybe Button */}
                        <button
                          type="button"
                          onClick={() => handleUpdate(fn.id, { status: 'maybe' })}
                          className={`min-h-[48px] py-2.5 px-3 rounded-full border text-xs sm:text-sm font-medium flex items-center justify-center gap-1.5 transition-all ${
                            resp.status === 'maybe'
                              ? 'bg-[#e4eff7] text-[#0a1217] border-[#0a1217]'
                              : 'bg-[#ffffff] text-[#0a1217] border-[#0a1217]/25 hover:border-[#0a1217]'
                          }`}
                        >
                          <Clock className="w-4 h-4 flex-shrink-0" />
                          <span>Tentative</span>
                        </button>
                      </div>

                      {resp.touched && !resp.status && (
                        <p className="text-xs text-[#0a1217] font-medium mt-1">
                          Please select one option above.
                        </p>
                      )}
                    </div>

                    {/* Attending Details Section (Shown when status is 'yes') */}
                    {resp.status === 'yes' && (
                      <div className="pt-4 border-t border-[#0a1217]/10 space-y-5">
                        {/* Party Size Stepper */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-medium text-[#0a1217] uppercase tracking-wider flex items-center gap-1.5">
                              <Users className="w-3.5 h-3.5 text-[#0a1217]" />
                              Attending Headcount
                            </label>
                            <span className="text-xs text-[#85898b]">Max 50</span>
                          </div>

                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => handlePartySizeChange(fn.id, resp.partySize - 1)}
                              disabled={resp.partySize <= 1}
                              className="w-11 h-11 rounded-full bg-[#e4eff7] hover:bg-[#0a1217] hover:text-white active:scale-95 text-[#0a1217] font-medium text-lg disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center border border-[#0a1217]/10"
                              aria-label="Decrease party size"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min="1"
                              max="50"
                              inputMode="numeric"
                              value={resp.partySize}
                              onChange={(e) =>
                                handlePartySizeChange(fn.id, parseInt(e.target.value, 10) || 1)
                              }
                              className="flex-1 h-11 text-center font-medium text-lg rounded-[24px] border border-[#000000] bg-white text-[#0a1217] focus:outline-none transition-all"
                              aria-label="Party size number"
                            />
                            <button
                              type="button"
                              onClick={() => handlePartySizeChange(fn.id, resp.partySize + 1)}
                              disabled={resp.partySize >= 50}
                              className="w-11 h-11 rounded-full bg-[#e4eff7] hover:bg-[#0a1217] hover:text-white active:scale-95 text-[#0a1217] font-medium text-lg disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center border border-[#0a1217]/10"
                              aria-label="Increase party size"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* Dietary Preferences (Veg & Non-Veg) */}
                        <div className="p-5 rounded-[24px] bg-[#e4eff7] space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-medium text-[#0a1217] uppercase tracking-wider flex items-center gap-1.5">
                              <Utensils className="w-3.5 h-3.5 text-[#0a1217]" />
                              Meal Distribution
                            </label>
                            <span
                              className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${
                                isMealMatch
                                  ? 'bg-[#0a1217] text-white'
                                  : 'bg-[#ffffff] text-[#0a1217] border border-[#0a1217]'
                              }`}
                            >
                              {isMealMatch
                                ? `✓ ${resp.partySize} / ${resp.partySize} accounted for`
                                : `⚠️ Total: ${resp.vegCount + resp.nonvegCount} of ${resp.partySize}`}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            {/* Vegetarian Input */}
                            <div className="p-3.5 rounded-[24px] bg-[#ffffff] border border-[#0a1217]/10">
                              <label className="block text-xs font-medium text-[#0a1217] mb-1">
                                🌱 Vegetarian
                              </label>
                              <input
                                type="number"
                                min="0"
                                max={resp.partySize}
                                inputMode="numeric"
                                value={resp.vegCount}
                                onChange={(e) => {
                                  const v = Math.max(0, parseInt(e.target.value, 10) || 0);
                                  handleUpdate(fn.id, { vegCount: v });
                                }}
                                className="w-full h-10 px-3 font-medium text-base rounded-[24px] border border-[#000000] bg-white text-[#0a1217] focus:outline-none transition-all text-center"
                              />
                            </div>

                            {/* Non-Vegetarian Input */}
                            <div className="p-3.5 rounded-[24px] bg-[#ffffff] border border-[#0a1217]/10">
                              <label className="block text-xs font-medium text-[#0a1217] mb-1">
                                🍗 Non-Vegetarian
                              </label>
                              <input
                                type="number"
                                min="0"
                                max={resp.partySize}
                                inputMode="numeric"
                                value={resp.nonvegCount}
                                onChange={(e) => {
                                  const nv = Math.max(0, parseInt(e.target.value, 10) || 0);
                                  handleUpdate(fn.id, { nonvegCount: nv });
                                }}
                                className="w-full h-10 px-3 font-medium text-base rounded-[24px] border border-[#000000] bg-white text-[#0a1217] focus:outline-none transition-all text-center"
                              />
                            </div>
                          </div>

                          {!isMealMatch && (
                            <p className="text-xs text-[#0a1217] font-medium pt-1">
                              {resp.vegCount + resp.nonvegCount < resp.partySize
                                ? `Please assign ${resp.partySize - (resp.vegCount + resp.nonvegCount)} more meal(s) between Veg and Non-Veg.`
                                : `Meal count (${resp.vegCount + resp.nonvegCount}) exceeds headcount (${resp.partySize}) by ${resp.vegCount + resp.nonvegCount - resp.partySize}.`}
                            </p>
                          )}
                        </div>

                        {/* Dietary Notes */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs font-medium text-[#0a1217] uppercase tracking-wider">
                              Special Dietary Requests (Optional)
                            </label>
                            <span className="text-[11px] text-[#85898b]">
                              {resp.dietaryNotes.length}/500
                            </span>
                          </div>
                          <textarea
                            rows={2}
                            maxLength={500}
                            value={resp.dietaryNotes}
                            onChange={(e) =>
                              handleUpdate(fn.id, { dietaryNotes: e.target.value })
                            }
                            placeholder="e.g. Jain food required, nut allergy, high chair for toddler..."
                            className="w-full p-3.5 text-xs sm:text-sm rounded-[24px] border border-[#000000] bg-white text-[#0a1217] focus:outline-none transition-all resize-none placeholder:text-[#85898b]"
                          />
                        </div>
                      </div>
                    )}

                    {/* Tentative Details Section (Shown when status is 'maybe') */}
                    {resp.status === 'maybe' && (
                      <div className="pt-4 border-t border-[#0a1217]/10 space-y-3 text-xs text-[#0a1217]">
                        <p className="leading-relaxed bg-[#e4eff7] p-4 rounded-[24px] text-[#0a1217]">
                          We will hold tentative capacity for you. You can return to update this response closer to the event date.
                        </p>

                        <div>
                          <label className="block text-xs font-medium text-[#0a1217] mb-1">
                            Estimated attending guests (if known):
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="50"
                            inputMode="numeric"
                            value={resp.partySize}
                            onChange={(e) =>
                              handleUpdate(fn.id, {
                                partySize: Math.max(0, Math.min(50, parseInt(e.target.value, 10) || 0)),
                                vegCount: 0,
                                nonvegCount: 0,
                              })
                            }
                            className="w-28 h-10 text-center font-medium text-base rounded-[24px] border border-[#000000] bg-white text-[#0a1217] focus:outline-none transition-all"
                          />
                        </div>
                      </div>
                    )}

                    {/* Declined Section (Shown when status is 'no') */}
                    {resp.status === 'no' && (
                      <div className="pt-3 border-t border-[#0a1217]/10 text-xs text-[#85898b] leading-relaxed">
                        <p>We will miss you at this function!</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Submit Action Bar */}
            <div className="pt-4 space-y-3">
              {submitError && (
                <div
                  ref={submitErrorRef}
                  role="alert"
                  aria-live="assertive"
                  className="p-4 rounded-[24px] bg-[#e4eff7] border border-[#000000] text-[#0a1217] text-xs sm:text-sm flex items-start gap-3"
                >
                  <AlertCircle className="w-5 h-5 text-[#0a1217] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Unable to submit RSVP:</p>
                    <p className="mt-0.5 text-[#85898b]">{submitError}</p>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full min-h-[52px] py-4 px-8 rounded-full bg-[#0a1217] text-white hover:bg-[#0a1217]/90 active:scale-[0.99] font-medium text-base disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Submitting RSVP...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    <span>{hasExistingReplies ? 'Update My RSVP' : 'Submit RSVP'}</span>
                  </>
                )}
              </button>
              <p className="text-center text-xs text-[#85898b] pt-1">
                You can return to this link anytime before the function to modify your response.
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

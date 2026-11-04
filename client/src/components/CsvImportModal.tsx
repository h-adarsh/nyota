import React, { useState, useRef } from 'react';
import { Modal } from './Modal';
import {
  importHouseholdCsvApi,
  CsvImportPreviewResponse,
  CsvImportCommitResponse,
} from '../api/households';
import {
  UploadCloud,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Download,
  Loader2,
} from 'lucide-react';

interface CsvImportModalProps {
  isOpen: boolean;
  weddingId: string;
  onClose: () => void;
  onImportComplete: () => void;
}

export const CsvImportModal: React.FC<CsvImportModalProps> = ({
  isOpen,
  weddingId,
  onClose,
  onImportComplete,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<CsvImportPreviewResponse | null>(null);
  const [overriddenRows, setOverriddenRows] = useState<Set<number>>(new Set());
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setSelectedFile(null);
    setPreviewData(null);
    setOverriddenRows(new Set());
    setIsAnalyzing(false);
    setIsCommitting(false);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleDownloadSample = () => {
    const csvContent =
      'Household Name,Primary Contact,Phone,Expected Party Size,Notes\n' +
      'Kapoor Family,Anil Kapoor,+919876543210,4,Close family\n' +
      'Sharma Household,Pooja Sharma,+919876543211,2,Groom side cousin\n' +
      'Verma Family,Sunita Verma,+919876543212,3,Vegetarian preference';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'nyota_guest_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setErrorMsg('File exceeds the 2MB size limit.');
      return;
    }

    setSelectedFile(file);
    setPreviewData(null);
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;

    setIsAnalyzing(true);
    setErrorMsg(null);

    try {
      const response = await importHouseholdCsvApi(weddingId, selectedFile, true);
      setPreviewData(response as CsvImportPreviewResponse);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to analyze CSV';
      setErrorMsg(msg);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleOverride = (rowNum: number) => {
    setOverriddenRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowNum)) next.delete(rowNum);
      else next.add(rowNum);
      return next;
    });
  };

  const handleCommit = async () => {
    if (!selectedFile) return;

    setIsCommitting(true);
    setErrorMsg(null);

    try {
      const overrideArray = Array.from(overriddenRows);
      const response = (await importHouseholdCsvApi(
        weddingId,
        selectedFile,
        false,
        overrideArray,
        previewData?.fileHash
      )) as CsvImportCommitResponse;

      setSuccessMsg(
        `Successfully imported ${response.importedCount} households! (${response.duplicateCount} duplicates skipped)`
      );

      setTimeout(() => {
        onImportComplete();
        handleClose();
      }, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Import failed';
      setErrorMsg(msg);
    } finally {
      setIsCommitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Import Guests from CSV"
      subtitle="Upload guest lists, detect duplicates, and preview records before importing"
      maxWidth="max-w-2xl"
    >
      <div className="space-y-5">
        {/* Sample Template Download Bar */}
        <div className="flex items-center justify-between p-4 rounded-[24px] bg-[#e4eff7] border border-[#e4eff7] text-xs text-[#0a1217]">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-[#0a1217]" />
            <span className="font-medium">Need the standard CSV layout?</span>
          </div>
          <button
            type="button"
            onClick={handleDownloadSample}
            className="font-medium text-[#0a1217] hover:underline flex items-center gap-1 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Sample CSV</span>
          </button>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-[24px] bg-[#e4eff7] border border-[#000000] flex items-start gap-2.5 text-[#0a1217] text-xs">
            <AlertCircle className="w-4 h-4 text-[#0a1217] flex-shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 rounded-[24px] bg-[#0a1217] text-white flex items-start gap-2.5 text-xs">
            <CheckCircle2 className="w-4 h-4 text-[#cdfe00] flex-shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Step 1: File Dropzone */}
        {!previewData && (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv,text/plain"
              onChange={handleFileChange}
              className="hidden"
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[#0a1217]/20 hover:border-[#0a1217] rounded-[24px] p-8 text-center cursor-pointer transition-all"
            >
              <div className="w-12 h-12 rounded-full bg-[#e4eff7] text-[#0a1217] flex items-center justify-center mx-auto mb-3">
                <UploadCloud className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium text-[#0a1217]">
                {selectedFile ? selectedFile.name : 'Click to select or drag a CSV file here'}
              </p>
              <p className="text-xs text-[#85898b] mt-1">
                {selectedFile
                  ? `${(selectedFile.size / 1024).toFixed(1)} KB • Click to choose a different file`
                  : 'Supports .csv up to 2MB (Columns: Household Name, Primary Contact, Phone, Expected Party Size)'}
              </p>
            </div>

            {selectedFile && (
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  className="px-6 py-2.5 rounded-full bg-[#0a1217] hover:bg-[#0a1217]/90 text-white text-xs font-medium transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Analyzing File...</span>
                    </>
                  ) : (
                    <span>Analyze & Preview Rows</span>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Analysis & Preview State */}
        {previewData && (
          <div className="space-y-4">
            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3.5 rounded-[24px] bg-[#e4eff7] text-center border border-[#e4eff7]">
                <p className="text-[10px] font-medium uppercase tracking-wider text-[#85898b]">Ready to Import</p>
                <p className="text-xl font-medium text-[#0a1217] mt-0.5">{previewData.toImportCount}</p>
              </div>

              <div className="p-3.5 rounded-[24px] bg-[#ffffff] border border-[#0a1217]/20 text-center">
                <p className="text-[10px] font-medium uppercase tracking-wider text-[#85898b]">Duplicates Skipped</p>
                <p className="text-xl font-medium text-[#0a1217] mt-0.5">{previewData.duplicateCount}</p>
              </div>

              <div className="p-3.5 rounded-[24px] bg-[#ffffff] border border-[#000000] text-center">
                <p className="text-[10px] font-medium uppercase tracking-wider text-[#85898b]">Invalid Rows</p>
                <p className="text-xl font-medium text-[#0a1217] mt-0.5">{previewData.invalidCount}</p>
              </div>
            </div>

            {/* Duplicates Alert Banner */}
            {previewData.duplicates.length > 0 && (
              <div className="p-4 rounded-[24px] bg-[#e4eff7] border border-[#000000] text-xs text-[#0a1217]">
                <div className="flex items-center gap-1.5 font-medium mb-2.5">
                  <AlertTriangle className="w-4 h-4 text-[#0a1217]" />
                  <span>{previewData.duplicates.length} Duplicate Warning(s) Detected:</span>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {previewData.duplicates.map((d, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-[24px] bg-white border border-[#0a1217]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div className="text-[11px] text-[#0a1217] leading-tight">
                        <span className="font-medium text-[#0a1217]">
                          Row {d.rowNumber}: {d.name}
                        </span>{' '}
                        <span className="text-[#85898b]">({d.phone})</span>
                        <div className="text-[10px] text-[#85898b] mt-0.5">{d.reason}</div>
                      </div>

                      {d.canOverride !== false && (
                        <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-medium text-[#0a1217] bg-[#e4eff7] px-3 py-1 rounded-full border border-[#0a1217]/20 flex-shrink-0 transition-colors">
                          <input
                            type="checkbox"
                            checked={overriddenRows.has(d.rowNumber)}
                            onChange={() => toggleOverride(d.rowNumber)}
                            className="w-3.5 h-3.5 rounded accent-[#0a1217]"
                          />
                          <span>Import anyway</span>
                        </label>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Preview Table */}
            <div>
              <p className="text-xs font-medium text-[#0a1217] uppercase tracking-wider mb-2">
                Preview of Valid Households ({previewData.previewRows.length})
              </p>
              <div className="max-h-48 overflow-y-auto rounded-[24px] border border-[#000000]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-[#e4eff7] sticky top-0 border-b border-[#000000] text-[10px] uppercase font-medium text-[#0a1217]">
                    <tr>
                      <th className="py-2.5 px-3.5">Household</th>
                      <th className="py-2.5 px-3.5">Contact</th>
                      <th className="py-2.5 px-3.5">Phone</th>
                      <th className="py-2.5 px-3.5 text-center">Guests</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#0a1217]/10 text-[#0a1217]">
                    {previewData.previewRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-[#e4eff7]/40">
                        <td className="py-2.5 px-3.5 font-medium text-[#0a1217]">{row.name}</td>
                        <td className="py-2.5 px-3.5 text-[#85898b]">{row.primaryContactName}</td>
                        <td className="py-2.5 px-3.5 text-[#85898b]">{row.phone}</td>
                        <td className="py-2.5 px-3.5 text-center font-medium text-[#0a1217]">
                          {row.expectedPartySize}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-[#0a1217]/10">
              <button
                type="button"
                onClick={() => setPreviewData(null)}
                className="text-xs font-medium text-[#85898b] hover:text-[#0a1217] transition-colors"
              >
                Choose Another File
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-5 py-2.5 rounded-full text-xs font-medium text-[#0a1217] border border-[#0a1217]/20 hover:border-[#0a1217] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCommit}
                  disabled={isCommitting || (previewData.toImportCount + overriddenRows.size) === 0}
                  className="px-6 py-2.5 rounded-full bg-[#0a1217] hover:bg-[#0a1217]/90 text-white text-xs font-medium transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {isCommitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Importing...</span>
                    </>
                  ) : (
                    <span>Import {previewData.toImportCount + overriddenRows.size} Households</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

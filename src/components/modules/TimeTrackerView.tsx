import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { TimeEntry } from '../../types';
import { 
  Timer, 
  Play, 
  Square, 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  Clock, 
  DollarSign, 
  CheckCircle2, 
  FileText,
  AlertCircle,
  Calendar
} from 'lucide-react';
import { 
  formatCurrency, 
  formatDate, 
  formatDateTime, 
  formatSecondsToTimer 
} from '../../utils/formatters';
import { Modal } from '../common/Modal';
import { ConfirmModal } from '../common/ConfirmModal';
import { EmptyState } from '../common/EmptyState';

export const TimeTrackerView: React.FC<{
  onOpenCreateInvoiceWithEntries?: (entryIds: string[]) => void;
}> = ({ onOpenCreateInvoiceWithEntries }) => {
  const {
    timeEntries,
    projects,
    clients,
    settings,
    activeTimer,
    timerSeconds,
    startTimer,
    stopTimer,
    cancelTimer,
    addManualTimeEntry,
    updateTimeEntry,
    deleteTimeEntry,
    showToast,
    totalHoursLogged,
    billableHours,
    unbilledHours,
    unbilledEarnings,
  } = useApp();

  // Active Timer Input Controls
  const [timerProjectId, setTimerProjectId] = useState<string>(projects[0]?.id || '');
  const [timerDescription, setTimerDescription] = useState('');
  const [timerIsBillable, setTimerIsBillable] = useState(true);

  // Manual Time Log Modal State
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [deleteEntryId, setDeleteEntryId] = useState<string | null>(null);

  const [manualProjectId, setManualProjectId] = useState(projects[0]?.id || '');
  const [manualDescription, setManualDescription] = useState('');
  const [manualHours, setManualHours] = useState('1.5');
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);
  const [manualIsBillable, setManualIsBillable] = useState(true);
  const [manualError, setManualError] = useState('');

  // Selected entries for batch invoicing
  const [selectedEntryIds, setSelectedEntryIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBillable, setFilterBillable] = useState<'all' | 'unbilled' | 'invoiced'>('all');

  const currency = settings.defaultCurrency;
  const symbol = settings.currencySymbol;

  // Filtered entries
  const filteredEntries = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return timeEntries.filter((entry) => {
      const project = projects.find((p) => p.id === entry.projectId);
      const client = clients.find((c) => c.id === entry.clientId);

      const matchesSearch =
        !q ||
        entry.description.toLowerCase().includes(q) ||
        (project && project.name.toLowerCase().includes(q)) ||
        (client && client.name.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (filterBillable === 'unbilled') {
        return entry.isBillable && !entry.isInvoiced;
      }
      if (filterBillable === 'invoiced') {
        return entry.isInvoiced;
      }
      return true;
    });
  }, [timeEntries, projects, clients, searchQuery, filterBillable]);

  // Handle start timer
  const handleStartTimer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!timerProjectId) {
      showToast('Please select a project before starting the timer', 'error');
      return;
    }
    startTimer(timerProjectId, timerDescription, timerIsBillable);
  };

  // Handle manual submit
  const handleSaveManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualProjectId) {
      setManualError('Please select a project');
      return;
    }
    const proj = projects.find((p) => p.id === manualProjectId);
    if (!proj) {
      setManualError('Project not found');
      return;
    }

    const hours = parseFloat(manualHours);
    if (isNaN(hours) || hours <= 0) {
      setManualError('Please enter a valid positive number of hours.');
      return;
    }

    const durationSeconds = Math.round(hours * 3600);
    const startIso = `${manualDate}T09:00:00.000Z`;
    const endIso = `${manualDate}T${(9 + Math.floor(hours)).toString().padStart(2, '0')}:00:00.000Z`;

    try {
      if (editingEntry) {
        await updateTimeEntry(editingEntry.id, {
          projectId: manualProjectId,
          clientId: proj.clientId,
          description: manualDescription.trim() || 'Work session',
          durationSeconds,
          isBillable: manualIsBillable,
          hourlyRate: proj.hourlyRate || 0,
        });
      } else {
        await addManualTimeEntry({
          projectId: manualProjectId,
          clientId: proj.clientId,
          description: manualDescription.trim() || 'Work session',
          startTime: startIso,
          endTime: endIso,
          durationSeconds,
          isBillable: manualIsBillable,
          hourlyRate: proj.hourlyRate || 0,
        });
      }
      setIsManualModalOpen(false);
      setEditingEntry(null);
      setManualDescription('');
      setManualError('');
    } catch {
      setManualError('Failed to save time entry.');
    }
  };

  // Toggle selection
  const toggleSelectEntry = (id: string) => {
    setSelectedEntryIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAllUnbilled = () => {
    const unbilledIds = filteredEntries
      .filter((e) => e.isBillable && !e.isInvoiced)
      .map((e) => e.id);
    setSelectedEntryIds(unbilledIds);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Time Tracker
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Track live billable hours, record offline work logs, and convert time to invoices.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingEntry(null);
            setManualProjectId(projects[0]?.id || '');
            setManualDescription('');
            setManualHours('1.5');
            setManualDate(new Date().toISOString().split('T')[0]);
            setManualIsBillable(true);
            setIsManualModalOpen(true);
          }}
          className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 text-slate-500" />
          <span>Log Manual Time</span>
        </button>
      </div>

      {/* Live Start/Stop Timer Bar */}
      <div className="p-4 sm:p-5 rounded-xl bg-white border border-slate-200 shadow-2xs">
        {activeTimer ? (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-900">
                    {projects.find((p) => p.id === activeTimer.projectId)?.name || 'Active Task'}
                  </span>
                  <span className="text-slate-300">·</span>
                  <span className="text-xs text-slate-500 font-medium">
                    {activeTimer.isBillable ? `$${activeTimer.hourlyRate}/hr` : 'Non-billable'}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">{activeTimer.description}</p>
              </div>
            </div>

            <div className="flex items-center justify-between md:justify-end gap-4 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
              <div className="font-mono text-2xl sm:text-3xl font-bold text-slate-900 tabular-nums">
                {formatSecondsToTimer(timerSeconds)}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => cancelTimer()}
                  className="px-3 py-2 text-xs font-medium text-slate-500 hover:text-slate-800 rounded-lg transition-colors"
                >
                  Discard
                </button>
                <button
                  type="button"
                  onClick={() => stopTimer()}
                  className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <Square className="w-3.5 h-3.5 fill-white" />
                  <span>Stop & Save Log</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleStartTimer}
            className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3"
          >
            {/* Project Select */}
            <div className="w-full lg:w-64">
              <select
                required
                value={timerProjectId}
                onChange={(e) => setTimerProjectId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:ring-1 focus:ring-slate-900"
              >
                <option value="" disabled>
                  Select project to track...
                </option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (${p.hourlyRate}/hr)
                  </option>
                ))}
              </select>
            </div>

            {/* Task Description */}
            <div className="flex-1">
              <input
                type="text"
                placeholder="What are you working on right now? (e.g. Designing wireframes, API integration)"
                value={timerDescription}
                onChange={(e) => setTimerDescription(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900"
              />
            </div>

            {/* Billable toggle */}
            <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer px-1 py-2 select-none">
              <input
                type="checkbox"
                checked={timerIsBillable}
                onChange={(e) => setTimerIsBillable(e.target.checked)}
                className="rounded border-slate-300 text-slate-900 focus:ring-0"
              />
              <span>Billable</span>
            </label>

            {/* Start Button */}
            <button
              type="submit"
              disabled={projects.length === 0}
              className="px-5 py-2 text-xs font-semibold text-white bg-[#0D9488] hover:bg-[#0F766E] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-xs transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Start Timer</span>
            </button>
          </form>
        )}
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-slate-200">
          <span className="text-[11px] text-slate-500 block">Total Logged Time</span>
          <span className="text-xl font-bold font-mono text-slate-900 mt-1 block">
            {totalHoursLogged} hrs
          </span>
        </div>
        <div className="p-4 rounded-xl bg-white border border-slate-200">
          <span className="text-[11px] text-slate-500 block">Billable Hours</span>
          <span className="text-xl font-bold font-mono text-slate-900 mt-1 block">
            {billableHours} hrs
          </span>
        </div>
        <div className="p-4 rounded-xl bg-white border border-slate-200">
          <span className="text-[11px] text-slate-500 block">Unbilled Work</span>
          <span className="text-xl font-bold font-mono text-amber-700 mt-1 block">
            {unbilledHours} hrs
          </span>
        </div>
        <div className="p-4 rounded-xl bg-white border border-slate-200">
          <span className="text-[11px] text-slate-500 block">Unbilled Earnings</span>
          <span className="text-xl font-bold font-mono text-emerald-700 mt-1 block">
            {formatCurrency(unbilledEarnings, currency, symbol)}
          </span>
        </div>
      </div>

      {/* Time Logs Table & Filter Bar */}
      <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Filter tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg text-xs w-fit">
            <button
              onClick={() => setFilterBillable('all')}
              className={`px-3 py-1 font-medium rounded-md transition-colors ${
                filterBillable === 'all' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600'
              }`}
            >
              All Logs ({timeEntries.length})
            </button>
            <button
              onClick={() => setFilterBillable('unbilled')}
              className={`px-3 py-1 font-medium rounded-md transition-colors ${
                filterBillable === 'unbilled' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600'
              }`}
            >
              Unbilled ({timeEntries.filter((t) => t.isBillable && !t.isInvoiced).length})
            </button>
            <button
              onClick={() => setFilterBillable('invoiced')}
              className={`px-3 py-1 font-medium rounded-md transition-colors ${
                filterBillable === 'invoiced' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600'
              }`}
            >
              Invoiced ({timeEntries.filter((t) => t.isInvoiced).length})
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-48 sm:w-60">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900"
              />
            </div>

            {onOpenCreateInvoiceWithEntries && (
              <button
                type="button"
                disabled={selectedEntryIds.length === 0}
                onClick={() => onOpenCreateInvoiceWithEntries(selectedEntryIds)}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-[#0D9488] hover:bg-[#0F766E] disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shadow-2xs"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Invoice Selected ({selectedEntryIds.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        {filteredEntries.length === 0 ? (
          <EmptyState
            icon={Timer}
            title="No time logs found"
            description="Start the live tracker above or log manual work sessions to build your billable invoice history."
            actionLabel="Log First Work Session"
            onAction={() => setIsManualModalOpen(true)}
          />
        ) : (
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500 font-medium">
                  <th className="py-2.5 pr-2 w-8">
                    <input
                      type="checkbox"
                      checked={
                        selectedEntryIds.length > 0 &&
                        selectedEntryIds.length ===
                          filteredEntries.filter((e) => e.isBillable && !e.isInvoiced).length
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          handleSelectAllUnbilled();
                        } else {
                          setSelectedEntryIds([]);
                        }
                      }}
                      className="rounded border-slate-300 text-slate-900"
                      title="Select all unbilled"
                    />
                  </th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Project / Client</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3 text-right">Duration</th>
                  <th className="py-2.5 px-3 text-right">Rate</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 pl-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEntries.map((entry) => {
                  const proj = projects.find((p) => p.id === entry.projectId);
                  const client = clients.find((c) => c.id === entry.clientId);
                  const hours = (entry.durationSeconds / 3600);
                  const calculatedAmount = entry.isBillable ? hours * entry.hourlyRate : 0;
                  const isSelected = selectedEntryIds.includes(entry.id);

                  return (
                    <tr
                      key={entry.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isSelected ? 'bg-slate-50' : ''
                      }`}
                    >
                      <td className="py-3 pr-2">
                        {entry.isBillable && !entry.isInvoiced ? (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectEntry(entry.id)}
                            className="rounded border-slate-300 text-slate-900"
                          />
                        ) : (
                          <span className="w-3 block" />
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                        {formatDate(entry.startTime)}
                      </td>
                      <td className="py-3 px-3 text-slate-700 whitespace-nowrap">
                        <div className="font-medium text-slate-900">
                          {proj?.name || 'General Project'}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {client?.name || 'Direct'}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-700 max-w-xs truncate">
                        {entry.description}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-medium text-slate-900 whitespace-nowrap">
                        {formatSecondsToTimer(entry.durationSeconds)}
                        <span className="text-[11px] text-slate-400 ml-1">
                          ({hours.toFixed(1)}h)
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-600 whitespace-nowrap">
                        {entry.isBillable ? `$${entry.hourlyRate}/h` : '—'}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-medium text-slate-900 whitespace-nowrap">
                        {entry.isBillable
                          ? formatCurrency(calculatedAmount, currency, symbol)
                          : '—'}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        {entry.isInvoiced ? (
                          <span className="text-[11px] font-medium text-slate-500">
                            Invoiced
                          </span>
                        ) : entry.isBillable ? (
                          <span className="text-[11px] font-medium text-emerald-700">
                            Unbilled
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">Non-billable</span>
                        )}
                      </td>
                      <td className="py-3 pl-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setEditingEntry(entry);
                              setManualProjectId(entry.projectId);
                              setManualDescription(entry.description);
                              setManualHours((entry.durationSeconds / 3600).toFixed(2));
                              setManualDate(entry.startTime.split('T')[0]);
                              setManualIsBillable(entry.isBillable);
                              setIsManualModalOpen(true);
                            }}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
                            title="Edit entry"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteEntryId(entry.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                            title="Delete entry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteEntryId}
        onClose={() => setDeleteEntryId(null)}
        onConfirm={async () => {
          if (deleteEntryId) {
            await deleteTimeEntry(deleteEntryId);
            setDeleteEntryId(null);
          }
        }}
        title="Delete Time Entry"
        message="Are you sure you want to delete this recorded time entry? This cannot be undone."
      />

      {/* Manual Time Entry Modal */}
      <Modal
        isOpen={isManualModalOpen}
        onClose={() => {
          setIsManualModalOpen(false);
          setEditingEntry(null);
        }}
        title={editingEntry ? 'Edit Time Entry' : 'Log Manual Work Time'}
        subtitle="Record past work hours, meetings, or offline sessions."
      >
        <form onSubmit={handleSaveManual} className="space-y-4">
          {manualError && (
            <div className="p-3 text-xs rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-medium">
              {manualError}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Project *
            </label>
            <select
              required
              value={manualProjectId}
              onChange={(e) => setManualProjectId(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:ring-1 focus:ring-slate-900"
            >
              <option value="" disabled>
                Select project...
              </option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (${p.hourlyRate}/hr)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Task Description
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Code review and deployment pipeline refactor..."
              value={manualDescription}
              onChange={(e) => setManualDescription(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Date *
              </label>
              <input
                type="date"
                required
                value={manualDate}
                onChange={(e) => setManualDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Duration (Hours) *
              </label>
              <input
                type="number"
                step="0.25"
                min="0.1"
                required
                value={manualHours}
                onChange={(e) => setManualHours(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={manualIsBillable}
                onChange={(e) => setManualIsBillable(e.target.checked)}
                className="rounded border-slate-300 text-slate-900"
              />
              <span>Billable to client at project rate</span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setIsManualModalOpen(false);
                setEditingEntry(null);
              }}
              className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-[#0D9488] hover:bg-[#0F766E] rounded-lg transition-colors shadow-2xs"
            >
              Save Time Entry
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

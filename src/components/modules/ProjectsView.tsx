import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Project, ProjectStatus, ProjectBillingType } from '../../types';
import { 
  Briefcase, 
  Plus, 
  Search, 
  Clock, 
  DollarSign, 
  Calendar, 
  Edit3, 
  Trash2, 
  Play, 
  User, 
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { formatCurrency, formatDate, formatSecondsToHours } from '../../utils/formatters';
import { Modal } from '../common/Modal';
import { ConfirmModal } from '../common/ConfirmModal';
import { StatusBadge } from '../common/StatusBadge';
import { EmptyState } from '../common/EmptyState';

export const ProjectsView: React.FC<{
  isOpenCreateModal: boolean;
  onCloseCreateModal: () => void;
  onOpenCreateModal: () => void;
}> = ({ isOpenCreateModal, onCloseCreateModal, onOpenCreateModal }) => {
  const {
    projects,
    clients,
    timeEntries,
    settings,
    addProject,
    updateProject,
    deleteProject,
    startTimer,
    activeTimer,
    setActiveModule,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ProjectStatus>('all');
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formClientId, setFormClientId] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formBillingType, setFormBillingType] = useState<ProjectBillingType>('hourly');
  const [formHourlyRate, setFormHourlyRate] = useState<number>(85);
  const [formFixedBudget, setFormFixedBudget] = useState<number>(3000);
  const [formStatus, setFormStatus] = useState<ProjectStatus>('in_progress');
  const [formStartDate, setFormStartDate] = useState('');
  const [formDeadline, setFormDeadline] = useState('');
  const [formError, setFormError] = useState('');

  const currency = settings.defaultCurrency;
  const symbol = settings.currencySymbol;

  // Project statistics (hours logged, earnings accumulated)
  const projectStats = useMemo(() => {
    const stats: Record<string, { totalSeconds: number; billableSeconds: number; earnings: number }> = {};
    projects.forEach((p) => {
      stats[p.id] = { totalSeconds: 0, billableSeconds: 0, earnings: 0 };
    });

    timeEntries.forEach((t) => {
      if (stats[t.projectId]) {
        stats[t.projectId].totalSeconds += Number(t.durationSeconds) || 0;
        if (t.isBillable) {
          stats[t.projectId].billableSeconds += Number(t.durationSeconds) || 0;
          const hours = (Number(t.durationSeconds) || 0) / 3600;
          stats[t.projectId].earnings += hours * (Number(t.hourlyRate) || 0);
        }
      }
    });

    return stats;
  }, [projects, timeEntries]);

  // Handle Edit Project
  const handleOpenEdit = (project: Project) => {
    setEditingProject(project);
    setFormName(project.name);
    setFormClientId(project.clientId);
    setFormDescription(project.description || '');
    setFormBillingType(project.billingType);
    setFormHourlyRate(project.hourlyRate || 85);
    setFormFixedBudget(project.fixedBudget || 0);
    setFormStatus(project.status);
    setFormStartDate(project.startDate || '');
    setFormDeadline(project.deadline || '');
    setFormError('');
  };

  const handleCloseForm = () => {
    onCloseCreateModal();
    setEditingProject(null);
    setFormName('');
    setFormClientId(clients[0]?.id || '');
    setFormDescription('');
    setFormBillingType('hourly');
    setFormHourlyRate(85);
    setFormFixedBudget(3000);
    setFormStatus('in_progress');
    setFormStartDate('');
    setFormDeadline('');
    setFormError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError('Project title is required.');
      return;
    }
    if (!formClientId) {
      setFormError('Please select a client.');
      return;
    }

    try {
      if (editingProject) {
        await updateProject(editingProject.id, {
          name: formName.trim(),
          clientId: formClientId,
          description: formDescription.trim() || undefined,
          billingType: formBillingType,
          hourlyRate: Number(formHourlyRate) || 0,
          fixedBudget: Number(formFixedBudget) || 0,
          status: formStatus,
          startDate: formStartDate || undefined,
          deadline: formDeadline || undefined,
        });
      } else {
        await addProject({
          name: formName.trim(),
          clientId: formClientId,
          description: formDescription.trim() || undefined,
          billingType: formBillingType,
          hourlyRate: Number(formHourlyRate) || 0,
          fixedBudget: Number(formFixedBudget) || 0,
          status: formStatus,
          startDate: formStartDate || undefined,
          deadline: formDeadline || undefined,
        });
      }
      handleCloseForm();
    } catch {
      setFormError('An error occurred while saving the project.');
    }
  };

  // Filtered projects
  const filteredProjects = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return projects.filter((p) => {
      const client = clients.find((c) => c.id === p.clientId);
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (client && client.name.toLowerCase().includes(q)) ||
        (client && client.company && client.company.toLowerCase().includes(q));

      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [projects, clients, searchQuery, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Top Header & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Projects ({projects.length})
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Track milestones, hourly rates, budgets, and deliverable timelines.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search projects or clients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <button
            type="button"
            onClick={onOpenCreateModal}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#0D9488] hover:bg-[#0F766E] rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Add Project</span>
          </button>
        </div>
      </div>

      {/* Segmented Status Tabs (Functional interactive button controls) */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg w-fit overflow-x-auto text-xs">
        {(['all', 'in_progress', 'planning', 'on_hold', 'completed'] as const).map((tab) => {
          const labels = {
            all: 'All Projects',
            in_progress: 'In Progress',
            planning: 'Planning',
            on_hold: 'On Hold',
            completed: 'Completed',
          };
          const count =
            tab === 'all' ? projects.length : projects.filter((p) => p.status === tab).length;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                statusFilter === tab
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {labels[tab]} ({count})
            </button>
          );
        })}
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title={searchQuery || statusFilter !== 'all' ? 'No matching projects' : 'No projects created yet'}
          description={
            projects.length === 0
              ? 'Create a project linked to a client to log billable hours and generate itemized invoices.'
              : 'No projects match your current search and filter settings.'
          }
          actionLabel="Create Project"
          onAction={onOpenCreateModal}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((project) => {
            const client = clients.find((c) => c.id === project.clientId);
            const stats = projectStats[project.id] || { totalSeconds: 0, billableSeconds: 0, earnings: 0 };
            const hours = (stats.totalSeconds / 3600).toFixed(1);
            const isTimerRunningOnThis = activeTimer?.projectId === project.id;

            return (
              <div
                key={project.id}
                className="p-5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 transition-all shadow-2xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <h3 className="font-semibold text-slate-900 text-sm tracking-tight truncate max-w-[200px]">
                        {project.name}
                      </h3>
                      <p className="text-xs text-slate-500 font-medium flex items-center gap-1 mt-0.5 truncate">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{client?.name || 'Unnamed Client'}</span>
                        {client?.company && (
                          <span className="text-slate-400 truncate">({client.company})</span>
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(project)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Edit project"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeletingProject(project)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete project"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {project.description && (
                    <p className="text-xs text-slate-600 line-clamp-2 my-2 leading-relaxed">
                      {project.description}
                    </p>
                  )}

                  <div className="flex items-center gap-2 mt-3 mb-4">
                    <StatusBadge status={project.status} />
                    <span className="text-slate-300">·</span>
                    <span className="text-xs text-slate-500 font-medium">
                      {project.billingType === 'hourly'
                        ? `${formatCurrency(project.hourlyRate, currency, symbol)}/hr`
                        : `${formatCurrency(project.fixedBudget, currency, symbol)} fixed`}
                    </span>
                  </div>
                </div>

                {/* Bottom stats & Action */}
                <div className="pt-3 border-t border-slate-100 space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Logged Time</span>
                      <span className="font-mono font-medium text-slate-800">
                        {hours} hrs
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">
                        {project.billingType === 'hourly' ? 'Calculated Value' : 'Target Budget'}
                      </span>
                      <span className="font-mono font-medium text-slate-900">
                        {project.billingType === 'hourly'
                          ? formatCurrency(stats.earnings, currency, symbol)
                          : formatCurrency(project.fixedBudget, currency, symbol)}
                      </span>
                    </div>
                  </div>

                  {project.deadline && (
                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span>Due {formatDate(project.deadline)}</span>
                    </div>
                  )}

                  {/* Start Timer CTA for this project */}
                  <div className="pt-2">
                    {isTimerRunningOnThis ? (
                      <div className="w-full py-1.5 px-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center justify-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
                        <span>Timer Running</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          startTimer(project.id, `Task on ${project.name}`);
                          setActiveModule('time_tracker');
                        }}
                        className="w-full py-1.5 px-3 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Play className="w-3 h-3 text-slate-600" />
                        <span>Start Timer on Project</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Project Modal */}
      <Modal
        isOpen={isOpenCreateModal || !!editingProject}
        onClose={handleCloseForm}
        title={editingProject ? 'Edit Project' : 'Create New Project'}
        subtitle="Define project deliverables, client, and billing terms."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 text-xs rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-medium">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Project Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Vanguard Trading Dashboard"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Client *
            </label>
            {clients.length === 0 ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-center justify-between">
                <span>No clients created yet. Please create a client first.</span>
                <button
                  type="button"
                  onClick={() => {
                    handleCloseForm();
                    setActiveModule('clients');
                  }}
                  className="font-semibold underline ml-2 hover:text-amber-950"
                >
                  Go to Clients
                </button>
              </div>
            ) : (
              <select
                required
                value={formClientId}
                onChange={(e) => setFormClientId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:ring-1 focus:ring-slate-900"
              >
                <option value="" disabled>
                  Select a client...
                </option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.company ? `(${c.company})` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Description & Scope
            </label>
            <textarea
              rows={2}
              placeholder="Key deliverables, milestones, and scope specifications..."
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Billing Model
              </label>
              <select
                value={formBillingType}
                onChange={(e) => setFormBillingType(e.target.value as ProjectBillingType)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:ring-1 focus:ring-slate-900"
              >
                <option value="hourly">Hourly Rate Billing</option>
                <option value="fixed">Fixed Price Milestone</option>
              </select>
            </div>

            <div>
              {formBillingType === 'hourly' ? (
                <>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Hourly Rate ($/hr) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={formHourlyRate}
                    onChange={(e) => setFormHourlyRate(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                  />
                </>
              ) : (
                <>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Fixed Budget ($) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    required
                    value={formFixedBudget}
                    onChange={(e) => setFormFixedBudget(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                  />
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Status
              </label>
              <select
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as ProjectStatus)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:ring-1 focus:ring-slate-900"
              >
                <option value="in_progress">In Progress</option>
                <option value="planning">Planning</option>
                <option value="on_hold">On Hold</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={formStartDate}
                onChange={(e) => setFormStartDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Deadline
              </label>
              <input
                type="date"
                value={formDeadline}
                onChange={(e) => setFormDeadline(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={handleCloseForm}
              className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-[#0D9488] hover:bg-[#0F766E] rounded-lg transition-colors shadow-2xs"
            >
              {editingProject ? 'Save Changes' : 'Create Project'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Project Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deletingProject}
        onClose={() => setDeletingProject(null)}
        onConfirm={async () => {
          if (deletingProject) {
            await deleteProject(deletingProject.id);
            setDeletingProject(null);
          }
        }}
        title="Delete Project"
        message={`Are you sure you want to delete project "${deletingProject?.name}"? Projects with issued invoices cannot be removed.`}
      />
    </div>
  );
};

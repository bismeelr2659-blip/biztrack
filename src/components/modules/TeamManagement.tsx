import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { teamService } from '../../services/teamService';
import { TeamMember, TeamRole, ROLE_PERMISSIONS } from '../../types/team';
import { authService } from '../../services/authService';
import { Modal } from '../common/Modal';
import { ConfirmModal } from '../common/ConfirmModal';
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  Shield, 
  Eye, 
  Edit3, 
  Trash2, 
  Mail, 
  CheckCircle2, 
  Clock,
  Sparkles,
  Info
} from 'lucide-react';

export const TeamManagement: React.FC = () => {
  const { showToast } = useApp();
  const [members, setMembers] = useState<TeamMember[]>(teamService.getMembers());
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [deletingMember, setDeletingMember] = useState<TeamMember | null>(null);

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<TeamRole>('member');
  const [inviteTitle, setInviteTitle] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentUser = authService.getCurrentUser();
  const isAdmin = currentUser?.role === 'admin' || !currentUser; // allow default workspace owner full admin

  const handleOpenInvite = () => {
    setInviteEmail('');
    setInviteName('');
    setInviteRole('member');
    setInviteTitle('');
    setFormError(null);
    setIsInviteModalOpen(true);
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      const newMember = await teamService.inviteMember({
        email: inviteEmail,
        name: inviteName,
        role: inviteRole,
        title: inviteTitle,
      });

      setMembers(teamService.getMembers());
      setIsInviteModalOpen(false);
      showToast(`Invitation sent to ${newMember.email} as ${newMember.role}.`);
    } catch (err: any) {
      setFormError(err.message || 'Failed to invite team member.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRoleChange = async (memberId: string, newRole: TeamRole) => {
    try {
      await teamService.updateMemberRole(memberId, newRole);
      setMembers(teamService.getMembers());
      showToast(`Role updated to ${newRole}.`);
    } catch (err: any) {
      showToast(err.message || 'Failed to update role.', 'error');
    }
  };

  const handleConfirmRemove = async () => {
    if (!deletingMember) return;
    try {
      await teamService.removeMember(deletingMember.id);
      setMembers(teamService.getMembers());
      showToast(`Removed ${deletingMember.name} from team.`);
    } catch (err: any) {
      showToast(err.message || 'Failed to remove member.', 'error');
    } finally {
      setDeletingMember(null);
    }
  };

  const getRoleBadge = (role: TeamRole) => {
    switch (role) {
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <ShieldCheck className="w-3 h-3" />
            <span>Admin (Full Access)</span>
          </span>
        );
      case 'manager':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Edit3 className="w-3 h-3" />
            <span>Manager (Edit Invoices)</span>
          </span>
        );
      case 'member':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <Eye className="w-3 h-3" />
            <span>Member (View Only)</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-[#0D9488]" />
            <span>Team Management & Permissions</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Invite colleagues, assign role-based permissions, and manage collaborative access to invoices and clients.
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={handleOpenInvite}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-[#0D9488] hover:bg-[#0F766E] rounded-lg shadow-2xs transition-colors flex items-center gap-2 self-start sm:self-auto"
          >
            <UserPlus className="w-4 h-4" />
            <span>Invite Team Member</span>
          </button>
        )}
      </div>

      {/* Team Member Cards / Table */}
      <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">
            Active Workspace Members ({members.length})
          </h3>
          <span className="text-xs text-slate-400">
            {members.filter((m) => m.role === 'admin').length} Admins · {members.filter((m) => m.role === 'manager').length} Managers · {members.filter((m) => m.role === 'member').length} Members
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                <th className="py-2.5 px-3">Member</th>
                <th className="py-2.5 px-3">Role</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Date Added</th>
                {isAdmin && <th className="py-2.5 px-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {members.map((member) => {
                const initials = member.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
                return (
                  <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#142B4A] text-white flex items-center justify-center font-bold text-xs shrink-0">
                          {initials}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-900 block leading-tight">
                            {member.name}
                          </span>
                          <span className="text-[11px] text-slate-500 flex items-center gap-1">
                            <Mail className="w-3 h-3 text-slate-400" />
                            <span>{member.email}</span>
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      {isAdmin ? (
                        <select
                          value={member.role}
                          onChange={(e) => handleRoleChange(member.id, e.target.value as TeamRole)}
                          className="px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white font-medium focus:ring-1 focus:ring-[#0D9488]"
                        >
                          <option value="admin">Admin (Full Access)</option>
                          <option value="manager">Manager (Edit Invoices)</option>
                          <option value="member">Member (View Only)</option>
                        </select>
                      ) : (
                        getRoleBadge(member.role)
                      )}
                    </td>
                    <td className="py-3 px-3">
                      {member.status === 'active' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Active</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          <Clock className="w-3 h-3" />
                          <span>Pending Invite</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">
                      {new Date(member.invitedAt).toLocaleDateString()}
                    </td>
                    {isAdmin && (
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => setDeletingMember(member)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors"
                          title="Remove team member"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Permissions Matrix Reference */}
      <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-2xs">
        <h3 className="text-sm font-bold text-slate-900 tracking-tight mb-2 flex items-center gap-2">
          <Info className="w-4 h-4 text-[#0D9488]" />
          <span>Role Permissions Matrix</span>
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Overview of workspace privileges granted to each user level.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/30">
            <div className="flex items-center gap-2 mb-2 font-bold text-xs text-purple-900">
              <ShieldCheck className="w-4 h-4 text-purple-600" />
              <span>Admin</span>
            </div>
            <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4">
              <li>Full access to all modules & records</li>
              <li>Create, edit, & delete invoices/clients</li>
              <li>Invite, change roles, or remove members</li>
              <li>Modify workspace tax and billing settings</li>
              <li>Export financial audit data & clear demo data</li>
            </ul>
          </div>

          <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/30">
            <div className="flex items-center gap-2 mb-2 font-bold text-xs text-blue-900">
              <Edit3 className="w-4 h-4 text-blue-600" />
              <span>Manager</span>
            </div>
            <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4">
              <li>View and create invoices & clients</li>
              <li>Log time and record payments</li>
              <li>Edit client contact details</li>
              <li>Cannot delete clients or financial records</li>
              <li>Cannot invite members or alter settings</li>
            </ul>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
            <div className="flex items-center gap-2 mb-2 font-bold text-xs text-slate-800">
              <Eye className="w-4 h-4 text-slate-600" />
              <span>Member</span>
            </div>
            <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4">
              <li>Read-only access to dashboard</li>
              <li>View invoices and client directory</li>
              <li>View projects and milestones</li>
              <li>Cannot create, edit, or delete records</li>
              <li>No access to settings or team management</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Invite Modal */}
      <Modal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        title="Invite New Team Member"
        subtitle="Send an invitation link and grant role-based workspace permissions."
        maxWidth="md"
      >
        <form onSubmit={handleInviteSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Member Full Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Alex Morgan"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#0D9488]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Email Address *
            </label>
            <input
              type="email"
              required
              placeholder="alex@company.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#0D9488]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Role & Permissions Level *
            </label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as TeamRole)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:ring-1 focus:ring-[#0D9488]"
            >
              <option value="member">Member - View only access</option>
              <option value="manager">Manager - Can view + create/edit invoices & clients</option>
              <option value="admin">Admin - Full workspace & team access</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Job Title / Designation (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Senior Frontend Engineer"
              value={inviteTitle}
              onChange={(e) => setInviteTitle(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#0D9488]"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsInviteModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#0D9488] hover:bg-[#0F766E] disabled:opacity-50 rounded-lg shadow-xs transition-colors"
            >
              {isSubmitting ? 'Sending Invite...' : 'Send Invitation'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deletingMember}
        onClose={() => setDeletingMember(null)}
        onConfirm={handleConfirmRemove}
        title="Remove Team Member"
        message={`Are you sure you want to revoke workspace access for ${deletingMember?.name} (${deletingMember?.email})?`}
        confirmLabel="Remove Member"
      />
    </div>
  );
};

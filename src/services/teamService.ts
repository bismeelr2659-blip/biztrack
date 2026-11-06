import { TeamMember, TeamRole } from '../types/team';
import { cloudService } from './cloudService';

const TEAM_STORAGE_KEY = 'biztrack_team_members_v1';

export const INITIAL_TEAM_MEMBERS: TeamMember[] = [
  {
    id: 'team-owner-1',
    email: 'admin@biztrack.io',
    name: 'Workspace Owner',
    role: 'admin',
    status: 'active',
    invitedAt: '2026-01-01T00:00:00.000Z',
    joinedAt: '2026-01-01T00:00:00.000Z',
    title: 'Founder & Lead Engineer',
  },
  {
    id: 'team-mgr-2',
    email: 'manager@biztrack.io',
    name: 'Sarah Connor',
    role: 'manager',
    status: 'active',
    invitedAt: '2026-02-15T10:00:00.000Z',
    joinedAt: '2026-02-16T14:30:00.000Z',
    title: 'Operations & Billing Manager',
  },
  {
    id: 'team-mbr-3',
    email: 'designer@biztrack.io',
    name: 'Alex Rivera',
    role: 'member',
    status: 'active',
    invitedAt: '2026-03-01T09:00:00.000Z',
    joinedAt: '2026-03-02T11:20:00.000Z',
    title: 'Product Designer',
  },
];

class TeamService {
  public getMembers(): TeamMember[] {
    if (typeof localStorage === 'undefined') return INITIAL_TEAM_MEMBERS;
    try {
      const raw = localStorage.getItem(TEAM_STORAGE_KEY);
      if (!raw) {
        this.saveMembers(INITIAL_TEAM_MEMBERS);
        return INITIAL_TEAM_MEMBERS;
      }
      return JSON.parse(raw);
    } catch {
      return INITIAL_TEAM_MEMBERS;
    }
  }

  private saveMembers(members: TeamMember[]): void {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(TEAM_STORAGE_KEY, JSON.stringify(members));
      } catch (e) {
        console.warn('Failed to save team members:', e);
      }
    }
    // Also sync to cloud
    cloudService.saveDocument('team', 'members_list', { members });
  }

  public async inviteMember(params: {
    email: string;
    name: string;
    role: TeamRole;
    title?: string;
  }): Promise<TeamMember> {
    const cleanEmail = params.email.trim().toLowerCase();
    const members = this.getMembers();

    const existing = members.find((m) => m.email.toLowerCase() === cleanEmail);
    if (existing) {
      throw new Error(`A team member with email "${cleanEmail}" is already in your workspace.`);
    }

    const newMember: TeamMember = {
      id: `team-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      email: cleanEmail,
      name: params.name.trim() || cleanEmail.split('@')[0],
      role: params.role,
      status: 'invited',
      invitedAt: new Date().toISOString(),
      title: params.title?.trim() || undefined,
    };

    const updated = [...members, newMember];
    this.saveMembers(updated);
    return newMember;
  }

  public async updateMemberRole(memberId: string, newRole: TeamRole): Promise<void> {
    const members = this.getMembers();
    const idx = members.findIndex((m) => m.id === memberId);
    if (idx === -1) {
      throw new Error('Team member not found.');
    }

    // Ensure at least one admin remains
    if (members[idx].role === 'admin' && newRole !== 'admin') {
      const adminCount = members.filter((m) => m.role === 'admin').length;
      if (adminCount <= 1) {
        throw new Error('Your workspace must have at least one active Admin.');
      }
    }

    members[idx].role = newRole;
    this.saveMembers([...members]);
  }

  public async removeMember(memberId: string): Promise<void> {
    const members = this.getMembers();
    const target = members.find((m) => m.id === memberId);

    if (target?.role === 'admin') {
      const adminCount = members.filter((m) => m.role === 'admin').length;
      if (adminCount <= 1) {
        throw new Error('Cannot remove the last Admin of the workspace.');
      }
    }

    const filtered = members.filter((m) => m.id !== memberId);
    this.saveMembers(filtered);
  }
}

export const teamService = new TeamService();

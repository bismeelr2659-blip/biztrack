export type TeamRole = 'admin' | 'manager' | 'member';

export type MemberStatus = 'active' | 'invited' | 'disabled';

export interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: TeamRole;
  status: MemberStatus;
  invitedAt: string;
  joinedAt?: string;
  title?: string;
  avatarUrl?: string;
}

export interface RolePermissions {
  canViewDashboard: boolean;
  canCreateInvoices: boolean;
  canEditInvoices: boolean;
  canDeleteInvoices: boolean;
  canCreateClients: boolean;
  canEditClients: boolean;
  canDeleteClients: boolean;
  canManageTeam: boolean;
  canEditSettings: boolean;
  canExportReports: boolean;
}

export const ROLE_PERMISSIONS: Record<TeamRole, RolePermissions> = {
  admin: {
    canViewDashboard: true,
    canCreateInvoices: true,
    canEditInvoices: true,
    canDeleteInvoices: true,
    canCreateClients: true,
    canEditClients: true,
    canDeleteClients: true,
    canManageTeam: true,
    canEditSettings: true,
    canExportReports: true,
  },
  manager: {
    canViewDashboard: true,
    canCreateInvoices: true,
    canEditInvoices: true,
    canDeleteInvoices: false,
    canCreateClients: true,
    canEditClients: true,
    canDeleteClients: false,
    canManageTeam: false,
    canEditSettings: false,
    canExportReports: true,
  },
  member: {
    canViewDashboard: true,
    canCreateInvoices: false,
    canEditInvoices: false,
    canDeleteInvoices: false,
    canCreateClients: false,
    canEditClients: false,
    canDeleteClients: false,
    canManageTeam: false,
    canEditSettings: false,
    canExportReports: false,
  },
};

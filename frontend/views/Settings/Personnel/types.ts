export type AdminRole = 'HQ Manager' | 'Project Manager' | 'Safety Officer' | 'Worker';

export interface AdminUser {
  id: string;
  username: string;
  dept: string;
  phone: string;
  role: AdminRole;
  addedDate: string;
  parentId: string | null; // ID of the supervisor
}

export interface PersonnelFormState {
  username: string;
  dept: string;
  phone: string;
  password: '';
  role: AdminRole;
  parentId: string;
}

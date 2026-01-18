export interface TimesheetEntry {
  id: string;
  date: string;
  arrivalTime: string;
  departureTime: string;
  hoursWorked: number;
  description: string;
  hasClash?: boolean;
}

export interface ParsedEntry {
  date: string;
  arrivalTime: string;
  departureTime: string;
  hoursWorked: number;
}

export interface WorkerMetadata {
  name: string;
  position: string;
}

export interface BatchParsedResult {
  fileName: string;
  worker: WorkerMetadata;
  entries: ParsedEntry[];
}

export interface Clash {
  id: string;
  entryId: string;
  conflictingUser: string;
  conflictingTime: string;
  message: string;
  severity: 'warning' | 'critical';
  details?: {
    user1: { name: string; time: string; description: string };
    user2: { name: string; time: string; description: string };
    date: string;
  };
}

export enum ViewState {
  LANDING = 'LANDING',
  AUTH = 'AUTH',
  TEAM = 'TEAM',
  DASHBOARD = 'DASHBOARD',
  UPLOAD = 'UPLOAD',
  MANUAL = 'MANUAL',
}

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  teamId?: string;
  role?: string;
  avatarUrl?: string;
}

export interface Team {
  id: string;
  name: string;
  inviteCode: string;
  createdBy: string;
  members: string[]; // array of UIDs
}

export interface Shift {
  id: string;
  userId: string;
  userName: string;
  teamId: string;
  date: string;
  arrivalTime: string;
  departureTime: string;
  hoursWorked: number;
  description: string;
}

export interface WorkingPeriod {
  id: string;
  label: string;
  startDate: string; // ISO string or YYYY-MM-DD
  endDate: string;   // ISO string or YYYY-MM-DD
}
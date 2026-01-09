import { TimesheetEntry, Clash } from './types';

export const MOCK_EXISTING_ENTRIES = [
  {
    userId: 'user_2',
    name: 'Sarah Jenkins',
    date: '2024-02-01',
    start: '09:00',
    end: '17:00'
  },
  {
    userId: 'user_3',
    name: 'Mike Ross',
    date: '2024-02-02',
    start: '10:00',
    end: '15:00'
  }
];

export const INITIAL_MANUAL_ENTRY: TimesheetEntry = {
  id: 'new_1',
  date: new Date().toISOString().split('T')[0],
  arrivalTime: '09:00',
  departureTime: '17:00',
  hoursWorked: 8.0,
  description: '',
  hasClash: false
};

export const SAMPLE_EXTRACTED_DATA: TimesheetEntry[] = [
  { id: 'ocr_1', date: '2024-02-01', arrivalTime: '08:55', departureTime: '17:05', hoursWorked: 8.17, description: 'Project Alpha Planning', hasClash: true },
  { id: 'ocr_2', date: '2024-02-02', arrivalTime: '09:00', departureTime: '16:30', hoursWorked: 7.5, description: 'Client Meeting', hasClash: false },
  { id: 'ocr_3', date: '2024-02-03', arrivalTime: '09:15', departureTime: '17:15', hoursWorked: 8.0, description: 'Development Sprint', hasClash: false },
  { id: 'ocr_4', date: '2024-02-04', arrivalTime: '08:30', departureTime: '14:00', hoursWorked: 5.5, description: 'Site Visit', hasClash: true },
];

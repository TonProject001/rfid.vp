export interface RawLog {
  date: string;    // e.g., "2/12/2025"
  time: string;    // e.g., "11:21:12"
  cardNum: string; // e.g., "8050133"
  name: string;    // e.g., "มานี มีพะโล้"
  timestamp: Date; // Parsed JS Date object
}

export enum ShiftType {
  MORNING = 'เวรเช้า',
  AFTERNOON = 'เวรบ่าย',
  NIGHT = 'เวรดึก',
  UNKNOWN = 'นอกเวลาราชการ'
}

export interface ShiftRecord {
  id: string;
  cardNum: string;
  name: string;
  shift: ShiftType;
  date: Date; // The date this shift belongs to
  inTime: string | null;
  outTime: string | null;
  remarks: string;
}

export interface DateFilter {
  day: number;
  month: number;
  year: number;
}

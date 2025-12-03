import { RawLog, ShiftRecord, ShiftType } from '../types';

/**
 * Check if a log's time is within a specific window (inclusive).
 * Handles day transitions if endHour < startHour (not needed often if we use absolute diffs, but kept for logic).
 */
const isTimeInRange = (date: Date, startH: number, startM: number, endH: number, endM: number): boolean => {
  const checkTime = date.getHours() * 60 + date.getMinutes();
  const startTime = startH * 60 + startM;
  const endTime = endH * 60 + endM;

  if (startTime <= endTime) {
    return checkTime >= startTime && checkTime <= endTime;
  } else {
    // Crosses midnight
    return checkTime >= startTime || checkTime <= endTime;
  }
};

/**
 * Helper to get a Date object for the next day
 */
const getNextDay = (baseDate: Date): Date => {
  const next = new Date(baseDate);
  next.setDate(baseDate.getDate() + 1);
  return next;
};

/**
 * Helper to get a Date object for the previous day
 */
const getPrevDay = (baseDate: Date): Date => {
  const prev = new Date(baseDate);
  prev.setDate(baseDate.getDate() - 1);
  return prev;
};

/**
 * Format date to HH:mm
 */
const formatTimeHHmm = (date: Date): string => {
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
};

const isSameDay = (d1: Date, d2: Date) => 
    d1.getDate() === d2.getDate() && 
    d1.getMonth() === d2.getMonth() && 
    d1.getFullYear() === d2.getFullYear();

/**
 * Main Logic to process raw logs into shift records for a specific date (Day D).
 */
export const processShifts = (logs: RawLog[], filterDate: Date): ShiftRecord[] => {
  const records: ShiftRecord[] = [];
  
  const prevDate = getPrevDay(filterDate);
  const nextDate = getNextDay(filterDate);
  
  // We need logs from D-1, D, and D+1 to handle overlaps
  const relevantLogs = logs.filter(log => 
    isSameDay(log.timestamp, prevDate) || 
    isSameDay(log.timestamp, filterDate) || 
    isSameDay(log.timestamp, nextDate)
  );

  // Group by person
  const personLogs: Record<string, RawLog[]> = {};
  relevantLogs.forEach(log => {
    if (!personLogs[log.name]) {
      personLogs[log.name] = [];
    }
    personLogs[log.name].push(log);
  });

  // Analyze each person
  Object.keys(personLogs).forEach(name => {
    const pLogs = personLogs[name];
    const cardNum = pLogs[0].cardNum;
    
    // Track used logs to prevent double counting
    const usedLogs = new Set<RawLog>();

    // Helper to check if a specific log is already used
    const isUsed = (l: RawLog) => usedLogs.has(l);

    // =================================================================================
    // 1. NIGHT SHIFT (เวรดึก) for Day D
    // Core: 00:00 - 08:00 (Day D)
    // Entry Window: Day D-1 22:00 (Extended -2.5h) to Day D 01:00 (Extended +0.5h)
    // Exit Window:  Day D 08:00 to Day D 10:30 (Extended +2.5h)
    // =================================================================================
    
    let nightInLog: RawLog | undefined;
    let nightOutLog: RawLog | undefined;

    // Find Potential Entry
    const potentialNightEntries = pLogs.filter(l => !isUsed(l) && (
        (isSameDay(l.timestamp, prevDate) && isTimeInRange(l.timestamp, 22, 0, 23, 59)) ||
        (isSameDay(l.timestamp, filterDate) && isTimeInRange(l.timestamp, 0, 0, 1, 0))
    ));

    // Resolve Ambiguity for entries around 00:00-01:00
    for (const entry of potentialNightEntries) {
        // Check if it's potentially an Afternoon Exit from yesterday
        if (isSameDay(entry.timestamp, filterDate) && entry.timestamp.getHours() <= 1) {
            const hasYesterdayAfternoonIn = pLogs.some(l => 
                isSameDay(l.timestamp, prevDate) && isTimeInRange(l.timestamp, 14, 0, 17, 0)
            );
            
            const hasTodayNightOut = pLogs.some(l => 
                isSameDay(l.timestamp, filterDate) && isTimeInRange(l.timestamp, 8, 0, 10, 30)
            );

            // If came in yesterday afternoon and NO morning exit today, assume this is the exit
            if (hasYesterdayAfternoonIn && !hasTodayNightOut) {
                continue; 
            }
        }
        nightInLog = entry;
        break; 
    }

    if (nightInLog) {
        // Find Pair Exit
        nightOutLog = pLogs.find(l => !isUsed(l) && 
            isSameDay(l.timestamp, filterDate) && 
            isTimeInRange(l.timestamp, 8, 0, 10, 30)
        );

        usedLogs.add(nightInLog);
        if (nightOutLog) usedLogs.add(nightOutLog);

        records.push({
            id: `${cardNum}-N-${filterDate.getDate()}`,
            cardNum,
            name,
            shift: ShiftType.NIGHT,
            date: filterDate,
            inTime: formatTimeHHmm(nightInLog.timestamp),
            outTime: nightOutLog ? formatTimeHHmm(nightOutLog.timestamp) : null,
            remarks: ''
        });
    }

    // =================================================================================
    // 2. MORNING SHIFT (เวรเช้า) for Day D
    // Core: 08:00 - 16:00
    // Entry Window: Day D 06:00 (Extended -2h) to 09:30 (Extended +1.5h)
    // Exit Window:  Day D 15:30 (Extended -0.5h) to 18:30 (Extended +2.5h)
    // =================================================================================

    const morningInLog = pLogs.find(l => !isUsed(l) && 
        isSameDay(l.timestamp, filterDate) && 
        isTimeInRange(l.timestamp, 6, 0, 9, 30)
    );

    if (morningInLog) {
        // Find Pair Exit
        const morningOutLog = pLogs.find(l => !isUsed(l) && 
            isSameDay(l.timestamp, filterDate) && 
            isTimeInRange(l.timestamp, 15, 30, 18, 30)
        );

        usedLogs.add(morningInLog);
        if (morningOutLog) usedLogs.add(morningOutLog);

        records.push({
            id: `${cardNum}-M-${filterDate.getDate()}`,
            cardNum,
            name,
            shift: ShiftType.MORNING,
            date: filterDate,
            inTime: formatTimeHHmm(morningInLog.timestamp),
            outTime: morningOutLog ? formatTimeHHmm(morningOutLog.timestamp) : null,
            remarks: ''
        });
    }

    // =================================================================================
    // 3. AFTERNOON SHIFT (เวรบ่าย) for Day D
    // Core: 16:00 - 00:00
    // Entry Window: Day D 14:00 (Extended -2h) to 17:00 (Extended +1h)
    // Exit Window:  Day D 23:00 (Extended -1h) to Day D+1 02:30 (Extended +2.5h)
    // =================================================================================

    const afternoonInLog = pLogs.find(l => !isUsed(l) && 
        isSameDay(l.timestamp, filterDate) && 
        isTimeInRange(l.timestamp, 14, 0, 17, 0)
    );

    if (afternoonInLog) {
        // Find Pair Exit
        const afternoonOutLog = pLogs.find(l => !isUsed(l) && (
            (isSameDay(l.timestamp, filterDate) && isTimeInRange(l.timestamp, 23, 0, 23, 59)) ||
            (isSameDay(l.timestamp, nextDate) && isTimeInRange(l.timestamp, 0, 0, 2, 30))
        ));

        usedLogs.add(afternoonInLog);
        if (afternoonOutLog) usedLogs.add(afternoonOutLog);

        records.push({
            id: `${cardNum}-A-${filterDate.getDate()}`,
            cardNum,
            name,
            shift: ShiftType.AFTERNOON,
            date: filterDate,
            inTime: formatTimeHHmm(afternoonInLog.timestamp),
            outTime: afternoonOutLog ? formatTimeHHmm(afternoonOutLog.timestamp) : null,
            remarks: ''
        });
    }

  });

  const sortOrder = { [ShiftType.NIGHT]: 1, [ShiftType.MORNING]: 2, [ShiftType.AFTERNOON]: 3, [ShiftType.UNKNOWN]: 4 };
  return records.sort((a, b) => sortOrder[a.shift] - sortOrder[b.shift]);
};

export interface MonthlyShiftData {
  name: string;
  shiftsByDay: Record<number, string[]>; // day -> ['M', 'A']
}

export const getMonthlyShiftData = (logs: RawLog[], year: number, month: number): MonthlyShiftData[] => {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const allData: Record<string, Record<number, string[]>> = {};

  // Initialize with all known names from logs (even if outside this month, to be safe)
  // Or better, filter logs to only this month first to identify active users
  const relevantLogs = logs.filter(l => 
    l.timestamp.getMonth() === month && l.timestamp.getFullYear() === year
  );
  
  // Also include D-1 and Next Month D1 for shift processing context, but strictly we iterate the month days
  // Let's just find unique names in the rough range
  const uniqueNames = Array.from(new Set(logs.map(l => l.name)));
  
  uniqueNames.forEach(name => {
    allData[name] = {};
    for (let d = 1; d <= daysInMonth; d++) {
      allData[name][d] = [];
    }
  });

  // For every day of the month, process shifts
  for (let d = 1; d <= daysInMonth; d++) {
    const currentProcessDate = new Date(year, month, d);
    const dayRecords = processShifts(logs, currentProcessDate);
    
    dayRecords.forEach(record => {
      if (!allData[record.name]) {
        allData[record.name] = {}; // Should be init already but safety check
      }
      if (!allData[record.name][d]) {
        allData[record.name][d] = [];
      }
      
      let symbol = '';
      if (record.shift === ShiftType.MORNING) symbol = 'ช';
      else if (record.shift === ShiftType.AFTERNOON) symbol = 'บ';
      else if (record.shift === ShiftType.NIGHT) symbol = 'ด';
      
      if (symbol) {
        allData[record.name][d].push(symbol);
      }
    });
  }

  // Convert to array
  return Object.keys(allData).map(name => ({
    name,
    shiftsByDay: allData[name]
  })).sort((a, b) => a.name.localeCompare(b.name));
};

import { RawLog } from '../types';

const SHEET_ID = '19RGdbc0CtX7nOPDKYgMwUDhnu-W85RA_LoYgdD7xfqs';
const SHEET_NAME = 'แสดงผล';

// Helper to parse date string
// Handles DD/MM/YYYY, MM/DD/YYYY, or ISO formats
const parseDate = (dateStr: string, timeStr: string): Date => {
  if (!dateStr) return new Date();

  // Clean strings
  dateStr = dateStr.trim();
  timeStr = timeStr ? timeStr.trim() : '';

  // 1. Try parsing as ISO string first
  // Check length >= 10 to cover "YYYY-MM-DD"
  if (dateStr.includes('T') || (dateStr.includes('-') && dateStr.length >= 10)) {
     const d = new Date(dateStr);
     if (!isNaN(d.getTime())) {
         if (timeStr && timeStr.includes(':')) {
             const timeParts = timeStr.split(':');
             if (timeParts.length >= 2) {
                 d.setHours(parseInt(timeParts[0], 10), parseInt(timeParts[1], 10), parseInt(timeParts[2] || '0', 10));
             }
         }
         return d;
     }
  }

  // 2. Handle Slash separated formats
  const parts = dateStr.split(/[\/\-]/); // Split by / or -
  if (parts.length !== 3) return new Date();

  const timeParts = timeStr ? timeStr.split(':') : ['0','0','0'];
  
  let v1 = parseInt(parts[0], 10);
  let v2 = parseInt(parts[1], 10);
  let year = parseInt(parts[2], 10);
  
  const h = parseInt(timeParts[0] || '0', 10);
  const m = parseInt(timeParts[1] || '0', 10);
  const s = parseInt(timeParts[2] || '0', 10);

  // Thai Buddhist Year adjustment (e.g., 2568 -> 2025)
  if (year > 2400) year -= 543;

  // Heuristic for D/M/Y vs M/D/Y
  let month = v1 - 1;
  let day = v2;

  // If first number > 12, it must be Day (D/M/Y)
  if (v1 > 12) { 
    day = v1; 
    month = v2 - 1; 
  } else if (v2 > 12) { 
    // If second number > 12, it must be Day (M/D/Y)
    day = v2; 
    month = v1 - 1; 
  } else { 
    // Ambiguous. Default to D/M/Y for Thai context
    day = v1; 
    month = v2 - 1; 
  }

  const d = new Date(year, month, day, h, m, s);
  
  // Validate if date is reasonable (e.g. not NaN)
  if (isNaN(d.getTime())) return new Date();
  
  return d;
};

export const fetchSheetData = async (): Promise<RawLog[]> => {
  // Add a timestamp to bypass caching mechanisms
  const cacheBuster = `&_t=${new Date().getTime()}`;
  const encodedName = encodeURIComponent(SHEET_NAME);
  
  const targetUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&sheet=${encodedName}${cacheBuster}`;
  const gvizUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodedName}${cacheBuster}`;
  
  // Try multiple proxies and URLs in order
  const attempts = [
    // Corsproxy with export URL (usually most reliable for public sheets)
    { url: `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`, name: 'CorsProxy Export' },
    // AllOrigins with export URL
    { url: `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`, name: 'AllOrigins Export' },
    // Corsproxy with Gviz URL
    { url: `https://corsproxy.io/?${encodeURIComponent(gvizUrl)}`, name: 'CorsProxy Gviz' }
  ];

  let lastError: any;

  for (const attempt of attempts) {
    try {
      console.log(`Attempting to fetch via: ${attempt.name}`);
      
      const response = await fetch(attempt.url);
      
      // 401/403 usually means Private Sheet
      if (response.status === 401 || response.status === 403) {
        throw new Error("PRIVATE_SHEET");
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const text = await response.text();
      
      // Check if we got Google Login HTML page
      if (text.includes("<!DOCTYPE html") || text.includes("<html") || text.includes("Sign in")) {
        throw new Error("PRIVATE_SHEET"); 
      }

      // Parse CSV
      const rows = text.split(/\r?\n/).map(row => {
        const matches: string[] = [];
        let inQuote = false;
        let buffer = '';
        for (let i = 0; i < row.length; i++) {
          const char = row[i];
          if (char === '"') {
            inQuote = !inQuote;
          } else if (char === ',' && !inQuote) {
            matches.push(buffer);
            buffer = '';
          } else {
            buffer += char;
          }
        }
        matches.push(buffer);
        return matches.map(m => m.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
      });

      const dataRows = rows.slice(1);
      const logs: RawLog[] = [];

      dataRows.forEach(row => {
        // Ensure we have enough columns. The sheet structure is Date, Time, Card, Name.
        if (row.length >= 4) {
          const dateStr = row[0];
          const timeStr = row[1];
          const cardNum = row[2];
          const name = row[3];

          // Basic validation
          if (dateStr && name && dateStr.toLowerCase() !== 'date') {
            const timestamp = parseDate(dateStr, timeStr);
            if (timestamp.getTime() > 0 && !isNaN(timestamp.getTime())) {
              logs.push({
                date: dateStr,
                time: timeStr,
                cardNum: cardNum,
                name: name,
                timestamp: timestamp
              });
            }
          }
        }
      });

      if (logs.length === 0 && dataRows.length > 0) {
        console.warn("Parsed rows but found no valid logs, trying next proxy...");
        continue;
      }

      console.log(`Successfully parsed ${logs.length} logs via ${attempt.name}`);
      return logs.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    } catch (error: any) {
      console.error(`${attempt.name} failed:`, error);
      if (error.message === "PRIVATE_SHEET") {
        throw error;
      }
      lastError = error;
    }
  }

  throw lastError || new Error("All fetch attempts failed");
};
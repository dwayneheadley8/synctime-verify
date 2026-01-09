import Papa from 'papaparse';
import * as pdfjsLib from 'pdfjs-dist';

// Set up PDF.js worker using local public file (.mjs format)
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

export interface ParsedEntry {
  date: string; // YYYY-MM-DD format
  arrivalTime: string; // HH:MM format
  departureTime: string; // HH:MM format
  hoursWorked: number;
}

/**
 * Parse CSV file and extract timesheet data
 * Expected columns: DATE, ARRIVAL TIME, DEPARTURE TIME, HOURS WORKED
 */
export const parseCSV = (file: File): Promise<ParsedEntry[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const entries: ParsedEntry[] = [];
          
          results.data.forEach((row: any) => {
            // Normalize column names (case-insensitive, trim whitespace)
            const normalizedRow: any = {};
            Object.keys(row).forEach(key => {
              normalizedRow[key.trim().toUpperCase()] = row[key]?.trim() || '';
            });

            const date = normalizedRow['DATE'];
            const arrivalTime = normalizedRow['ARRIVAL TIME'] || normalizedRow['ARRIVAL'];
            const departureTime = normalizedRow['DEPARTURE TIME'] || normalizedRow['DEPARTURE'];
            const hoursWorked = normalizedRow['HOURS WORKED'] || normalizedRow['HOURS'];

            // Skip if essential fields are missing
            if (!date || !arrivalTime || !departureTime) return;

            // Parse date (handle various formats: MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD, etc.)
            const parsedDate = parseDate(date);
            if (!parsedDate) return;

            // Validate and format times
            const arrival = parseTime(arrivalTime);
            const departure = parseTime(departureTime);
            if (!arrival || !departure) return;

            // Calculate hours if not provided
            const hours = hoursWorked 
              ? parseFloat(hoursWorked) 
              : calculateHours(arrival, departure);

            entries.push({
              date: parsedDate,
              arrivalTime: arrival,
              departureTime: departure,
              hoursWorked: hours
            });
          });

          resolve(entries);
        } catch (err) {
          reject(new Error(`Failed to parse CSV: ${err}`));
        }
      },
      error: (err) => reject(new Error(`CSV parsing error: ${err.message}`))
    });
  });
};

/**
 * Extract text from PDF and parse timesheet data
 */
export const parsePDF = async (file: File): Promise<ParsedEntry[]> => {
  try {
    console.log('📄 Starting PDF parsing for file:', file.name);
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    console.log(`📄 PDF loaded with ${pdf.numPages} pages`);
    
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + '\n';
      console.log(`📄 Page ${i} extracted:`, pageText.substring(0, 200) + '...');
    }

    console.log('📄 Full extracted text:', fullText);
    const entries = extractEntriesFromText(fullText);
    console.log('📄 Parsed entries:', entries);
    return entries;
  } catch (err) {
    console.error('❌ PDF parsing error:', err);
    throw new Error(`Failed to parse PDF: ${err}`);
  }
};

/**
 * Extract timesheet entries from raw text (from PDF)
 * Looks for patterns like: MM/DD/YYYY HH:MM AM/PM
 */
const extractEntriesFromText = (text: string): ParsedEntry[] => {
  const entries: ParsedEntry[] = [];
  
  // Pattern to match dates and times
  // Matches: 11/27/2025, 12:00 AM, 1:00 AM, etc.
  const dateTimePattern = /(\d{1,2}\/\d{1,2}\/\d{4})\s+(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm))\s+(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm))/g;
  
  console.log('🔍 Searching for pattern:', dateTimePattern);
  
  let match;
  let matchCount = 0;
  while ((match = dateTimePattern.exec(text)) !== null) {
    matchCount++;
    console.log(`🔍 Match #${matchCount}:`, match[0]);
    const dateStr = match[1];
    const arrivalStr = match[2];
    const departureStr = match[3];

    const parsedDate = parseDate(dateStr);
    const arrival = parseTime(arrivalStr);
    const departure = parseTime(departureStr);

    console.log(`  ➜ Date: ${dateStr} → ${parsedDate}`);
    console.log(`  ➜ Arrival: ${arrivalStr} → ${arrival}`);
    console.log(`  ➜ Departure: ${departureStr} → ${departure}`);

    if (parsedDate && arrival && departure) {
      const entry = {
        date: parsedDate,
        arrivalTime: arrival,
        departureTime: departure,
        hoursWorked: calculateHours(arrival, departure)
      };
      entries.push(entry);
      console.log(`  ✅ Entry added:`, entry);
    } else {
      console.log(`  ❌ Entry rejected (missing fields)`);
    }
  }
  
  console.log(`🔍 Total matches found: ${matchCount}, entries extracted: ${entries.length}`);
  return entries;
};

/**
 * Parse date string to YYYY-MM-DD format
 * Handles: MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD, etc.
 */
const parseDate = (dateStr: string): string | null => {
  if (!dateStr) return null;

  // Try MM/DD/YYYY format (most common in US)
  let match = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (match) {
    const [, month, day, year] = match;
    const m = parseInt(month, 10);
    const d = parseInt(day, 10);
    const y = parseInt(year, 10);
    
    // Assume MM/DD/YYYY if month <= 12 and day <= 31
    if (m <= 12 && d <= 31) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }

  // Try YYYY-MM-DD format
  match = dateStr.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (match) {
    const [, year, month, day] = match;
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  return null;
};

/**
 * Parse time string to HH:MM format (24-hour)
 * Handles: 12:00 AM/PM, 2:30pm, 14:30, etc.
 */
const parseTime = (timeStr: string): string | null => {
  if (!timeStr) return null;

  timeStr = timeStr.trim().toUpperCase();

  // Pattern: HH:MM AM/PM or H:MM AM/PM
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/);
  if (!match) return null;

  let [, hour, minute, period] = match;
  let h = parseInt(hour, 10);
  const m = parseInt(minute, 10);

  if (m < 0 || m > 59) return null;

  // Convert 12-hour to 24-hour if AM/PM present
  if (period) {
    if (period === 'PM' && h !== 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
  }

  if (h < 0 || h > 23) return null;

  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

/**
 * Calculate hours worked between arrival and departure times
 * Handles overnight shifts
 */
const calculateHours = (arrivalTime: string, departureTime: string): number => {
  const [arrH, arrM] = arrivalTime.split(':').map(Number);
  const [depH, depM] = departureTime.split(':').map(Number);

  const arrivalMins = arrH * 60 + arrM;
  const departureMins = depH * 60 + depM;

  let diffMins = departureMins - arrivalMins;
  
  // Handle overnight shifts (departure < arrival)
  if (diffMins < 0) {
    diffMins += 24 * 60; // Add 24 hours
  }

  return parseFloat((diffMins / 60).toFixed(2));
};

import * as pdfjsLib from 'pdfjs-dist';

// Configure the worker using matching UNPKG CDN to ensure bundle-free operation in Vite
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@6.1.200/build/pdf.worker.min.mjs';

export interface ExtractedRecord {
  id: string;
  guestName: string;
  guestOrigin: string;
  checkIn: string;
  checkOut: string;
  uh: string;
  nota: string;
  paymentType: string;
  valor: string;
  diaria: string;
  isFiveDigits: boolean;
}

interface TextItem {
  str: string;
  transform: number[];
}

/**
 * Groups and sorts PDF text content items by Y coordinate to assemble visual lines of text.
 */
function assembleLinesFromContent(items: TextItem[]): string[] {
  const rows: { y: number; items: TextItem[] }[] = [];
  const threshold = 4; // text items on the same horizontal line usually have Y delta < 4

  for (const item of items) {
    if (!item.str || item.str.trim() === '') continue;

    const y = item.transform[5];

    let foundRow = rows.find(row => Math.abs(row.y - y) < threshold);
    if (foundRow) {
      foundRow.items.push(item);
    } else {
      rows.push({ y, items: [item] });
    }
  }

  // Sort rows from top to bottom (Y descending)
  rows.sort((a, b) => b.y - a.y);

  // For each row, sort items from left to right (X ascending) and join them
  return rows.map(row => {
    row.items.sort((a, b) => a.transform[4] - b.transform[4]);
    return row.items.map(item => item.str).join(' ').trim();
  });
}

/**
 * Parses raw text lines into structured guest records.
 */
export function parseLines(lines: string[]): ExtractedRecord[] {
  const records: ExtractedRecord[] = [];
  
  let currentGuestName = "";
  let currentGuestOrigin = "";
  
  // Matches "Nome [GUEST_NAME] Origem [GUEST_ORIGIN]"
  const guestHeaderRegex = /Nome\s+([^\s].*?)\s+Origem\s+([^\s].*)/i;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Check if this line defines a new guest header
    const headerMatch = line.match(guestHeaderRegex);
    if (headerMatch) {
      currentGuestName = headerMatch[1].trim();
      currentGuestOrigin = headerMatch[2].trim();
      continue;
    }
    
    // Check if this line starts with two dates (Check-in and Check-out)
    const dateRegex = /^(\d{2}\/\d{2}\/\d{4})\s+(\d{2}\/\d{2}\/\d{4})/;
    const dateMatch = line.match(dateRegex);
    
    if (dateMatch && currentGuestName) {
      const checkIn = dateMatch[1];
      const checkOut = dateMatch[2];
      
      // Remove dates from the beginning of the line
      let remainder = line.substring(dateMatch[0].length).trim();
      
      // Extract the last two decimal numbers (Valor and Diária)
      // Format uses Brazilian style currency separators, e.g. "2.158,83 873,00" or "228,00 340,00"
      const valuesRegex = /\s+([\d.,]+)\s+([\d.,]+)$/;
      const valuesMatch = remainder.match(valuesRegex);
      
      let valor = "";
      let diaria = "";
      if (valuesMatch) {
        valor = valuesMatch[1].trim();
        diaria = valuesMatch[2].trim();
        // Strip values out of remainder
        remainder = remainder.substring(0, remainder.length - valuesMatch[0].length).trim();
      }
      
      // Parse middle section: [UH] [Nota Tipo Pagto] [Empresa Tipo Pagto]
      // UH is optional. We extract any leading numbers.
      const middleNumbersMatch = remainder.match(/^(\d+)(?:\s+(\d+))?/);
      let uh = "";
      let nota = "";
      let paymentType = "";
      
      if (middleNumbersMatch) {
        const num1 = middleNumbersMatch[1];
        const num2 = middleNumbersMatch[2];
        
        if (num2) {
          // If we found two numbers at the start, they represent UH and Nota
          uh = num1;
          nota = num2;
          paymentType = remainder.substring(middleNumbersMatch[0].length).trim();
        } else {
          // If we found only one number at the start, it represents Nota (UH is omitted)
          nota = num1;
          paymentType = remainder.substring(num1.length).trim();
        }
      } else {
        paymentType = remainder;
      }
      
      // Validate if payment note is exactly 5 digits
      const isFiveDigits = /^\d{5}$/.test(nota);
      
      records.push({
        id: `${checkIn}-${checkOut}-${nota}-${valor}-${Math.random().toString(36).substring(2, 9)}`,
        guestName: currentGuestName,
        guestOrigin: currentGuestOrigin,
        checkIn,
        checkOut,
        uh,
        nota,
        paymentType,
        valor,
        diaria,
        isFiveDigits
      });
    }
  }
  
  return records;
}

/**
 * Reads a PDF file using pdfjs-dist, extracts text items, groups them into lines, and parses them.
 */
export async function parsePDFFile(file: File): Promise<ExtractedRecord[]> {
  const arrayBuffer = await file.arrayBuffer();
  
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  
  const allLines: string[] = [];
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const items = textContent.items as TextItem[];
    
    const pageLines = assembleLinesFromContent(items);
    allLines.push(...pageLines);
  }
  
  return parseLines(allLines);
}

/**
 * Alternative helper to parse raw pasted text.
 */
export function parsePastedText(text: string): ExtractedRecord[] {
  const lines = text.split(/\r?\n/);
  return parseLines(lines);
}

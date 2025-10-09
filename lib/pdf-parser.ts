'use client'; // Make sure this is a client component

import { useState } from 'react';

// Dynamic import - only loads in browser, not on server
const loadPdfJs = async () => {
  const pdfjsLib = await import('pdfjs-dist');
  
  // Use the correct CDN path for version 3.11.174
  pdfjsLib.GlobalWorkerOptions.workerSrc = 
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  
  return pdfjsLib;
};

export async function extractPDFText(file: File): Promise<string> {
  // Only run in browser
  if (typeof window === 'undefined') {
    throw new Error('PDF parsing must run in browser');
  }

  try {
    console.log('Starting client-side PDF text extraction...');
    const pdfjsLib = await loadPdfJs();
    const arrayBuffer = await file.arrayBuffer();
    
    console.log('Loading PDF document...');
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    console.log(`PDF loaded successfully. Pages: ${pdf.numPages}`);
    
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      console.log(`Extracting text from page ${i}/${pdf.numPages}...`);
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + '\n\n';
    }
    
    if (!fullText.trim()) {
      throw new Error('No text found in PDF');
    }
    
    console.log(`PDF text extraction successful. Total text length: ${fullText.length}`);
    return fullText.trim();
  } catch (error) {
    console.error('PDF parsing error:', error);
    throw new Error('Failed to parse PDF. Please copy and paste the text instead.');
  }
}

// Hook for managing PDF parsing state
export function usePDFParser() {
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsePDF = async (file: File): Promise<string> => {
    setIsParsing(true);
    setError(null);
    
    try {
      const text = await extractPDFText(file);
      setIsParsing(false);
      return text;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to parse PDF';
      setError(errorMessage);
      setIsParsing(false);
      throw err;
    }
  };

  return {
    parsePDF,
    isParsing,
    error,
    clearError: () => setError(null)
  };
}

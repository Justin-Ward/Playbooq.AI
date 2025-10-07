declare module 'pdf-parse' {
  interface PDFData {
    numpages: number
    numrender: number
    info: any
    metadata: any
    text: string
    version: string
  }

  interface PDFParseOptions {
    max?: number
    version?: string
    pagerender?: (pageData: any) => Promise<string>
  }

  function pdfParse(buffer: Buffer, options?: PDFParseOptions): Promise<PDFData>
  
  export = pdfParse
}

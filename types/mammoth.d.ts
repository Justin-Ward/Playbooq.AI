declare module 'mammoth' {
  interface ExtractRawTextOptions {
    buffer: Buffer
  }

  interface ExtractRawTextResult {
    value: string
    messages: any[]
  }

  interface MammothStatic {
    extractRawText(options: ExtractRawTextOptions): Promise<ExtractRawTextResult>
  }

  const mammoth: MammothStatic
  export = mammoth
}

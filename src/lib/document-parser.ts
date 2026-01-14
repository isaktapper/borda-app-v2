import mammoth from 'mammoth'
import * as XLSX from 'xlsx'

export interface ParsedDocument {
  text: string
  fileName: string
  mimeType: string
  charCount: number
}

const MAX_CHARS = 100000 // ~25k tokens

/**
 * Parse a document and extract text content
 */
export async function parseDocument(
  buffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<ParsedDocument> {
  let text = ''

  try {
    if (mimeType === 'application/pdf') {
      text = await parsePDF(buffer)
    } else if (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimeType === 'application/msword'
    ) {
      text = await parseWord(buffer)
    } else if (
      mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      mimeType === 'application/vnd.ms-excel'
    ) {
      text = await parseExcel(buffer)
    } else if (
      mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
      mimeType === 'application/vnd.ms-powerpoint'
    ) {
      text = await parsePowerPoint(buffer)
    } else if (mimeType === 'text/plain') {
      text = buffer.toString('utf-8')
    } else {
      throw new Error(`Unsupported file type: ${mimeType}`)
    }

    // Truncate if too long
    if (text.length > MAX_CHARS) {
      text = text.substring(0, MAX_CHARS) + '\n\n[Content truncated due to length...]'
    }

    return {
      text: cleanText(text),
      fileName,
      mimeType,
      charCount: text.length,
    }
  } catch (error) {
    console.error(`Error parsing document ${fileName}:`, error)
    throw new Error(`Failed to parse ${fileName}: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Parse PDF document
 */
async function parsePDF(buffer: Buffer): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdf = require('pdf-parse') as (buffer: Buffer) => Promise<{ text: string }>
  const data = await pdf(buffer)
  return data.text
}

/**
 * Parse Word document (.docx)
 */
async function parseWord(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer })
  return result.value
}

/**
 * Parse Excel document (.xlsx, .xls)
 */
async function parseExcel(buffer: Buffer): Promise<string> {
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const sheets: string[] = []

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName]
    const csv = XLSX.utils.sheet_to_csv(sheet)
    sheets.push(`## Sheet: ${sheetName}\n${csv}`)
  }

  return sheets.join('\n\n')
}

/**
 * Parse PowerPoint document (.pptx)
 * Extracts text from slides using ZIP extraction
 */
async function parsePowerPoint(buffer: Buffer): Promise<string> {
  // PowerPoint files are ZIP archives containing XML
  const JSZip = (await import('jszip')).default
  const zip = await JSZip.loadAsync(buffer)
  
  const slides: string[] = []
  const slideFiles = Object.keys(zip.files)
    .filter(name => name.match(/ppt\/slides\/slide\d+\.xml$/))
    .sort((a, b) => {
      const numA = parseInt(a.match(/slide(\d+)/)?.[1] || '0')
      const numB = parseInt(b.match(/slide(\d+)/)?.[1] || '0')
      return numA - numB
    })

  for (const slideFile of slideFiles) {
    const content = await zip.files[slideFile].async('string')
    // Extract text from XML (simple regex-based extraction)
    const textMatches = content.match(/<a:t>([^<]*)<\/a:t>/g) || []
    const slideText = textMatches
      .map(match => match.replace(/<\/?a:t>/g, ''))
      .filter(text => text.trim())
      .join(' ')
    
    if (slideText.trim()) {
      const slideNum = slideFile.match(/slide(\d+)/)?.[1] || '?'
      slides.push(`## Slide ${slideNum}\n${slideText}`)
    }
  }

  return slides.join('\n\n')
}

/**
 * Clean and normalize extracted text
 */
function cleanText(text: string): string {
  return text
    // Normalize whitespace
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Remove excessive newlines
    .replace(/\n{4,}/g, '\n\n\n')
    // Remove excessive spaces
    .replace(/[ \t]{2,}/g, ' ')
    // Trim lines
    .split('\n')
    .map(line => line.trim())
    .join('\n')
    .trim()
}

/**
 * Get supported MIME types
 */
export const SUPPORTED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-powerpoint',
  'text/plain',
]

/**
 * Get supported file extensions
 */
export const SUPPORTED_EXTENSIONS = ['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.pptx', '.ppt', '.txt']

/**
 * Check if a file type is supported
 */
export function isSupportedFileType(mimeType: string): boolean {
  return SUPPORTED_MIME_TYPES.includes(mimeType)
}

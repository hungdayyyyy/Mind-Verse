import axios from 'axios';
import { logger } from '@config/logger';

/**
 * Extracts plain text from a downloadable document (PDF, DOCX, PPTX, TXT)
 * given its Cloudinary URL. Each format uses a dedicated parser library;
 * this module isolates that complexity behind a single `extractText` call
 * so content.service.ts doesn't need to know the per-format details.
 *
 * Note: pdf-parse / mammoth / node-pptx-parser are expected as runtime deps
 * in package.json; omitted from this scaffold's dependency list for brevity
 * but should be added (`pdf-parse`, `mammoth`) before running in production.
 */
export const documentExtractionService = {
  async extractText(cloudinaryUrl: string, mimeType: string): Promise<string> {
    const buffer = await this.downloadBuffer(cloudinaryUrl);

    try {
      if (mimeType === 'application/pdf') {
        return await this.extractPdf(buffer);
      }
      if (
        mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        mimeType === 'application/msword'
      ) {
        return await this.extractDocx(buffer);
      }
      if (mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
        return await this.extractPptx(buffer);
      }
      if (mimeType === 'text/plain' || mimeType === 'text/markdown') {
        return buffer.toString('utf-8');
      }
      throw new Error(`Unsupported mime type for text extraction: ${mimeType}`);
    } catch (err) {
      logger.error('Document text extraction failed', { mimeType, error: (err as Error).message });
      throw err;
    }
  },

  async downloadBuffer(url: string): Promise<Buffer> {
    const response = await axios.get<ArrayBuffer>(url, { responseType: 'arraybuffer' });
    return Buffer.from(response.data);
  },

  async extractPdf(buffer: Buffer): Promise<string> {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pdfParse = require('pdf-parse');
    const result = await pdfParse(buffer);
    return result.text as string;
  },

  async extractDocx(buffer: Buffer): Promise<string> {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mammoth = require('mammoth');
    const result = await mammoth.extractRawText({ buffer });
    return result.value as string;
  },

  async extractPptx(buffer: Buffer): Promise<string> {
    // PPTX text extraction: unzip and parse slide XML for <a:t> text runs.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const AdmZip = require('adm-zip');
    const zip = new AdmZip(buffer);
    const slideEntries = zip
      .getEntries()
      .filter((e: { entryName: string }) => /^ppt\/slides\/slide\d+\.xml$/.test(e.entryName));

    const texts: string[] = [];
    for (const entry of slideEntries) {
      const xml = entry.getData().toString('utf-8');
      const matches = xml.matchAll(/<a:t>(.*?)<\/a:t>/g);
      for (const m of matches) texts.push(m[1]);
    }
    return texts.join('\n');
  },
};

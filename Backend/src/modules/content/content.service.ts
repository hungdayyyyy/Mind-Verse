import { ContentItem } from './content.model';
import { ContentItemDocument, ContentType } from './content.types';
import { Project } from '@modules/projects/project.model';
import { NotFoundError, PlanLimitError, ValidationError } from '@shared/errors';
import { paginate, PaginatedResult } from '@shared/utils/paginate';
import { generateSignedUploadParams } from '@config/cloudinary';
import { generateShareToken } from '@shared/utils/generateToken';
import { config, env } from '@config/index';
import { logger } from '@config/logger';
import { enqueueInitialProcessing, contentProcessingQueue } from '@workers/queue';
import { JOB_NAMES } from '@shared/constants/queues';
import { documentExtractionService } from '@shared/services/documentExtraction.service';
import { extractYoutubeVideoId, youtubeService } from '@shared/services/youtube.service';
import { UploadContentBody, YoutubeIngestBody, UpdateContentBody, ShareContentBody } from './content.schema';

const TYPE_SIZE_LIMITS: Record<string, number> = {
  video: config.upload.maxVideoSizeBytes,
  audio: config.upload.maxAudioSizeBytes,
  pdf: config.upload.maxPdfSizeBytes,
  doc: config.upload.maxDocSizeBytes,
  pptx: config.upload.maxPptxSizeBytes,
  txt: config.upload.maxTxtSizeBytes,
};

const AV_TYPES: ContentType[] = ['video', 'audio', 'youtube'];

export const contentService = {
  async listByProject(
    projectId: string | undefined,
    folderId: string | undefined,
    cursor?: string,
    limit?: number
  ): Promise<PaginatedResult<ContentItemDocument>> {
    const filter: Record<string, unknown> = { deletedAt: null };
    if (projectId) filter.projectId = projectId;
    if (folderId) filter.folderId = folderId;
    return paginate(ContentItem, filter, { cursor, limit });
  },

  async getById(contentItemId: string): Promise<ContentItemDocument> {
    const item = await ContentItem.findOne({ _id: contentItemId, deletedAt: null });
    if (!item) throw new NotFoundError('Content item');
    return item;
  },

  /**
   * Step 1 of UC-005 (Upload Video Content): validates plan limits and file
   * size against the declared type, creates a `pending` content item, and
   * returns a Cloudinary signed upload payload for the client to upload
   * directly to Cloudinary (the API never proxies large file bytes).
   *
   * The processing pipeline is NOT enqueued here — it's triggered by
   * `confirmUploadComplete`, called once the Cloudinary webhook (or client
   * callback) confirms the bytes have landed.
   */
  async initiateUpload(
    ownerId: string,
    plan: 'free' | 'pro' | 'premium',
    input: UploadContentBody
  ): Promise<{ contentItemId: string; signedUploadUrl: string; uploadParams: Record<string, string> }> {
    const monthlyLimit = config.plans[plan].maxUploadsPerMonth;
    if (Number.isFinite(monthlyLimit)) {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const uploadsThisMonth = await ContentItem.countDocuments({
        ownerId,
        createdAt: { $gte: startOfMonth },
        deletedAt: null,
      });
      if (uploadsThisMonth >= monthlyLimit) {
        throw new PlanLimitError(
          `Your plan is limited to ${monthlyLimit} uploads per month. Upgrade for unlimited uploads.`,
          { limit: monthlyLimit }
        );
      }
    }

    const sizeLimit = TYPE_SIZE_LIMITS[input.type];
    if (sizeLimit && input.fileSize > sizeLimit) {
      throw new ValidationError({
        formErrors: [`File exceeds the ${(sizeLimit / (1024 * 1024)).toFixed(0)}MB limit for ${input.type} files.`],
        fieldErrors: {},
      });
    }

    const item = await ContentItem.create({
      title: input.title,
      type: input.type,
      projectId: input.projectId,
      folderId: input.folderId ?? null,
      ownerId,
      source: { mimeType: input.mimeType, fileSize: input.fileSize },
      processingStatus: 'pending',
    });

    const resourceType = input.type === 'video' ? 'video' : input.type === 'audio' ? 'video' : 'raw';
    const signed = generateSignedUploadParams({
      resourceType,
      publicId: item._id.toString(),
    });

    logger.info('Content upload initiated', { contentItemId: item._id.toString(), type: input.type });

    return {
      contentItemId: item._id.toString(),
      signedUploadUrl: signed.uploadUrl,
      uploadParams: {
        timestamp: String(signed.timestamp),
        signature: signed.signature,
        api_key: signed.apiKey,
        folder: signed.folder,
        public_id: item._id.toString(),
      },
    };
  },

  /**
   * Called once Cloudinary confirms the upload landed (via webhook in
   * production). Updates the content item with the final Cloudinary
   * resource info and kicks off the processing pipeline.
   */
  async confirmUploadComplete(
    contentItemId: string,
    cloudinaryData: { cloudinaryId: string; cloudinaryUrl: string; duration?: number; thumbnailUrl?: string }
  ): Promise<ContentItemDocument> {
    const item = await this.getById(contentItemId);

    item.source.cloudinaryId = cloudinaryData.cloudinaryId;
    item.source.cloudinaryUrl = cloudinaryData.cloudinaryUrl;
    if (cloudinaryData.duration) item.source.duration = cloudinaryData.duration;
    if (cloudinaryData.thumbnailUrl) item.source.thumbnailUrl = cloudinaryData.thumbnailUrl;
    item.processingStatus = 'processing';
    await item.save();

    await this.startProcessingPipeline(item);
    return item;
  },

  /**
   * UC-006: Imports a YouTube video by URL. Fetches metadata immediately,
   * then attempts to retrieve existing captions; falls back to audio
   * download + Whisper transcription if none are available.
   */
  async ingestYoutube(ownerId: string, input: YoutubeIngestBody): Promise<ContentItemDocument> {
    const videoId = extractYoutubeVideoId(input.url);
    const metadata = await youtubeService.getMetadata(videoId);

    const item = await ContentItem.create({
      title: metadata.title,
      type: 'youtube',
      projectId: input.projectId,
      folderId: input.folderId ?? null,
      ownerId,
      source: {
        url: input.url,
        youtubeVideoId: videoId,
        thumbnailUrl: metadata.thumbnailUrl,
        duration: metadata.duration,
      },
      processingStatus: 'processing',
    });

    logger.info('YouTube content ingested', { contentItemId: item._id.toString(), videoId });

    // Try captions first (cheap, fast); the worker decides whether to fall
    // back to Whisper if this resolves to null.
    const captions = await youtubeService.getCaptions(videoId);
    if (captions) {
      item.transcript.text = captions;
      item.transcript.language = 'en';
      item.processingJobs.transcribe = 'completed';
      await item.save();
      await this.fanOutAfterTranscription(item._id.toString(), ownerId, captions, []);
    } else {
      await enqueueInitialProcessing({
        contentItemId: item._id.toString(),
        userId: ownerId,
        needsTranscription: true,
        youtubeVideoId: videoId,
      });
    }

    return item;
  },

  /**
   * Decides whether a content item needs Whisper transcription (audio/video/
   * YouTube without captions) or synchronous text extraction (PDF/DOCX/PPTX/TXT),
   * and kicks off the appropriate path.
   */
  async startProcessingPipeline(item: ContentItemDocument): Promise<void> {
    if (AV_TYPES.includes(item.type)) {
      await enqueueInitialProcessing({
        contentItemId: item._id.toString(),
        userId: item.ownerId.toString(),
        needsTranscription: true,
        cloudinaryUrl: item.source.cloudinaryUrl ?? undefined,
      });
      return;
    }

    // Document types: extract text synchronously (fast, no AI call needed)
    // then fan out directly to notes/flashcards/quiz/embeddings.
    const text = await documentExtractionService.extractText(item.source.cloudinaryUrl!, item.source.mimeType!);
    item.transcript.text = text;
    item.transcript.wordCount = text.split(/\s+/).length;
    item.processingJobs.transcribe = 'skipped';
    await item.save();

    await this.fanOutAfterTranscription(item._id.toString(), item.ownerId.toString(), text, []);
  },

  /** Enqueues the four downstream jobs that depend on transcript/extracted text. */
  async fanOutAfterTranscription(
    contentItemId: string,
    userId: string,
    sourceText: string,
    segments: Array<{ start: number; end: number; text: string }>
  ): Promise<void> {
    await Promise.all([
      contentProcessingQueue.add(JOB_NAMES.GENERATE_NOTES, { contentItemId, userId, sourceText }),
      contentProcessingQueue.add(JOB_NAMES.GENERATE_EMBEDDINGS, { contentItemId, userId, sourceText, segments }),
    ]);
  },

  async updateContent(contentItemId: string, input: UpdateContentBody): Promise<ContentItemDocument> {
    const item = await this.getById(contentItemId);
    if (input.title !== undefined) item.title = input.title;
    if (input.tags !== undefined) item.tags = input.tags;
    if (input.folderId !== undefined) item.folderId = input.folderId as unknown as typeof item.folderId;
    await item.save();
    return item;
  },

  /** Soft-deletes a content item and its dependent documents (notes, flashcards, etc). */
  async deleteContent(contentItemId: string): Promise<void> {
    const item = await this.getById(contentItemId);
    item.deletedAt = new Date();
    await item.save();
    logger.info('Content item soft-deleted', { contentItemId });
  },

  /**
   * Re-triggers a single pipeline stage (or the full pipeline) for an
   * existing content item — e.g., "Regenerate notes" without re-transcribing.
   */
  async reprocess(contentItemId: string, stage: string): Promise<void> {
    const item = await this.getById(contentItemId);
    const userId = item.ownerId.toString();

    if (stage === 'all') {
      item.processingStatus = 'processing';
      await item.save();
      await this.startProcessingPipeline(item);
      return;
    }

    const sourceText = item.transcript.text ?? '';

    switch (stage) {
      case 'transcribe':
        item.processingJobs.transcribe = 'pending';
        await item.save();
        await enqueueInitialProcessing({
          contentItemId,
          userId,
          needsTranscription: true,
          cloudinaryUrl: item.source.cloudinaryUrl ?? undefined,
          youtubeVideoId: item.source.youtubeVideoId ?? undefined,
        });
        break;
      case 'notes':
        await contentProcessingQueue.add(JOB_NAMES.GENERATE_NOTES, { contentItemId, userId, sourceText });
        break;
      case 'flashcards':
        await contentProcessingQueue.add(JOB_NAMES.GENERATE_FLASHCARDS, { contentItemId, userId });
        break;
      case 'quiz':
        await contentProcessingQueue.add(JOB_NAMES.GENERATE_QUIZ, { contentItemId, userId });
        break;
      case 'embeddings':
        await contentProcessingQueue.add(JOB_NAMES.GENERATE_EMBEDDINGS, {
          contentItemId,
          userId,
          sourceText,
          segments: item.transcript.segments,
        });
        break;
      default:
        throw new ValidationError({ formErrors: [`Unknown processing stage: ${stage}`], fieldErrors: {} });
    }

    logger.info('Content reprocessing triggered', { contentItemId, stage });
  },

  async createShareLink(
    contentItemId: string,
    ownerId: string,
    input: ShareContentBody
  ): Promise<{ url: string; token: string }> {
    const item = await this.getById(contentItemId);
    const token = generateShareToken();
    item.shareToken = token;
    item.isPublic = true;
    await item.save();

    const { ShareLink } = await import('./shareLink.model');
    await ShareLink.create({
      resourceType: 'content',
      resourceId: item._id,
      token,
      ownerId,
      permissions: input.permissions,
      expiresAt: input.expiresAt ?? null,
    });

    return { url: `${env.FRONTEND_URL}/shared/${token}`, token };
  },

  /** Used by RBAC resolvers on routes scoped by content item id rather than project id. */
  async getProjectIdForContent(contentItemId: string): Promise<string> {
    const item = await this.getById(contentItemId);
    return item.projectId.toString();
  },
};

// Re-export for places that need direct project membership checks bypassing content ownership.
export { Project as _ProjectRefForTypeCheck };

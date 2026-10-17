import { Injectable, OnModuleDestroy, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
@Injectable()
export class R2Storage implements OnModuleDestroy {
  private client?: S3Client;
  constructor(private readonly config: ConfigService) {}
  configured(): boolean { return ['R2_ENDPOINT','R2_BUCKET','R2_ACCESS_KEY_ID','R2_SECRET_ACCESS_KEY','MEDIA_PUBLIC_BASE_URL'].every(key => !!this.config.get<string>(key)); }
  requireConfigured(): void { if (!this.configured()) throw new ServiceUnavailableException(); }
  private sdk(): S3Client {
    this.requireConfigured();
    return this.client ??= new S3Client({ region: 'auto', endpoint: this.config.getOrThrow<string>('R2_ENDPOINT'), forcePathStyle: true,
      credentials: { accessKeyId: this.config.getOrThrow<string>('R2_ACCESS_KEY_ID'), secretAccessKey: this.config.getOrThrow<string>('R2_SECRET_ACCESS_KEY') },
      maxAttempts: 2, requestChecksumCalculation: 'WHEN_REQUIRED', responseChecksumValidation: 'WHEN_REQUIRED' });
  }
  async put(key: string, body: Buffer, mimeType: string): Promise<void> {
    try { await this.sdk().send(new PutObjectCommand({ Bucket: this.config.getOrThrow<string>('R2_BUCKET'), Key: key, Body: body, ContentType: mimeType,
      ContentLength: body.length,...(!mimeType.startsWith('image/')?{ContentDisposition:'attachment'}:{}), CacheControl: 'public,max-age=31536000,immutable' }), { abortSignal: AbortSignal.timeout(15000) }); }
    catch { throw new ServiceUnavailableException(); }
  }
  async removeFailed(key: string): Promise<void> {
    if (!/^techyfellow\/media\/[a-f0-9]{32}\.(jpg|png|webp|pdf|txt)$/.test(key)) throw new ServiceUnavailableException();
    try { await this.sdk().send(new DeleteObjectCommand({ Bucket: this.config.getOrThrow<string>('R2_BUCKET'), Key: key }), { abortSignal: AbortSignal.timeout(15000) }); }
    catch { throw new ServiceUnavailableException(); }
  }
  url(key: string): string | undefined { const base = this.config.get<string>('MEDIA_PUBLIC_BASE_URL'); return base && /^techyfellow\/media\/[a-f0-9]{32}\.(jpg|png|webp|pdf|txt)$/.test(key) ? `${base}/${key}` : undefined; }
  onModuleDestroy(): void { this.client?.destroy(); }
}

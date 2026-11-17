import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CreateBucketCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  PutBucketPolicyCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { config } from '../config.js';

/**
 * Armazenamento das imagens do cardápio.
 *
 * - "local": grava em backend/uploads e a própria API serve os arquivos (bom para desenvolvimento)
 * - "s3": envia para um serviço de objetos compatível com S3 (RustFS no docker-compose,
 *         ou AWS S3 / Cloudflare R2 em produção). Assim as imagens ficam em um serviço
 *         separado da API, que pode ser escalado de forma independente.
 */

const EXTENSIONS = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
export const ALLOWED_MIME_TYPES = Object.keys(EXTENSIONS);

export const UPLOAD_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../uploads');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class LocalStorage {
  async init() {
    await mkdir(UPLOAD_DIR, { recursive: true });
  }

  async save(buffer, mimeType) {
    await mkdir(UPLOAD_DIR, { recursive: true });
    const key = `${randomUUID()}.${EXTENSIONS[mimeType]}`;
    await writeFile(path.join(UPLOAD_DIR, key), buffer);
    return { key, url: `${config.publicUrl}/uploads/${key}` };
  }

  async remove(url) {
    const prefix = `${config.publicUrl}/uploads/`;
    if (!url?.startsWith(prefix)) return;
    const key = path.basename(url.slice(prefix.length));
    await unlink(path.join(UPLOAD_DIR, key)).catch(() => {});
  }
}

class S3Storage {
  constructor(options) {
    this.bucket = options.bucket;
    this.publicUrl = options.publicUrl;
    this.client = new S3Client({
      endpoint: options.endpoint,
      region: options.region,
      forcePathStyle: true, // endereço no formato /bucket/arquivo (RustFS e similares)
      credentials: { accessKeyId: options.accessKeyId, secretAccessKey: options.secretAccessKey },
    });
  }

  // Cria o bucket (se não existir) e libera leitura pública das imagens.
  // Tenta várias vezes porque no docker-compose o serviço de objetos pode subir depois da API.
  async init({ attempts = 30 } = {}) {
    for (let i = 1; i <= attempts; i += 1) {
      try {
        try {
          await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
        } catch (err) {
          if (err.$metadata?.httpStatusCode !== 404 && err.name !== 'NotFound') throw err;
          await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
          console.log(`[storage] bucket "${this.bucket}" criado`);
        }
        await this.client
          .send(
            new PutBucketPolicyCommand({
              Bucket: this.bucket,
              Policy: JSON.stringify({
                Version: '2012-10-17',
                Statement: [
                  {
                    Sid: 'LeituraPublicaDasImagens',
                    Effect: 'Allow',
                    Principal: '*',
                    Action: ['s3:GetObject'],
                    Resource: [`arn:aws:s3:::${this.bucket}/*`],
                  },
                ],
              }),
            }),
          )
          .catch((err) => console.warn('[storage] não foi possível definir leitura pública do bucket:', err.message));
        return;
      } catch (err) {
        if (i === attempts) throw err;
        await sleep(2000);
      }
    }
  }

  async save(buffer, mimeType) {
    const key = `itens/${randomUUID()}.${EXTENSIONS[mimeType]}`;
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
        CacheControl: 'public, max-age=31536000',
      }),
    );
    return { key, url: `${this.publicUrl}/${this.bucket}/${key}` };
  }

  async remove(url) {
    const prefix = `${this.publicUrl}/${this.bucket}/`;
    if (!url?.startsWith(prefix)) return;
    await this.client
      .send(new DeleteObjectCommand({ Bucket: this.bucket, Key: url.slice(prefix.length) }))
      .catch((err) => console.warn('[storage] não foi possível remover a imagem:', err.message));
  }
}

export const storage = config.storage.driver === 's3' ? new S3Storage(config.storage.s3) : new LocalStorage();

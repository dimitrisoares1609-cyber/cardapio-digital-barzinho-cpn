import { createHmac } from 'node:crypto';
import dotenv from 'dotenv';

dotenv.config({ quiet: true });

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === '') {
    throw new Error(`Variável de ambiente ${name} não definida (veja o .env.example)`);
  }
  return value;
}

const port = Number(process.env.PORT || 3333);

export const config = {
  env: process.env.NODE_ENV || 'development',
  port,
  // URL pública da API, usada para montar o link das imagens salvas localmente
  publicUrl: (process.env.PUBLIC_URL || `http://localhost:${port}`).replace(/\/$/, ''),
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  // base dos links das imagens enviadas; vazio = caminho relativo (/uploads/...), que funciona em qualquer domínio
  mediaBaseUrl: (process.env.MEDIA_BASE_URL ?? process.env.PUBLIC_URL ?? `http://localhost:${port}`).replace(/\/$/, ''),

  databaseUrl: required('DATABASE_URL', 'postgres://postgres:postgres@localhost:5432/cardapio'),

  jwt: {
    secret: required('JWT_SECRET', process.env.NODE_ENV === 'production' ? undefined : 'troque-este-segredo-em-producao'),
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  },

  admin: {
    name: process.env.ADMIN_NAME || 'Administrador',
    email: process.env.ADMIN_EMAIL || 'admin@barzinhocpn.com.br',
    password: process.env.ADMIN_PASSWORD || 'admin123',
  },

  storage: {
    driver: process.env.STORAGE_DRIVER || 'local', // local | s3
    s3: {
      endpoint: process.env.S3_ENDPOINT,
      region: process.env.S3_REGION || 'us-east-1',
      bucket: process.env.S3_BUCKET || 'cardapio',
      accessKeyId: process.env.S3_ACCESS_KEY,
      secretAccessKey: process.env.S3_SECRET_KEY,
      // endereço que o navegador usa para baixar as imagens (pode ser diferente do endpoint interno)
      publicUrl: (process.env.S3_PUBLIC_URL || process.env.S3_ENDPOINT || '').replace(/\/$/, ''),
    },
  },

  tables: {
    // Chave dos QR codes das mesas. Se não for definida, é derivada do JWT_SECRET (fica estável no servidor).
    // Trocar essa chave invalida todas as plaquinhas impressas.
    get secret() {
      return process.env.TABLE_SECRET || createHmac('sha256', String(process.env.JWT_SECRET || 'dev')).update('qr-mesas-v1').digest('hex');
    },
    // Exigir QR da mesa para fazer pedido (padrão: sim). TABLE_QR_REQUIRED=false desliga.
    required: process.env.TABLE_QR_REQUIRED !== 'false',
  },

  establishmentName: process.env.ESTABLISHMENT_NAME || 'Barzinho CPN',
};

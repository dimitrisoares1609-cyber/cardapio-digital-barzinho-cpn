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

  establishmentName: process.env.ESTABLISHMENT_NAME || 'Barzinho CPN',
};

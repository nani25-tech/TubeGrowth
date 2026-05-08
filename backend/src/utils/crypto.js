import crypto from 'crypto';

const PREFIX = 'enc:v1:';

const getKeyMaterial = () => {
  const seed = process.env.APP_ENCRYPTION_KEY
    || process.env.JWT_ACCESS_SECRET
    || process.env.JWT_REFRESH_SECRET
    || 'tubegrowth-development-key';

  return crypto.createHash('sha256').update(seed).digest();
};

export const encryptValue = (value) => {
  if (value === undefined || value === null || value === '') {
    return '';
  }

  if (typeof value !== 'string') {
    return String(value);
  }

  if (value.startsWith(PREFIX)) {
    return value;
  }

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKeyMaterial(), iv);

  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${PREFIX}${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
};

export const decryptValue = (value) => {
  if (!value || typeof value !== 'string') {
    return '';
  }

  if (!value.startsWith(PREFIX)) {
    return value;
  }

  const payload = value.slice(PREFIX.length);
  const [ivBase64, tagBase64, dataBase64] = payload.split(':');

  if (!ivBase64 || !tagBase64 || !dataBase64) {
    return '';
  }

  try {
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      getKeyMaterial(),
      Buffer.from(ivBase64, 'base64')
    );

    decipher.setAuthTag(Buffer.from(tagBase64, 'base64'));

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(dataBase64, 'base64')),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  } catch (error) {
    console.error('Decrypt value error:', error);
    return '';
  }
};

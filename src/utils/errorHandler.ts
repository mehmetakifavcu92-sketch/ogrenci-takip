export interface AppError {
  code: string;
  message: string;
  details?: unknown;
  timestamp: Date;
}

export class CustomError extends Error {
  public code: string;
  public details?: unknown;

  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'CustomError';
    this.code = code;
    this.details = details;
  }
}

export const handleError = (error: unknown): AppError => {
  const timestamp = new Date();

  if (error instanceof CustomError) {
    return {
      code: error.code,
      message: error.message,
      details: error.details,
      timestamp
    };
  }

  if (error instanceof Error) {
    return {
      code: 'UNKNOWN_ERROR',
      message: error.message,
      details: error.stack,
      timestamp
    };
  }

  if (typeof error === 'string') {
    return {
      code: 'STRING_ERROR',
      message: error,
      timestamp
    };
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: 'Bilinmeyen hata oluştu',
    details: error,
    timestamp
  };
};

export const createError = (code: string, message: string, details?: unknown): CustomError => {
  return new CustomError(code, message, details);
};

// Firebase specific errors
export const FIREBASE_ERRORS = {
  'auth/user-not-found': 'Kullanıcı bulunamadı',
  'auth/wrong-password': 'Yanlış şifre',
  'auth/email-already-in-use': 'Bu e-posta adresi zaten kullanılıyor',
  'auth/weak-password': 'Şifre çok zayıf',
  'auth/invalid-email': 'Geçersiz e-posta adresi',
  'permission-denied': 'Bu işlem için yetkiniz yok',
  'not-found': 'Kayıt bulunamadı',
  'already-exists': 'Bu kayıt zaten mevcut'
} as const;

export const getFirebaseErrorMessage = (errorCode: string): string => {
  return FIREBASE_ERRORS[errorCode as keyof typeof FIREBASE_ERRORS] || 'Bilinmeyen hata';
};


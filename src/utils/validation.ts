import { ValidationError } from '../types/common';

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: unknown) => boolean | string;
  message?: string;
}

export interface ValidationSchema {
  [key: string]: ValidationRule;
}

export const validateField = (value: unknown, rules: ValidationRule): string | null => {
  // Required check
  if (rules.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
    return rules.message || 'Bu alan zorunludur';
  }

  if (!value) return null;

  // Type checks
  if (typeof value === 'string') {
    // Min length
    if (rules.minLength && value.length < rules.minLength) {
      return rules.message || `En az ${rules.minLength} karakter olmalıdır`;
    }

    // Max length
    if (rules.maxLength && value.length > rules.maxLength) {
      return rules.message || `En fazla ${rules.maxLength} karakter olmalıdır`;
    }

    // Pattern
    if (rules.pattern && !rules.pattern.test(value)) {
      return rules.message || 'Geçersiz format';
    }
  }

  // Custom validation
  if (rules.custom) {
    const result = rules.custom(value);
    if (typeof result === 'string') {
      return result;
    }
    if (!result) {
      return rules.message || 'Geçersiz değer';
    }
  }

  return null;
};

export const validateForm = (data: Record<string, unknown>, schema: ValidationSchema): ValidationError[] => {
  const errors: ValidationError[] = [];

  for (const [field, rules] of Object.entries(schema)) {
    const error = validateField(data[field], rules);
    if (error) {
      errors.push({ field, message: error });
    }
  }

  return errors;
};

// Common validation rules
export const VALIDATION_RULES = {
  email: {
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Geçerli bir e-posta adresi giriniz'
  },
  password: {
    required: true,
    minLength: 6,
    message: 'Şifre en az 6 karakter olmalıdır'
  },
  name: {
    required: true,
    minLength: 2,
    maxLength: 50,
    message: 'İsim 2-50 karakter arasında olmalıdır'
  },
  phone: {
    pattern: /^[0-9+\-\s()]+$/,
    message: 'Geçerli bir telefon numarası giriniz'
  },
  username: {
    required: true,
    minLength: 3,
    maxLength: 20,
    pattern: /^[a-zA-Z0-9_]+$/,
    message: 'Kullanıcı adı 3-20 karakter arasında olmalı ve sadece harf, rakam ve alt çizgi içerebilir'
  },
  number: {
    custom: (value: unknown) => {
      if (typeof value === 'number') return true;
      if (typeof value === 'string') {
        const num = parseFloat(value);
        return !isNaN(num) && isFinite(num);
      }
      return false;
    },
    message: 'Geçerli bir sayı giriniz'
  },
  positiveNumber: {
    custom: (value: unknown) => {
      if (typeof value === 'number') return value > 0;
      if (typeof value === 'string') {
        const num = parseFloat(value);
        return !isNaN(num) && isFinite(num) && num > 0;
      }
      return false;
    },
    message: 'Pozitif bir sayı giriniz'
  },
  date: {
    custom: (value: unknown) => {
      if (value instanceof Date) return true;
      if (typeof value === 'string') {
        const date = new Date(value);
        return !isNaN(date.getTime());
      }
      return false;
    },
    message: 'Geçerli bir tarih giriniz'
  },
  futureDate: {
    custom: (value: unknown) => {
      let date: Date;
      if (value instanceof Date) {
        date = value;
      } else if (typeof value === 'string') {
        date = new Date(value);
      } else {
        return false;
      }
      return date > new Date();
    },
    message: 'Gelecek bir tarih seçiniz'
  }
} as const;

// Helper functions
export const isValidEmail = (email: string): boolean => {
  return VALIDATION_RULES.email.pattern!.test(email);
};

export const isValidPassword = (password: string): boolean => {
  return password.length >= 6;
};

export const isValidPhone = (phone: string): boolean => {
  return VALIDATION_RULES.phone.pattern!.test(phone);
};

export const isValidUsername = (username: string): boolean => {
  return VALIDATION_RULES.username.pattern!.test(username) && 
         username.length >= 3 && 
         username.length <= 20;
};

export const formatValidationErrors = (errors: ValidationError[]): string => {
  return errors.map(error => `${error.field}: ${error.message}`).join(', ');
};


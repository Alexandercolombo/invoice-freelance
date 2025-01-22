// Storage utilities with fallback
export const storage = {
  get: (key: string) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error('Failed to get from storage:', error);
      return null;
    }
  },
  set: (key: string, value: any) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Failed to save to storage:', error);
      return false;
    }
  },
  remove: (key: string) => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Failed to remove from storage:', error);
      return false;
    }
  }
};

// URL validation with fallback
export const validateUrl = (url: string): boolean => {
  try {
    new URL(url.startsWith('http') ? url : `https://${url}`);
    return true;
  } catch {
    return false;
  }
};

// Safe JSON parsing
export const safeJsonParse = (str: string, fallback: any = null): any => {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
};

// Feature detection
export const features = {
  hasLocalStorage: () => {
    try {
      localStorage.setItem('test', 'test');
      localStorage.removeItem('test');
      return true;
    } catch (e) {
      return false;
    }
  },
  hasFileAPI: () => typeof File !== 'undefined' && typeof FileReader !== 'undefined',
  hasClipboard: () => navigator.clipboard && typeof navigator.clipboard.writeText === 'function',
  hasFormValidation: () => typeof document !== 'undefined' && typeof document.createElement('input').checkValidity === 'function'
};

// Safe clipboard operations
export const clipboard = {
  copy: async (text: string): Promise<boolean> => {
    try {
      if (features.hasClipboard()) {
        await navigator.clipboard.writeText(text);
        return true;
      }
      // Fallback for browsers without clipboard API
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return true;
    } catch {
      return false;
    }
  }
};

// Validation utilities
export const validation = {
  email: (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  },
  phone: (value: string) => {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(value.replace(/[\s()-]/g, ''));
  },
  url: (value: string) => {
    try {
      new URL(value.startsWith('http') ? value : `https://${value}`);
      return true;
    } catch {
      return false;
    }
  }
};

// Device and browser detection
export const device = {
  isMobile: () => /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
  isIOS: () => /iPad|iPhone|iPod/.test(navigator.userAgent),
  isSafari: () => /^((?!chrome|android).)*safari/i.test(navigator.userAgent),
  supportsWebP: async () => {
    try {
      const webP = new Image();
      webP.src = 'data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==';
      return new Promise((resolve) => {
        webP.onload = () => resolve(true);
        webP.onerror = () => resolve(false);
      });
    } catch {
      return false;
    }
  }
}; 
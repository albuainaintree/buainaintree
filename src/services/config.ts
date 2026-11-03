import { AppConfig } from '../types';

// ============================================================================
// Firebase & EmailJS Live Cloud Configuration
// مشروع: buainain-be6e1 (المرتبط بحساب albuainaintree@gmail.com)
// ============================================================================

export const DEFAULT_CONFIG: AppConfig = {
  // إعدادات Firebase Live
  firebaseApiKey: "AIzaSyD6JfQcLGHOhwh7ugX3y6hW02GAdjd8XmQ",
  firebaseAuthDomain: "buainain-be6e1.firebaseapp.com",
  firebaseProjectId: "buainain-be6e1",
  firebaseStorageBucket: "buainain-be6e1.firebasestorage.app",
  firebaseMessagingSenderId: "892187521292",
  firebaseAppId: "1:892187521292:web:ffdbde786bc836ec7e5929",

  // إعدادات EmailJS
  emailjsServiceId: "service_albuainain",
  emailjsTemplateId: "template_tree_submission",
  emailjsPublicKey: "",

  // البريد الإلكتروني الحصري لمدير النظام
  adminEmail: "albuainaintree@gmail.com",

  // حالة الاتصال السحابي (نشط)
  isFirebaseActive: true,
};

const CONFIG_STORAGE_KEY = 'albuainain_tree_app_config_v7';

export function getAppConfig(): AppConfig {
  try {
    const saved = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...DEFAULT_CONFIG,
        ...parsed,
        firebaseApiKey: parsed.firebaseApiKey || DEFAULT_CONFIG.firebaseApiKey,
        firebaseProjectId: parsed.firebaseProjectId || DEFAULT_CONFIG.firebaseProjectId,
        firebaseAuthDomain: parsed.firebaseAuthDomain || DEFAULT_CONFIG.firebaseAuthDomain,
        firebaseStorageBucket: parsed.firebaseStorageBucket || DEFAULT_CONFIG.firebaseStorageBucket,
        firebaseAppId: parsed.firebaseAppId || DEFAULT_CONFIG.firebaseAppId,
        firebaseMessagingSenderId: parsed.firebaseMessagingSenderId || DEFAULT_CONFIG.firebaseMessagingSenderId,
        isFirebaseActive: true,
      };
    }
  } catch (e) {
    console.warn('Could not read config from storage', e);
  }
  return DEFAULT_CONFIG;
}

export function saveAppConfig(newConfig: Partial<AppConfig>): AppConfig {
  const current = getAppConfig();
  const updated = {
    ...current,
    ...newConfig,
    isFirebaseActive: Boolean(
      (newConfig.firebaseApiKey ?? current.firebaseApiKey) && 
      (newConfig.firebaseProjectId ?? current.firebaseProjectId)
    ),
  };
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

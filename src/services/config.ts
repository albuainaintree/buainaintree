import { AppConfig } from '../types';

// ============================================================================
// ⚠️ TODO: Insert Firebase & EmailJS Config Here
// ضع إعدادات Firebase و EmailJS الخاصة بمشروعك أدناه لتفعيل الربط السحابي المباشر.
// التطبيق مجهز ليعمل تلقائياً في الوضع التجريبي (Demo Mode) بكفاءة كاملة في حال ترك الحقول فارغة.
// ============================================================================

export const DEFAULT_CONFIG: AppConfig = {
  // إعدادات Firebase (من لوحة تحكم Firebase Console)
  firebaseApiKey: "",
  firebaseAuthDomain: "",
  firebaseProjectId: "",
  firebaseStorageBucket: "",
  firebaseMessagingSenderId: "",
  firebaseAppId: "",

  // إعدادات EmailJS (من لوحة تحكم EmailJS)
  // خدمة إرسال البريد الإلكتروني للمدير عند وصول أي طلب جديد
  emailjsServiceId: "service_albuainain",
  emailjsTemplateId: "template_tree_submission",
  emailjsPublicKey: "",

  // البريد الإلكتروني الحصري لمدير النظام (مالك المشروع)
  adminEmail: "albuainaintree@gmail.com",

  // حالة الاتصال السحابي (إذا وُجدت مفاتيح Firebase)
  isFirebaseActive: false,
};

const CONFIG_STORAGE_KEY = 'albuainain_tree_app_config_v6';

export function getAppConfig(): AppConfig {
  try {
    const saved = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...DEFAULT_CONFIG,
        ...parsed,
        isFirebaseActive: Boolean(parsed.firebaseApiKey && parsed.firebaseProjectId),
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

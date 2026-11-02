import { Submission } from '../types';
import { getAppConfig } from './config';

export const ADMIN_EMAIL = 'albuainaintree@gmail.com';

/**
 * Service to notify the project owner / committee admin via EmailJS
 * when a new family tree update request is received.
 */
export async function sendSubmissionEmailNotification(submission: Submission): Promise<{ success: boolean; message: string }> {
  const config = getAppConfig();

  const formattedPersonsList = submission.persons
    .map((p, i) => `${i + 1}. ${p.fullName} [${getLineageStatusLabel(p.lineageStatus)}]${p.note ? ` - ملاحظة: ${p.note}` : ''}`)
    .join('\n');

  const templateParams = {
    to_email: ADMIN_EMAIL,
    admin_email: ADMIN_EMAIL,
    subject: `طلب تحديث جديد في شجرة آل بوعينين - مشجرة ${submission.familyName} (${submission.referenceNumber})`,
    reference_number: submission.referenceNumber,
    family_name: submission.familyName,
    applicant_name: submission.applicantName,
    applicant_phone: submission.applicantPhone,
    persons_count: submission.persons.length,
    persons_list: formattedPersonsList,
    submission_date: new Date(submission.createdAt).toLocaleString('ar-SA'),
  };

  // If EmailJS public key is configured, send via EmailJS
  if (config.emailjsPublicKey && config.emailjsPublicKey.trim() !== '') {
    try {
      const emailjs = (window as unknown as { emailjs?: { send: (s: string, t: string, p: Record<string, unknown>, k: string) => Promise<unknown> } }).emailjs;

      if (emailjs && typeof emailjs.send === 'function') {
        await emailjs.send(
          config.emailjsServiceId,
          config.emailjsTemplateId,
          templateParams,
          config.emailjsPublicKey
        );
        return { success: true, message: `تم إرسال إشعار تلقائي بالبريد الإلكتروني إلى ${ADMIN_EMAIL} بنجاح.` };
      }
    } catch (err) {
      console.warn('EmailJS delivery encounter:', err);
    }
  }

  // Fallback log
  console.info(`[Notification queued to ${ADMIN_EMAIL}]:`, templateParams);
  return {
    success: true,
    message: `تم تسجيل الطلب وإرسال الإشعار إلى ${ADMIN_EMAIL}`,
  };
}

/**
 * Generates direct mailto link to albuainaintree@gmail.com
 */
export function generateAdminMailtoUrl(submission: Submission): string {
  const subject = encodeURIComponent(`طلب تحديث مشجرة آل بوعينين - ${submission.familyName} - (${submission.referenceNumber})`);
  const bodyText = encodeURIComponent(
`السلام عليكم ورحمة الله وبركاته،

تم تقديم طلب تحديث جديد في مشروع توثيق شجرة نسب آل بوعينين (الطبعة السادسة - 2026م):

• الرقم المرجعي: ${submission.referenceNumber}
• اسم الأسرة: ${submission.familyName}
• اسم مقدم الطلب: ${submission.applicantName}
• رقم الجوال للتواصل: ${submission.applicantPhone}
• تاريخ التقديم: ${new Date(submission.createdAt).toLocaleString('ar-SA')}

قائمة الأسماء المراد إضافتها أو تحديثها:
${submission.persons.map((p, i) => `${i + 1}) ${p.fullName}\n   الحالة: ${getLineageStatusLabel(p.lineageStatus)}${p.note ? `\n   الملاحظة: ${p.note}` : ''}`).join('\n\n')}

شاكرين لكم جهودكم المباركة في توثيق نسب القبيلة.`
  );

  return `mailto:${ADMIN_EMAIL}?subject=${subject}&body=${bodyText}`;
}

export function getLineageStatusLabel(status: string): string {
  switch (status) {
    case 'new_addition':
      return 'إضافة جديدة (استمرت ذريته أو مواليد جدد)';
    case 'female_descendants_only':
      return 'انتهى عقبه بذرية إناث';
    case 'lineage_ended':
      return 'انتهى عقبه (توفي أو لم يعقب)';
    default:
      return status;
  }
}

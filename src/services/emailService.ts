import { Submission } from '../types';
import { getAppConfig } from './config';

/**
 * Service to notify the project owner / committee admin via EmailJS
 * when a new family tree update request is received.
 */
export async function sendSubmissionEmailNotification(submission: Submission): Promise<{ success: boolean; message: string }> {
  const config = getAppConfig();

  const templateParams = {
    to_email: config.adminEmail,
    reference_number: submission.referenceNumber,
    family_name: submission.familyName,
    applicant_name: submission.applicantName,
    applicant_phone: submission.applicantPhone,
    persons_count: submission.persons.length,
    persons_list: submission.persons.map((p, i) => `${i + 1}. ${p.fullName} (${getLineageStatusLabel(p.lineageStatus)}) - ${p.note || 'بدون ملاحظات'}`).join('\n'),
    submission_date: new Date(submission.createdAt).toLocaleString('ar-SA'),
  };

  // If EmailJS public key is not set, provide simulated success in Demo Mode
  if (!config.emailjsPublicKey || config.emailjsPublicKey.trim() === '') {
    console.info(
      'ℹ️ [EmailJS Demo Mode] Email notification simulated successfully:',
      templateParams
    );
    return {
      success: true,
      message: 'تم إرسال إشعار بريدي للمدير (وضع تجريبي). يمكنك ربط حساب EmailJS الحقيقي من إعدادات النظام.',
    };
  }

  try {
    // Check if EmailJS is available in window
    const emailjs = (window as unknown as { emailjs?: { send: (s: string, t: string, p: Record<string, unknown>, k: string) => Promise<unknown> } }).emailjs;

    if (emailjs && typeof emailjs.send === 'function') {
      await emailjs.send(
        config.emailjsServiceId,
        config.emailjsTemplateId,
        templateParams,
        config.emailjsPublicKey
      );
      return { success: true, message: 'تم إرسال إشعار بالبريد الإلكتروني إلى إدارة المشروع بنجاح.' };
    } else {
      console.warn('EmailJS SDK not found on window, fallback simulated.');
      return { success: true, message: 'تم تسجيل الطلب وتجهيز الإشعار البريدي.' };
    }
  } catch (err) {
    console.error('Error sending EmailJS notification:', err);
    // Don't fail the user flow if email delivery encounters a network issue
    return {
      success: false,
      message: 'تم حفظ طلبك بنجاح، وتعذر إرسال الإشعار البريدي الآلي مؤقتاً.',
    };
  }
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

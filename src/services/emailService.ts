import { Submission } from '../types';
import { getAppConfig } from './config';

export const ADMIN_EMAIL = 'albuainaintree@gmail.com';

/**
 * Sends EmailJS notification via REST API (or SDK)
 * This works in all browser environments without needing external CDN script delays.
 */
async function sendViaEmailJsApi(
  serviceId: string,
  templateId: string,
  templateParams: Record<string, unknown>,
  publicKey: string
): Promise<boolean> {
  // 1. Try SDK if available on window
  try {
    const emailjs = (window as unknown as { emailjs?: { send: (s: string, t: string, p: Record<string, unknown>, k: string) => Promise<unknown> } }).emailjs;
    if (emailjs && typeof emailjs.send === 'function') {
      await emailjs.send(serviceId, templateId, templateParams, publicKey);
      return true;
    }
  } catch (sdkErr) {
    console.warn('EmailJS SDK call notice, attempting REST fallback:', sdkErr);
  }

  // 2. Direct REST API call (Official EmailJS endpoint)
  try {
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        service_id: serviceId,
        template_id: templateId,
        user_id: publicKey,
        template_params: templateParams,
      }),
    });

    if (response.ok) {
      return true;
    } else {
      const errText = await response.text();
      console.warn('EmailJS REST response not ok:', response.status, errText);
    }
  } catch (apiErr) {
    console.warn('EmailJS REST call failed:', apiErr);
  }

  return false;
}

/**
 * Service to notify the project owner AND send confirmation to the applicant
 */
export async function sendSubmissionEmailNotification(submission: Submission): Promise<{
  adminSent: boolean;
  userSent: boolean;
  message: string;
}> {
  const config = getAppConfig();

  const formattedPersonsList = submission.persons
    .map(
      (p, i) =>
        `${i + 1}. ${p.fullName} [${getLineageStatusLabel(p.lineageStatus)}]${
          p.note ? ` - ملاحظة: ${p.note}` : ''
        }`
    )
    .join('\n');

  let adminSent = false;
  let userSent = false;

  // 1. Prepare Admin Email Parameters (supports both custom keys and default EmailJS keys)
  const fullAdminMessage = `السلام عليكم ورحمة الله وبركاته،

تم تقديم طلب تحديث جديد في مشروع توثيق شجرة نسب آل بوعينين:

• الرقم المرجعي: ${submission.referenceNumber}
• اسم الأسرة: ${submission.familyName}
• مقدم الطلب: ${submission.applicantName}
• رقم الجوال: ${submission.applicantPhone}
• البريد الإلكتروني: ${submission.applicantEmail || 'لم يُحدد'}
• تاريخ التقديم: ${new Date(submission.createdAt).toLocaleString('ar-SA')}

قائمة الأسماء المطلوب إضافتها أو تعديلها (${submission.persons.length}):
${formattedPersonsList}

منصة توثيق وتحديث شجرة آل بوعينين`;

  const adminParams = {
    to_email: ADMIN_EMAIL,
    admin_email: ADMIN_EMAIL,
    email: ADMIN_EMAIL,
    to_name: 'لجنة توثيق نسب آل بوعينين',
    from_name: submission.applicantName,
    reply_to: submission.applicantEmail || ADMIN_EMAIL,
    subject: `طلب تحديث جديد في شجرة آل بوعينين - مشجرة ${submission.familyName} (${submission.referenceNumber})`,
    reference_number: submission.referenceNumber,
    family_name: submission.familyName,
    applicant_name: submission.applicantName,
    applicant_phone: submission.applicantPhone,
    applicant_email: submission.applicantEmail || 'لم يُحدد',
    persons_count: submission.persons.length,
    persons_list: formattedPersonsList,
    submission_date: new Date(submission.createdAt).toLocaleString('ar-SA'),
    message: fullAdminMessage,
    content: fullAdminMessage,
    details: fullAdminMessage,
  };

  // 2. Prepare User Confirmation Parameters (if applicant provided email)
  const fullUserMessage = `السلام عليكم ورحمة الله وبركاته ${submission.applicantName}،

نؤكد لكم استلام طلبكم لتحديث شجرة نسب ${submission.familyName} بنجاح ضمن مشروع توثيق شجرة قبيلة آل بوعينين.

• رقم الطلب المرجعي: ${submission.referenceNumber}
• تاريخ الطلب: ${new Date(submission.createdAt).toLocaleString('ar-SA')}
• عدد الأسماء: ${submission.persons.length}

قائمة الأسماء المسجلة:
${formattedPersonsList}

سيتم تدقيق ومراجعة البيانات من قِبل لجنة التوثيق والتواصل معكم عند الحاجة.`;

  const userParams = submission.applicantEmail
    ? {
        to_email: submission.applicantEmail,
        applicant_email: submission.applicantEmail,
        email: submission.applicantEmail,
        to_name: submission.applicantName,
        from_name: 'مشروع شجرة نسب آل بوعينين',
        reply_to: ADMIN_EMAIL,
        subject: `تأكيد استلام طلب تحديث مشجرة ${submission.familyName} - رقم الطلب (${submission.referenceNumber})`,
        reference_number: submission.referenceNumber,
        family_name: submission.familyName,
        applicant_name: submission.applicantName,
        applicant_phone: submission.applicantPhone,
        persons_count: submission.persons.length,
        persons_list: formattedPersonsList,
        submission_date: new Date(submission.createdAt).toLocaleString('ar-SA'),
        message: fullUserMessage,
        content: fullUserMessage,
        details: fullUserMessage,
      }
    : null;

  // Check if EmailJS keys are configured
  const hasEmailJsKeys = Boolean(config.emailjsPublicKey && config.emailjsPublicKey.trim() !== '');

  if (hasEmailJsKeys) {
    // Send to admin
    adminSent = await sendViaEmailJsApi(
      config.emailjsServiceId,
      config.emailjsTemplateId,
      adminParams,
      config.emailjsPublicKey
    );

    // Send confirmation to user if email is provided
    if (userParams && submission.applicantEmail) {
      userSent = await sendViaEmailJsApi(
        config.emailjsServiceId,
        config.emailjsTemplateId,
        userParams,
        config.emailjsPublicKey
      );
    }
  }

  // Log simulation if keys not provided or for debugging
  console.info(`📧 [Email Notification Summary]:`, {
    adminEmail: ADMIN_EMAIL,
    adminSent,
    applicantEmail: submission.applicantEmail,
    userSent,
    referenceNumber: submission.referenceNumber,
  });

  return {
    adminSent,
    userSent,
    message: adminSent
      ? `تم إرسال إشعار للمدير${userSent ? ' وإرسال بريد تأكيد لصاحب الطلب' : ''} بنجاح.`
      : `تم تسجيل الطلب وتجهيز الإشعار للبريد المعتمد (${ADMIN_EMAIL}).`,
  };
}

/**
 * Sends a real-time test email to albuainaintree@gmail.com to verify EmailJS connectivity
 */
export async function sendTestEmail(
  overrideServiceId?: string,
  overrideTemplateId?: string,
  overridePublicKey?: string
): Promise<{ success: boolean; message: string }> {
  const config = getAppConfig();
  const serviceId = overrideServiceId ?? config.emailjsServiceId;
  const templateId = overrideTemplateId ?? config.emailjsTemplateId;
  const publicKey = overridePublicKey ?? config.emailjsPublicKey;

  if (!publicKey || publicKey.trim() === '') {
    return {
      success: false,
      message: 'مفتاح التشغيل العام (Public Key) فارغ. يرجى إدخاله أولاً من حسابك في EmailJS.',
    };
  }

  const testParams = {
    to_email: ADMIN_EMAIL,
    admin_email: ADMIN_EMAIL,
    email: ADMIN_EMAIL,
    to_name: 'مدير شجرة آل بوعينين',
    from_name: 'نظام الفحص والتأكيد',
    reply_to: ADMIN_EMAIL,
    subject: `[تجربة اتصال ناجحة] منصة توثيق شجرة آل بوعينين`,
    reference_number: `BA-TEST-${Math.floor(1000 + Math.random() * 9000)}`,
    family_name: 'اختبار الإشعارات',
    applicant_name: 'مدير النظام (فحص حي)',
    applicant_phone: '+966500000000',
    applicant_email: ADMIN_EMAIL,
    persons_count: 1,
    persons_list: '1. تم التحقق من ربط بريد الإدارة بنجاح',
    submission_date: new Date().toLocaleString('ar-SA'),
    message: `السلام عليكم ورحمة الله،
هذه رسالة اختبارية لتأكيد ربط بريد الإدارة (${ADMIN_EMAIL}) مع خدمة EmailJS في مشروع توثيق شجرة نسب قبيلة آل بوعينين.
عند تقديم أي طلب تحديث جديد من أي مستخدم أو هاتف جوال، سيصلك إشعار فوري بكافة التفاصيل.`,
  };

  const sent = await sendViaEmailJsApi(serviceId, templateId, testParams, publicKey);

  if (sent) {
    return {
      success: true,
      message: `تم إرسال بريد الاختبار بنجاح إلى (${ADMIN_EMAIL})! يرجى فحص صندوق الوارد (أو مجلد الرسائل غير المرغوب فيها Spam).`,
    };
  } else {
    return {
      success: false,
      message: 'تعذر الإرسال عبر EmailJS. تأكد من صحة Service ID و Template ID وربط بريد Gmail في حسابك على موقع EmailJS.',
    };
  }
}

/**
 * Generates direct mailto link to albuainaintree@gmail.com
 */
export function generateAdminMailtoUrl(submission: Submission): string {
  const subject = encodeURIComponent(
    `طلب تحديث مشجرة آل بوعينين - ${submission.familyName} - (${submission.referenceNumber})`
  );
  const bodyText = encodeURIComponent(
    `السلام عليكم ورحمة الله وبركاته،

تم تقديم طلب تحديث جديد في مشروع توثيق شجرة نسب آل بوعينين:

• الرقم المرجعي: ${submission.referenceNumber}
• اسم الأسرة: ${submission.familyName}
• اسم مقدم الطلب: ${submission.applicantName}
• رقم الجوال للتواصل: ${submission.applicantPhone}
${submission.applicantEmail ? `• البريد الإلكتروني: ${submission.applicantEmail}\n` : ''}• تاريخ التقديم: ${new Date(submission.createdAt).toLocaleString('ar-SA')}

قائمة الأسماء المراد إضافتها أو تحديثها:
${submission.persons
  .map(
    (p, i) =>
      `${i + 1}) ${p.fullName}\n   الحالة: ${getLineageStatusLabel(p.lineageStatus)}${
        p.note ? `\n   الملاحظة: ${p.note}` : ''
      }`
  )
  .join('\n\n')}

شاكرين لكم جهودكم المباركة في توثيق نسب القبيلة.`
  );

  return `mailto:${ADMIN_EMAIL}?subject=${subject}&body=${bodyText}`;
}

/**
 * Generates direct mailto confirmation link for the applicant
 */
export function generateUserConfirmationMailtoUrl(submission: Submission): string | null {
  if (!submission.applicantEmail) return null;

  const subject = encodeURIComponent(
    `تأكيد استلام طلب تحديث مشجرة ${submission.familyName} - رقم الطلب (${submission.referenceNumber})`
  );
  const bodyText = encodeURIComponent(
    `السلام عليكم ورحمة الله وبركاته ${submission.applicantName}،

نؤكد لكم استلام طلبكم لتحديث شجرة نسب ${submission.familyName} ضمن مشروع توثيق شجرة قبيلة آل بوعينين.

• رقم الطلب المرجعي: ${submission.referenceNumber}
• تاريخ الطلب: ${new Date(submission.createdAt).toLocaleString('ar-SA')}
• عدد الأسماء: ${submission.persons.length}

سيتم تدقيق ومراجعة البيانات من قِبل لجنة التوثيق والتواصل معكم في حال الحاجة لأي استيضاح.

لجنة توثيق شجرة نسب آل بوعينين - 2026م
albuainaintree@gmail.com`
  );

  return `mailto:${submission.applicantEmail}?subject=${subject}&body=${bodyText}`;
}

export function getLineageStatusLabel(status: string): string {
  switch (status) {
    case 'new_addition':
      return 'إضافة جديدة';
    case 'female_descendants_only':
      return 'انتهى عقبه بذرية إناث (من توفي وله ذرية إناث فقط)';
    case 'lineage_ended':
      return 'انتهى عقبه بدون ذرية';
    default:
      return status;
  }
}

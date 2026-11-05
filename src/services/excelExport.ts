import { Submission } from '../types';
import { getLineageStatusLabel } from './emailService';

interface SheetJSLibrary {
  utils: {
    book_new: () => unknown;
    json_to_sheet: (data: unknown[], opts?: unknown) => unknown;
    book_append_sheet: (workbook: unknown, worksheet: unknown, sheetName: string) => void;
  };
  writeFile: (workbook: unknown, filename: string) => void;
}

declare global {
  interface Window {
    XLSX?: SheetJSLibrary;
  }
}

/**
 * Export Al-Buainain Tree database to an Excel file with:
 * 1. Master Sheet ("السجل العام الشامل")
 * 2. Sheet per Family (tab per family name)
 */
export function exportDatabaseToExcel(
  submissions: Submission[],
  onlyApproved: boolean = false
): { success: boolean; message: string; filename?: string } {
  try {
    const xlsx = window.XLSX;

    if (!xlsx) {
      alert('جاري تحميل مكتبة معالجة Excel، يرجى المحاولة بعد لحظات...');
      return { success: false, message: 'مكتبة SheetJS غير متوفرة حالياً' };
    }

    // 1. Gather all individual persons with their submission metadata
    const allRows: Array<{
      'الرقم المرجعي': string;
      'اسم الأسرة': string;
      'الاسم الرباعي المطلوب إدراجه': string;
      'حالة العقب / التحديث': string;
      'ملاحظات وتوضيحات': string;
      'ملاحظات الإدارة': string;
      'اسم مقدم الطلب': string;
      'رقم الجوال': string;
      'حالة الاعتماد': string;
      'تاريخ التقديم': string;
    }> = [];

    const familiesMap = new Map<string, typeof allRows>();

    submissions.forEach(sub => {
      // If onlyApproved is true and whole sub is rejected, skip unless individual person is approved
      sub.persons.forEach(person => {
        if (onlyApproved && person.status !== 'approved') {
          return;
        }

        const statusText = 
          person.status === 'approved' ? 'معتمد ✅' :
          person.status === 'rejected' ? 'مرفوض ❌' : 'قيد المراجعة والتدقيق ⏳';

        const row = {
          'الرقم المرجعي': sub.referenceNumber,
          'اسم الأسرة': sub.familyName,
          'الاسم الرباعي المطلوب إدراجه': person.fullName,
          'حالة العقب / التحديث': getLineageStatusLabel(person.lineageStatus),
          'ملاحظات وتوضيحات': person.note || '—',
          'ملاحظات الإدارة': person.adminNotes || '—',
          'اسم مقدم الطلب': sub.applicantName,
          'رقم الجوال': sub.applicantPhone,
          'حالة الاعتماد': statusText,
          'تاريخ التقديم': new Date(sub.createdAt).toLocaleDateString('ar-SA'),
        };

        allRows.push(row);

        if (!familiesMap.has(sub.familyName)) {
          familiesMap.set(sub.familyName, []);
        }
        familiesMap.get(sub.familyName)!.push(row);
      });
    });

    if (allRows.length === 0) {
      return {
        success: false,
        message: 'لا توجد بيانات مطابقة للتصدير بناءً على الفلتر المختار.',
      };
    }

    // 2. Create Workbook
    const wb = xlsx.utils.book_new();

    // 3. Create Master Sheet (السجل الشامل)
    const masterSheet = xlsx.utils.json_to_sheet(allRows);
    xlsx.utils.book_append_sheet(wb, masterSheet, 'السجل العام الشامل');

    // 4. Create separate sheet for each family (Sheet per Family)
    // Excel sheet name limit is 31 chars and no invalid chars like : \ / ? * [ ]
    familiesMap.forEach((familyRows, familyName) => {
      const cleanSheetName = familyName.replace(/[\\/?*[\]:]/g, '').substring(0, 30);
      const familySheet = xlsx.utils.json_to_sheet(familyRows);
      xlsx.utils.book_append_sheet(wb, familySheet, cleanSheetName);
    });

    // 5. Generate Filename
    const today = new Date().toISOString().slice(0, 10);
    const filterTag = onlyApproved ? 'المعتمدة' : 'الكل';
    const filename = `توثيق_شجرة_آل_بوعينين_${filterTag}_${today}.xlsx`;

    // 6. Write and trigger download
    xlsx.writeFile(wb, filename);

    return {
      success: true,
      message: `تم تصدير ملف Excel بنجاح (${allRows.length} سجل عبر ${familiesMap.size + 1} أوراق عمل).`,
      filename,
    };
  } catch (error) {
    console.error('Error exporting Excel:', error);
    return {
      success: false,
      message: 'حدث خطأ أثناء تصدير ملف Excel. يرجى مراجعة المدخلات.',
    };
  }
}

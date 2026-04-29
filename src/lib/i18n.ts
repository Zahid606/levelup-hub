export type Language = 'en' | 'ur' | 'bn';

const translations: Record<string, Record<Language, string>> = {
  // Auth
  'auth.login': { en: 'Log In', ur: 'لاگ ان', bn: 'লগ ইন' },
  'auth.signup': { en: 'Sign Up', ur: 'سائن اپ', bn: 'সাইন আপ' },
  'auth.adminLogin': { en: 'Admin Login', ur: 'ایڈمن لاگ ان', bn: 'অ্যাডমিন লগইন' },
  'auth.email': { en: 'Email', ur: 'ای میل', bn: 'ইমেইল' },
  'auth.password': { en: 'Password', ur: 'پاس ورڈ', bn: 'পাসওয়ার্ড' },
  'auth.fullName': { en: 'Full Name', ur: 'پورا نام', bn: 'পুরো নাম' },
  'auth.noAccount': { en: "Don't have an account?", ur: 'اکاؤنٹ نہیں ہے؟', bn: 'অ্যাকাউন্ট নেই?' },
  'auth.hasAccount': { en: 'Already have an account?', ur: 'پہلے سے اکاؤنٹ ہے؟', bn: 'ইতিমধ্যে অ্যাকাউন্ট আছে?' },
  'auth.logout': { en: 'Log Out', ur: 'لاگ آؤٹ', bn: 'লগ আউট' },
  
  // Nav
  'nav.lessons': { en: 'Lessons', ur: 'اسباق', bn: 'পাঠ' },
  'nav.leaderboard': { en: 'Leaderboard', ur: 'لیڈر بورڈ', bn: 'লিডারবোর্ড' },
  'nav.admin': { en: 'Admin Panel', ur: 'ایڈمن پینل', bn: 'অ্যাডমিন প্যানেল' },
  'nav.profile': { en: 'Profile', ur: 'پروفائل', bn: 'প্রোফাইল' },
  
  // Lessons
  'lessons.title': { en: 'Your Lessons', ur: 'آپ کے اسباق', bn: 'আপনার পাঠ' },
  'lessons.lesson': { en: 'Lesson', ur: 'سبق', bn: 'পাঠ' },
  'lessons.completed': { en: 'Completed', ur: 'مکمل', bn: 'সম্পন্ন' },
  'lessons.start': { en: 'Start Lesson', ur: 'سبق شروع کریں', bn: 'পাঠ শুরু করুন' },
  'lessons.continue': { en: 'Continue', ur: 'جاری رکھیں', bn: 'চালিয়ে যান' },
  
  // Quiz
  'quiz.title': { en: 'Quiz', ur: 'کوئز', bn: 'কুইজ' },
  'quiz.submit': { en: 'Submit Answer', ur: 'جواب جمع کریں', bn: 'উত্তর জমা দিন' },
  'quiz.correct': { en: 'Correct! 🎉', ur: 'صحیح! 🎉', bn: 'সঠিক! 🎉' },
  'quiz.wrong': { en: 'Wrong answer', ur: 'غلط جواب', bn: 'ভুল উত্তর' },
  'quiz.next': { en: 'Next Question', ur: 'اگلا سوال', bn: 'পরবর্তী প্রশ্ন' },
  
  // Points
  'points.total': { en: 'Total Points', ur: 'کل پوائنٹس', bn: 'মোট পয়েন্ট' },
  'points.rank': { en: 'Rank', ur: 'درجہ', bn: 'র‍্যাঙ্ক' },
  
  // Admin
  'admin.dashboard': { en: 'Admin Dashboard', ur: 'ایڈمن ڈیش بورڈ', bn: 'অ্যাডমিন ড্যাশবোর্ড' },
  'admin.manageLessons': { en: 'Manage Lessons', ur: 'اسباق کا انتظام', bn: 'পাঠ পরিচালনা' },
  'admin.manageUsers': { en: 'Manage Users', ur: 'صارفین کا انتظام', bn: 'ব্যবহারকারী পরিচালনা' },
  'admin.addLesson': { en: 'Add Lesson', ur: 'سبق شامل کریں', bn: 'পাঠ যোগ করুন' },
  'admin.addVideo': { en: 'Add Video', ur: 'ویڈیو شامل کریں', bn: 'ভিডিও যোগ করুন' },
  'admin.addQuiz': { en: 'Add Quiz Question', ur: 'کوئز سوال شامل کریں', bn: 'কুইজ প্রশ্ন যোগ করুন' },
  'admin.giveGift': { en: 'Give Gift', ur: 'تحفہ دیں', bn: 'উপহার দিন' },
  'admin.students': { en: 'Students', ur: 'طلباء', bn: 'শিক্ষার্থী' },
  'admin.progress': { en: 'Progress', ur: 'ترقی', bn: 'অগ্রগতি' },
  'admin.manageEmployees': { en: 'Manage Employees', ur: 'ملازمین کا انتظام', bn: 'কর্মচারী পরিচালনা' },
  
  // General
  'general.save': { en: 'Save', ur: 'محفوظ کریں', bn: 'সংরক্ষণ' },
  'general.cancel': { en: 'Cancel', ur: 'منسوخ', bn: 'বাতিল' },
  'general.delete': { en: 'Delete', ur: 'حذف', bn: 'মুছুন' },
  'general.edit': { en: 'Edit', ur: 'ترمیم', bn: 'সম্পাদনা' },
  'general.loading': { en: 'Loading...', ur: 'لوڈ ہو رہا ہے...', bn: 'লোড হচ্ছে...' },
  'general.darkMode': { en: 'Dark Mode', ur: 'ڈارک موڈ', bn: 'ডার্ক মোড' },
  'general.language': { en: 'Language', ur: 'زبان', bn: 'ভাষা' },
  'general.gifts': { en: 'Gifts', ur: 'تحائف', bn: 'উপহার' },
  'general.welcome': { en: 'Welcome back', ur: 'خوش آمدید', bn: 'স্বাগতম' },
  'general.search': { en: 'Search lessons...', ur: 'اسباق تلاش کریں...', bn: 'পাঠ অনুসন্ধান...' },
  'general.back': { en: 'Back', ur: 'واپس', bn: 'ফিরে যান' },
  'general.previous': { en: 'Previous', ur: 'پچھلا', bn: 'পূর্ববর্তী' },
  'general.next': { en: 'Next', ur: 'اگلا', bn: 'পরবর্তী' },
  'general.backToLessons': { en: 'Back to Lessons', ur: 'اسباق پر واپس جائیں', bn: 'পাঠের তালিকায় ফিরুন' },

  // Site
  'site.name': { en: 'Misk-ul-Kalam', ur: 'مسک الکلام', bn: 'মিস্ক-উল-কালাম' },
  'site.tagline': { en: 'Message of Quran & Sunnah', ur: 'پیغام قرآن وسنت', bn: 'কোরআন ও সুন্নাহর বার্তা' },

  // Nav extras
  'nav.contact': { en: 'Contact Us', ur: 'رابطہ کریں', bn: 'যোগাযোগ' },

  // Contact page
  'contact.title': { en: 'Misk-ul-Kalam Social Media Links', ur: 'مسک الکلام سوشل میڈیا لنکس', bn: 'মিস্ক-উল-কালাম সোশ্যাল মিডিয়া লিঙ্কস' },
  'contact.followCta': { en: 'Like, follow and subscribe', ur: 'لائک، فالو اور سبسکرائب کریں', bn: 'লাইক, ফলো এবং সাবস্ক্রাইব করুন' },
  'contact.supervision': { en: 'Under supervision of Sheikh Farooq Hayder, Preacher and Teacher, Yanbu Islamic Center', ur: 'زیر نگرانی شیخ فاروق حیدر، داعی و معلم، ینبع اسلامی مرکز', bn: 'শেখ ফারুক হায়দার, প্রচারক ও শিক্ষক, ইয়ানবু ইসলামিক সেন্টার তত্ত্বাবধানে' },
  'contact.footer.under': { en: 'Under supervision of', ur: 'زیر نگرانی', bn: 'তত্ত্বাবধানে' },
  'contact.footer.name': { en: 'Sheikh Farooq Hayder', ur: 'شیخ فاروق حیدر', bn: 'শেখ ফারুক হায়দার' },
  'contact.footer.role': { en: 'Preacher and Teacher', ur: 'داعی و معلم', bn: 'প্রচারক ও শিক্ষক' },
  'contact.footer.org': { en: 'Yanbu Islamic Center', ur: 'ینبع اسلامی مرکز', bn: 'ইয়ানবু ইসলামিক সেন্টার' },

  // Student dashboard
  'lessons.empty': { en: 'No lessons available yet. Check back soon!', ur: 'ابھی کوئی سبق دستیاب نہیں ہے۔ جلد دوبارہ آئیں!', bn: 'এখনও কোনো পাঠ উপলব্ধ নেই। শীঘ্রই আবার দেখুন!' },

  // Login form
  'login.phone': { en: 'Phone Number (e.g. +966...)', ur: 'فون نمبر (مثلاً +966...)', bn: 'ফোন নম্বর (যেমন +966...)' },
  'login.gender': { en: 'Select Gender', ur: 'جنس منتخب کریں', bn: 'লিঙ্গ নির্বাচন করুন' },
  'login.male': { en: 'Male', ur: 'مرد', bn: 'পুরুষ' },
  'login.female': { en: 'Female', ur: 'عورت', bn: 'মহিলা' },
  'login.age': { en: 'Age', ur: 'عمر', bn: 'বয়স' },
  'login.country': { en: 'Select Country', ur: 'ملک منتخب کریں', bn: 'দেশ নির্বাচন করুন' },
  'login.city': { en: 'Select City', ur: 'شہر منتخب کریں', bn: 'শহর নির্বাচন করুন' },
  'login.cityCustom': { en: 'City', ur: 'شہر', bn: 'শহর' },

};

export function t(key: string, lang: Language = 'en'): string {
  return translations[key]?.[lang] || translations[key]?.en || key;
}

export const languageNames: Record<Language, string> = {
  en: 'English',
  ur: 'اردو',
  bn: 'বাংলা',
};

const AUTH_MESSAGE_MAP: Record<string, string> = {
  "Invalid email or password.": "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
  "Password must be at least 8 characters.":
    "يجب أن تكون كلمة المرور 8 أحرف على الأقل.",
  "Password is too long.": "كلمة المرور طويلة جدًا.",
  "Passwords do not match.": "كلمتا المرور غير متطابقتين.",
  "Confirm your password.": "أكّد كلمة المرور.",
  "Password is required.": "كلمة المرور مطلوبة.",
  "Enter a valid email address.": "أدخل بريدًا إلكترونيًا صالحًا.",
  "Name is required.": "الاسم مطلوب.",
  "Please sign in to continue.": "يجب تسجيل الدخول للمتابعة.",
  "Profile not found.": "تعذّر العثور على الملف الشخصي.",
  "This account has been suspended.": "تم إيقاف هذا الحساب.",
  "Check your email to confirm the account, then sign in.":
    "تحقق من بريدك لتأكيد الحساب ثم سجّل الدخول.",
  "Auth session missing!": "انتهت جلسة الدخول. سجّل الدخول ثم حاول مجددًا.",
  "New password should be different from the old password.":
    "يجب أن تختلف كلمة المرور الجديدة عن الحالية.",
  "Unable to validate email address: invalid format":
    "صيغة البريد الإلكتروني غير صالحة.",
  "User already registered": "هذا البريد مسجّل مسبقًا.",
  "Email not confirmed": "البريد الإلكتروني غير مؤكَّد بعد.",
  "Something went wrong. Please try again.":
    "حدث خطأ ما. حاول مرة أخرى.",
  "Please check the form and try again.":
    "تحقق من الحقول وحاول مرة أخرى.",
  "Supabase server env vars are not configured.":
    "إعدادات المصادقة غير مكتملة. حاول لاحقًا.",
  "Supabase is not configured.":
    "إعدادات المصادقة غير مكتملة. حاول لاحقًا.",
  "Provider is not enabled":
    "مزوّد Google غير مفعّل. فعِّله من إعدادات Supabase.",
};

export const AUTH_AR = {
  generic: "حدث خطأ ما. حاول مرة أخرى.",
  formCheck: "تحقق من الحقول وحاول مرة أخرى.",
  passwordMin: "يجب أن تكون كلمة المرور 8 أحرف على الأقل.",
  passwordMax: "كلمة المرور طويلة جدًا.",
  passwordRequired: "كلمة المرور مطلوبة.",
  passwordMismatch: "كلمتا المرور غير متطابقتين.",
  confirmRequired: "أكّد كلمة المرور.",
  emailInvalid: "أدخل بريدًا إلكترونيًا صالحًا.",
  nameRequired: "الاسم مطلوب.",
  signInRequired: "يجب تسجيل الدخول للمتابعة.",
  passwordUpdated: "تم تحديث كلمة المرور.",
} as const;

export function localizeAuthMessage(message: string): string {
  if (AUTH_MESSAGE_MAP[message]) return AUTH_MESSAGE_MAP[message];

  const lower = message.toLowerCase();
  if (lower.includes("password") && lower.includes("match")) {
    return AUTH_AR.passwordMismatch;
  }
  if (
    lower.includes("password") &&
    (lower.includes("8") || lower.includes("at least"))
  ) {
    return AUTH_AR.passwordMin;
  }
  if (lower.includes("session")) {
    return AUTH_MESSAGE_MAP["Auth session missing!"];
  }
  if (
    lower.includes("invalid login") ||
    lower.includes("invalid email or password")
  ) {
    return AUTH_MESSAGE_MAP["Invalid email or password."];
  }
  if (lower.includes("already registered")) {
    return AUTH_MESSAGE_MAP["User already registered"];
  }
  if (lower.includes("provider") && lower.includes("not enabled")) {
    return AUTH_MESSAGE_MAP["Provider is not enabled"];
  }
  if (lower.includes("different from the old password")) {
    return AUTH_MESSAGE_MAP[
      "New password should be different from the old password."
    ];
  }
  if (lower.includes("weak") || lower.includes("pwned")) {
    return "كلمة المرور ضعيفة جدًا. اختر كلمة أقوى.";
  }

  // Keep already-Arabic messages as-is.
  if (/[\u0600-\u06FF]/.test(message)) return message;

  return AUTH_AR.generic;
}

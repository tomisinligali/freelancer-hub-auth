export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export function validateEmail(email: unknown): ValidationResult<string> {
  if (typeof email !== "string" || !email.trim()) {
    return { success: false, error: "Email is required." };
  }
  const cleanEmail = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleanEmail)) {
    return { success: false, error: "Please enter a valid email address." };
  }
  return { success: true, data: cleanEmail };
}

export function validatePassword(password: unknown): ValidationResult<string> {
  if (typeof password !== "string" || !password) {
    return { success: false, error: "Password is required." };
  }
  if (password.length < 8) {
    return { success: false, error: "Password must be at least 8 characters long." };
  }
  return { success: true, data: password };
}

export function validateSignupInput(formData: FormData): ValidationResult<{
  email: string;
  password: string;
}> {
  const emailRaw = formData.get("email");
  const passwordRaw = formData.get("password");

  const emailRes = validateEmail(emailRaw);
  if (!emailRes.success || !emailRes.data) {
    return { success: false, error: emailRes.error };
  }

  const passwordRes = validatePassword(passwordRaw);
  if (!passwordRes.success || !passwordRes.data) {
    return { success: false, error: passwordRes.error };
  }

  return {
    success: true,
    data: {
      email: emailRes.data,
      password: passwordRes.data,
    },
  };
}

export function validateResetPasswordInput(formData: FormData): ValidationResult<{
  token: string;
  password: string;
}> {
  const token = formData.get("token");
  const passwordRaw = formData.get("password");

  if (typeof token !== "string" || !token.trim()) {
    return { success: false, error: "Reset token is missing or invalid." };
  }

  const passwordRes = validatePassword(passwordRaw);
  if (!passwordRes.success || !passwordRes.data) {
    return { success: false, error: passwordRes.error };
  }

  return {
    success: true,
    data: {
      token: token.trim(),
      password: passwordRes.data,
    },
  };
}

import { useState } from "react";
import { supabase } from "../services/supabaseClient";
import toast from "react-hot-toast";
import { Metronome } from 'ldrs/react';
import 'ldrs/react/Metronome.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faEye,
  faEyeSlash,
  faUserPlus,
  faRightToBracket,
  faEnvelope,
  faLock,
  faUser,
  faCheck,
  faXmark,
  faTriangleExclamation
} from '@fortawesome/free-solid-svg-icons';
import {
  faGoogle,
} from '@fortawesome/free-brands-svg-icons';
import { useLanguage } from '../i18n/LanguageContext';

// Funcție validare parolă
function validatePassword(password) {
  const checks = {
    minLength: password.length >= 8,
    hasNumber: /\d/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasUppercase: /[A-Z]/.test(password),
  };

  const isValid = checks.minLength && checks.hasNumber && checks.hasLowercase;
  const strength = Object.values(checks).filter(Boolean).length;

  return {
    isValid,
    strength,
    checks
  };
}

// Funcție validare email
function validateEmail(email) {
  if (!email) return { isValid: true, error: '' }; // Empty is OK (required will handle it)

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isValid = emailRegex.test(email);

  return {
    isValid,
    error: ''
  };
}

export default function LoginPage({ onNavigate }) {
  const { t } = useLanguage();
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [logoError, setLogoError] = useState(false);

  // Sign Up form
  const [signUpData, setSignUpData] = useState({
    name: '',
    email: '',
    password: ''
  });

  // Login form
  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  });

  // Password validation state
  const passwordValidation = validatePassword(signUpData.password);

  // Email validation state (for both forms)
  const signUpEmailValidation = validateEmail(signUpData.email);
  const loginEmailValidation = validateEmail(loginData.email);

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          },
          redirectTo: window.location.origin
        },
      });

      if (error) throw error;
    } catch (error) {
      toast.error(t.login.toastGoogleError + error.message);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validări
      if (!signUpData.name.trim()) {
        toast.error(t.login.toastEnterName);
        setLoading(false);
        return;
      }

      if (!signUpEmailValidation.isValid) {
        toast.error(t.login.toastInvalidEmailForm);
        setLoading(false);
        return;
      }

      if (!passwordValidation.isValid) {
        toast.error(
          <div>
            <p className="font-bold">{t.login.toastInvalidPassword}</p>
            <p className="text-sm">{t.login.toastInvalidPasswordDesc}</p>
          </div>,
          { duration: 5000 }
        );
        setLoading(false);
        return;
      }

      // Creează cont cu email/password
      const { data, error } = await supabase.auth.signUp({
        email: signUpData.email,
        password: signUpData.password,
        options: {
          data: {
            full_name: signUpData.name.trim(),
          },
          emailRedirectTo: `${window.location.origin}`
        }
      });

      if (error) throw error;

      if (data?.user?.identities?.length === 0) {
        toast.error(t.login.toastEmailAlreadyRegistered);
        setLoading(false);
        return;
      }

      // Reset form
      setSignUpData({ name: '', email: '', password: '' });
      setIsSignUp(false);

    } catch (error) {
      console.error('Sign up error:', error);

      if (error.message.includes('already registered')) {
        toast.error(t.login.toastAlreadyRegistered);
      } else if (error.message.includes('Password')) {
        toast.error(t.login.toastPasswordSecurity);
      } else {
        toast.error(t.login.toastCreateAccountError + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!loginEmailValidation.isValid) {
        toast.error(t.login.toastInvalidEmailForm);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginData.email,
        password: loginData.password,
      });

      if (error) throw error;

      toast.success(t.login.toastWelcomeBack);
      setLoginData({ email: '', password: '' });
      onNavigate('home');

    } catch (error) {
      console.error('Login error:', error);

      if (error.message.includes('Invalid login credentials')) {
        toast.error(t.login.toastIncorrectCredentials);
      } else if (error.message.includes('Email not confirmed')) {
        toast.error(
          <div>
            <p className="font-bold">{t.login.toastEmailNotConfirmed}</p>
            <p className="text-sm">{t.login.toastEmailNotConfirmedDesc}</p>
          </div>,
          { duration: 6000 }
        );
      } else if (error.message.includes('Invalid email')) {
        toast.error(t.login.toastInvalidEmail);
      } else {
        toast.error(t.login.toastSignInError + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!loginData.email) {
      toast.error(t.login.toastEnterEmailFirst);
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        loginData.email,
        {
          redirectTo: `${window.location.origin}/reset-password`,
        }
      );

      if (error) throw error;

      toast.success(
        <div>
          <p className="font-bold">{t.login.toastEmailSent}</p>
          <p className="text-sm">{t.login.toastEmailSentDesc}</p>
        </div>,
        { duration: 6000 }
      );
    } catch (error) {
      toast.error("Error: " + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Desktop Layout */}
      <div className="min-h-screen flex items-center justify-center bg-white p-6">
        {/* Left Side - Form */}
        <div className="w-full max-w-md">
          {!isSignUp ? (
            // Login Form
            <div>
              <div className="text-center">
                {/* Iconița/Logo-ul */}
                <div className="flex justify-center mb-6">
                  {!logoError ? (
                    <img
                      src="src/assets/IconApp_em_600.svg"
                      alt="Logo"
                      className="h-16 w-auto object-contain"
                      // Dacă imaginea nu se încarcă, setăm logoError pe true
                      onError={() => setLogoError(true)}
                    />
                  ) : (
                    /* Iconița alternativă din FontAwesome */
                    <div className="text-emerald-600 text-5xl">
                      <FontAwesomeIcon icon={faLeaf} />
                      {/* Poți înlocui faLeaf cu faSeedling, faUser, etc. */}
                    </div>
                  )}
                </div>
                <h1 className="text-3xl font-semibold mb-2 text-gray-900">
                  {t.login.welcomeBack}
                </h1>
                <p className="text-gray-600 text-sm mb-8">
                  {t.login.signInToContinue}<br />
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t.login.email}
                  </label>
                  <div className="relative">
                    <FontAwesomeIcon
                      icon={faEnvelope}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="email"
                      placeholder={t.login.emailPlaceholder}
                      value={loginData.email}
                      onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                      className={`w-full pl-12 pr-5 py-3 bg-gray-50 border rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 transition-all
                        ${loginData.email && !loginEmailValidation.isValid
                          ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                          : 'border-gray-200 focus:ring-emerald-500 focus:border-transparent'
                        }`}
                      required
                    />
                  </div>
                  {/* Email Error Message */}
                  {loginData.email && !loginEmailValidation.isValid && (
                    <div className="flex items-center gap-2 mt-2 text-red-600 text-sm">
                      <FontAwesomeIcon icon={faTriangleExclamation} className="text-xs" />
                      <span>{t.login.emailInvalidOrTaken}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t.login.password}
                  </label>
                  <div className="relative">
                    <FontAwesomeIcon
                      icon={faLock}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder={t.login.passwordPlaceholder}
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      className="w-full pl-12 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                    </button>
                  </div>
                  <div className="text-right mt-2">
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                    >
                      {t.login.forgotPassword}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !loginEmailValidation.isValid}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3.5 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                      {t.login.signingIn}
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faRightToBracket} />
                      {t.login.signIn}
                    </>
                  )}
                </button>
              </form>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500">{t.login.orContinueWith}</span>
                </div>
              </div>


              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="w-full border border-gray-200 bg-white hover:bg-emerald-50 hover:border-emerald-200 text-gray-700 font-medium py-3 rounded-lg transition flex items-center justify-center gap-3 shadow-sm"
                >
                  <FontAwesomeIcon icon={faGoogle} className="text-xl text-emerald-600" />
                  Google
                </button>
              </div>

              <p className="text-center text-sm text-gray-600 mt-6">
                {t.login.noAccount}{' '}
                <button
                  type="button"
                  onClick={() => setIsSignUp(true)}
                  className="text-emerald-600 hover:text-emerald-700 font-semibold"
                >
                  {t.login.register}
                </button>
              </p>
            </div>
          ) : (

            <div>
              {/* Sign Up Form */}
              <div>
                <div className="flex justify-center mb-6">
                  <img
                    src="/src/assets/IconApp_em_600.svg"
                    alt="Logo"
                    className="h-16 w-auto object-contain"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.parentElement.innerHTML = '<div class="text-5xl">🌱</div>';
                    }}
                  />
                </div>

                <h1 className="text-center text-3xl font-semibold mb-2 text-gray-900">
                  {t.login.createAccount}
                </h1>
              </div>


              <form onSubmit={handleSignUp} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t.login.fullName}
                  </label>
                  <div className="relative">
                    <FontAwesomeIcon
                      icon={faUser}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="text"
                      placeholder={t.login.fullNamePlaceholder}
                      value={signUpData.name}
                      onChange={(e) => setSignUpData({ ...signUpData, name: e.target.value })}
                      className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t.login.email}
                  </label>
                  <div className="relative">
                    <FontAwesomeIcon
                      icon={faEnvelope}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="email"
                      placeholder={t.login.emailPlaceholder}
                      value={signUpData.email}
                      onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })}
                      className={`w-full pl-12 pr-4 py-3 bg-gray-50 border rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 transition-all
                        ${signUpData.email && !signUpEmailValidation.isValid
                          ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                          : 'border-gray-200 focus:ring-emerald-500 focus:border-transparent'
                        }`}
                      required
                    />
                  </div>
                  {/* Email Error Message */}
                  {signUpData.email && !signUpEmailValidation.isValid && (
                    <div className="flex items-center gap-2 mt-2 text-red-600 text-sm">
                      <FontAwesomeIcon icon={faTriangleExclamation} className="text-xs" />
                      <span>{t.login.emailInvalidOrTaken}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t.login.password}<span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <FontAwesomeIcon
                      icon={faLock}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder={t.login.passwordPlaceholder}
                      value={signUpData.password}
                      onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })}
                      className={`
                          w-full pl-12 pr-12 py-3 bg-gray-50 border rounded-lg text-gray-900 placeholder-gray-400 
                          focus:outline-none focus:ring-2 transition-all
                          ${signUpData.password && !passwordValidation.isValid
                          ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                          : signUpData.password && passwordValidation.isValid
                            ? 'border-green-300 focus:ring-green-500 focus:border-green-500'
                            : 'border-gray-200 focus:ring-emerald-500 focus:border-transparent'
                        }
                        `}
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                    </button>

                    {/* Success Icon */}
                    {signUpData.password && passwordValidation.isValid && (
                      <div className="absolute right-12 top-1/2 -translate-y-1/2">
                        <FontAwesomeIcon icon={faCheck} className="text-green-500" />
                      </div>
                    )}
                  </div>

                  {/* Password Requirements */}
                  {signUpData.password && (
                    <div className="mt-3 space-y-2">
                      {/* Error Message */}
                      {!passwordValidation.isValid && (
                        <div className="flex items-start gap-2 text-red-600 text-sm">
                          <FontAwesomeIcon icon={faXmark} className="mt-0.5" />
                          <div>
                            <p className="font-medium">{t.login.passwordMustContain}</p>
                          </div>
                        </div>
                      )}

                      {/* Requirements List */}
                      <p className="text-xs text-gray-600">
                        {t.login.passwordRequirements}
                      </p>

                      {/* Checklist */}
                      <div className="space-y-1">
                        <div className={`flex items-center gap-2 text-xs ${passwordValidation.checks.minLength ? 'text-green-600' : 'text-gray-400'}`}>
                          <FontAwesomeIcon icon={passwordValidation.checks.minLength ? faCheck : faXmark} />
                          <span>{t.login.atLeast8Chars}</span>
                        </div>
                        <div className={`flex items-center gap-2 text-xs ${passwordValidation.checks.hasNumber ? 'text-green-600' : 'text-gray-400'}`}>
                          <FontAwesomeIcon icon={passwordValidation.checks.hasNumber ? faCheck : faXmark} />
                          <span>{t.login.containsDigit}</span>
                        </div>
                        <div className={`flex items-center gap-2 text-xs ${passwordValidation.checks.hasLowercase ? 'text-green-600' : 'text-gray-400'}`}>
                          <FontAwesomeIcon icon={passwordValidation.checks.hasLowercase ? faCheck : faXmark} />
                          <span>{t.login.containsLowercase}</span>
                        </div>
                        <div className={`flex items-center gap-2 text-xs ${passwordValidation.checks.hasUppercase ? 'text-green-600' : 'text-gray-400'}`}>
                          <FontAwesomeIcon icon={passwordValidation.checks.hasUppercase ? faCheck : faXmark} />
                          <span>{t.login.containsUppercase}</span>
                        </div>
                      </div>

                      {/* Strength Indicator */}
                      <div className="mt-2">
                        <div className="flex gap-1">
                          {[1, 2, 3, 4].map((level) => (
                            <div
                              key={level}
                              className={`h-1 flex-1 rounded-full transition-all ${level <= passwordValidation.strength
                                ? passwordValidation.strength <= 2
                                  ? 'bg-red-500'
                                  : passwordValidation.strength === 3
                                    ? 'bg-yellow-500'
                                    : 'bg-green-500'
                                : 'bg-gray-200'
                                }`}
                            />
                          ))}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {t.login.passwordStrength}: {
                            passwordValidation.strength <= 2 ? t.login.weak :
                              passwordValidation.strength === 3 ? t.login.medium :
                                t.login.strong
                          }
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || !passwordValidation.isValid || !signUpEmailValidation.isValid}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3.5 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                      {t.login.creatingAccount}
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faUserPlus} />
                      {t.login.createAccount}
                    </>
                  )}
                </button>
              </form>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500">{t.login.orContinueWith}</span>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="w-full border border-gray-200 bg-white hover:bg-emerald-50 hover:border-emerald-200 text-gray-700 font-medium py-3 rounded-lg transition flex items-center justify-center gap-3 shadow-sm"
                >
                  <FontAwesomeIcon icon={faGoogle} className="text-xl text-emerald-600" />
                  Google
                </button>
              </div>

              <p className="text-center text-sm text-gray-600 mt-6">
                {t.login.alreadyHaveAccount}{' '}
                <button
                  type="button"
                  onClick={() => setIsSignUp(false)}
                  className="text-emerald-600 hover:text-emerald-700 font-semibold"
                >
                  {t.login.signIn}
                </button>
              </p>
            </div>
          )
          }
        </div >
      </div >

      {/* Mobile Layout - Similar structure */}
      < div className="md:hidden min-h-screen bg-white flex flex-col p-6" >
        {/* Mobile version - copy same logic */}
      </div >
    </div >
  );
}
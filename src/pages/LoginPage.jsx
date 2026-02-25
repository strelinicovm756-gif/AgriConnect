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
    error: isValid ? '' : 'Email is invalid or already taken'
  };
}

export default function LoginPage({ onNavigate }) {
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
      toast.error("Eroare conectare Google: " + error.message);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validări
      if (!signUpData.name.trim()) {
        toast.error("Te rugăm să introduci numele tău");
        setLoading(false);
        return;
      }

      if (!signUpEmailValidation.isValid) {
        toast.error("Email invalid");
        setLoading(false);
        return;
      }

      if (!passwordValidation.isValid) {
        toast.error(
          <div>
            <p className="font-bold">Parolă invalidă</p>
            <p className="text-sm">Parola trebuie să aibă minim 8 caractere, o cifră și o literă mică</p>
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
        toast.error("Acest email este deja înregistrat!");
        setLoading(false);
        return;
      }

      // Reset form
      setSignUpData({ name: '', email: '', password: '' });
      setIsSignUp(false);

    } catch (error) {
      console.error('Sign up error:', error);

      if (error.message.includes('already registered')) {
        toast.error("Acest email este deja înregistrat");
      } else if (error.message.includes('Password')) {
        toast.error("Parola nu respectă cerințele de securitate");
      } else {
        toast.error("Eroare la creare cont: " + error.message);
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
        toast.error("Email invalid");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginData.email,
        password: loginData.password,
      });

      if (error) throw error;

      toast.success("Bine ai revenit! 👋");
      setLoginData({ email: '', password: '' });

    } catch (error) {
      console.error('Login error:', error);

      if (error.message.includes('Invalid login credentials')) {
        toast.error("Email sau parolă incorectă");
      } else if (error.message.includes('Email not confirmed')) {
        toast.error(
          <div>
            <p className="font-bold">Email neconfirmat</p>
            <p className="text-sm">Verifică inbox-ul pentru link-ul de confirmare</p>
          </div>,
          { duration: 6000 }
        );
      } else if (error.message.includes('Invalid email')) {
        toast.error("Format email invalid");
      } else {
        toast.error("Eroare la autentificare: " + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!loginData.email) {
      toast.error("Introdu email-ul tău mai întâi");
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
          <p className="font-bold">✉️ Email trimis!</p>
          <p className="text-sm">Verifică inbox-ul pentru resetare parolă</p>
        </div>,
        { duration: 6000 }
      );
    } catch (error) {
      toast.error("Eroare: " + error.message);
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
                      src="src/assets/IconApp.svg"
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
                  Bine ai revenit
                </h1>
                <p className="text-gray-600 text-sm mb-8">
                  Autentifică-te pentru a continua.<br />
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <div className="relative">
                    <FontAwesomeIcon
                      icon={faEnvelope}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="email"
                      placeholder="exemplu@email.com"
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
                      <span>{loginEmailValidation.error}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Parolă
                  </label>
                  <div className="relative">
                    <FontAwesomeIcon
                      icon={faLock}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Minim 8 caractere"
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
                      Ai uitat parola?
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
                      Se autentifică...
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faRightToBracket} />
                      Autentificare
                    </>
                  )}
                </button>
              </form>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500">sau continuă cu</span>
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
                Nu ai un cont?{' '}
                <button
                  type="button"
                  onClick={() => setIsSignUp(true)}
                  className="text-emerald-600 hover:text-emerald-700 font-semibold"
                >
                  Înregistrează-te
                </button>
              </p>
            </div>
          ) : (

            <div>
              {/* Sign Up Form */}
              <div>
                <div className="flex justify-center mb-6">
                  <img
                    src="/src/assets/IconApp.svg"
                    alt="Logo"
                    className="h-16 w-auto object-contain"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.parentElement.innerHTML = '<div class="text-5xl">🌱</div>';
                    }}
                  />
                </div>

                <h1 className="text-center text-3xl font-semibold mb-2 text-gray-900">
                  Creează cont
                </h1>
              </div>


              <form onSubmit={handleSignUp} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nume complet
                  </label>
                  <div className="relative">
                    <FontAwesomeIcon
                      icon={faUser}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="text"
                      placeholder="Numele tău"
                      value={signUpData.name}
                      onChange={(e) => setSignUpData({ ...signUpData, name: e.target.value })}
                      className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <div className="relative">
                    <FontAwesomeIcon
                      icon={faEnvelope}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="email"
                      placeholder="exemplu@email.com"
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
                      <span>{signUpEmailValidation.error}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Parolă<span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <FontAwesomeIcon
                      icon={faLock}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Minim 8 caractere"
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
                            <p className="font-medium">Parola trebuie să conțină o cifră și o literă mică</p>
                          </div>
                        </div>
                      )}

                      {/* Requirements List */}
                      <p className="text-xs text-gray-600">
                        Parola trebuie să aibă cel puțin 15 caractere SAU cel puțin 8 caractere incluzând o cifră și o literă mică.
                      </p>

                      {/* Checklist */}
                      <div className="space-y-1">
                        <div className={`flex items-center gap-2 text-xs ${passwordValidation.checks.minLength ? 'text-green-600' : 'text-gray-400'}`}>
                          <FontAwesomeIcon icon={passwordValidation.checks.minLength ? faCheck : faXmark} />
                          <span>Minim 8 caractere</span>
                        </div>
                        <div className={`flex items-center gap-2 text-xs ${passwordValidation.checks.hasNumber ? 'text-green-600' : 'text-gray-400'}`}>
                          <FontAwesomeIcon icon={passwordValidation.checks.hasNumber ? faCheck : faXmark} />
                          <span>Conține cel puțin o cifră</span>
                        </div>
                        <div className={`flex items-center gap-2 text-xs ${passwordValidation.checks.hasLowercase ? 'text-green-600' : 'text-gray-400'}`}>
                          <FontAwesomeIcon icon={passwordValidation.checks.hasLowercase ? faCheck : faXmark} />
                          <span>Conține cel puțin o literă mică</span>
                        </div>
                        <div className={`flex items-center gap-2 text-xs ${passwordValidation.checks.hasUppercase ? 'text-green-600' : 'text-gray-400'}`}>
                          <FontAwesomeIcon icon={passwordValidation.checks.hasUppercase ? faCheck : faXmark} />
                          <span>Conține literă mare (opțional, dar recomandat)</span>
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
                          Putere parolă: {
                            passwordValidation.strength <= 2 ? 'Slabă' :
                              passwordValidation.strength === 3 ? 'Medie' :
                                'Puternică'
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
                      Se creează contul...
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faUserPlus} />
                      Creează cont
                    </>
                  )}
                </button>
              </form>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500">sau continuă cu</span>
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
                Ai deja un cont?{' '}
                <button
                  type="button"
                  onClick={() => setIsSignUp(false)}
                  className="text-emerald-600 hover:text-emerald-700 font-semibold"
                >
                  Autentifică-te
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
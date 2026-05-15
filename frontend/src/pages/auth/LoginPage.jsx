/**
 * CARTEX — Auth Pages
 * Login, Register, Verify Email, Forgot/Reset Password
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Mail, Lock, User, Phone, Home, ArrowRight, KeyRound } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { authApi, districtsApi, localitiesApi } from '@services/api';
import { useAuthStore } from '@store/authStore';
import { connectSocket } from '@services/socket';
import { Button, Input, Divider } from '@components/common/GlobalLoader';

// ── Shared Layout ──────────────────────────────────────────────
const AuthLayout = ({ children, title, subtitle }) => (
  <div className="min-h-screen bg-surface flex items-center justify-center p-4 relative overflow-hidden">
    {/* Background orbs */}
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-brand-500/10 blur-3xl animate-float" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-purple-500/8 blur-3xl animate-float" style={{ animationDelay: '1.5s' }} />
    </div>

    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-md relative z-10"
    >
      {/* Logo */}
      <div className="text-center mb-8">
        <Link to="/" className="inline-flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-red-500 flex items-center justify-center shadow-glow-orange">
            <span className="text-white font-black text-2xl">X</span>
          </div>
          <span className="font-black text-2xl gradient-text">CARTEX</span>
        </Link>
        <h1 className="text-2xl font-black text-white mt-6 mb-2">{title}</h1>
        {subtitle && <p className="text-white/50 text-sm">{subtitle}</p>}
      </div>

      <div className="card p-8 space-y-6">
        {children}
      </div>
    </motion.div>
  </div>
);

// ══════════════════════════════════════════════════════════════
// LOGIN PAGE
// ══════════════════════════════════════════════════════════════
const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
  otp: z.string().optional(),
});

export function LoginPage() {
  const [showPass, setShowPass] = useState(false);
  const [showOTP, setShowOTP] = useState(false);
  const [otp, setOtp] = useState('');
  const { login } = useAuthStore();
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors }, setValue } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const mutation = useMutation({
    mutationFn: (data) => authApi.login(data),
    onSuccess: (data) => {
      login(data.data.user, data.data.accessToken);
      toast.success(`Welcome back, ${data.data.user.name}! 👋`);
      connectSocket();
      const roleRoutes = {
        admin: '/admin/dashboard',
        distributor: '/distributor/dashboard',
        delivery: '/delivery/dashboard',
        customer: '/',
        support: '/support/dashboard',
      };
      navigate(roleRoutes[data.data.user.role] || '/');
    },
    onError: (err) => {
      if (err.message?.includes('OTP required')) {
        setShowOTP(true);
        toast.error('OTP required for new accounts. Please enter the OTP from registration.');
      } else {
        toast.error(err.message || 'Login failed');
      }
    },
  });

  const handleLogin = (data) => {
    const loginData = { ...data };
    if (showOTP && otp) {
      loginData.otp = otp;
    }
    mutation.mutate(loginData);
  };

  return (
    <AuthLayout title="Welcome back!" subtitle="Sign in to your CARTEX account">
      <form onSubmit={handleSubmit(handleLogin)} className="space-y-4">
        <Input
          label="Email"
          type="email"
          placeholder="you@college.edu"
          leftIcon={<Mail className="w-4 h-4" />}
          error={errors.email?.message}
          {...register('email')}
        />
        <Input
          label="Password"
          type={showPass ? 'text' : 'password'}
          placeholder="••••••••"
          leftIcon={<Lock className="w-4 h-4" />}
          rightIcon={
            <button type="button" onClick={() => setShowPass(!showPass)} className="hover:text-white transition-colors">
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          }
          error={errors.password?.message}
          {...register('password')}
        />

        {showOTP && (
          <Input
            label="OTP (from registration)"
            placeholder="Enter 6-digit OTP"
            leftIcon={<KeyRound className="w-4 h-4" />}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/, '').slice(0, 6))}
            error={errors.otp?.message}
          />
        )}

        <div className="flex justify-end">
          <Link to="/auth/forgot-password" className="text-brand-400 text-sm hover:text-brand-300 transition-colors">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" className="w-full" loading={mutation.isPending} rightIcon={<ArrowRight className="w-4 h-4" />}>
          Sign In
        </Button>
      </form>

      <Divider label="New here?" />
      <p className="text-center text-white/50 text-sm">
        Don't have an account?{' '}
        <Link to="/auth/register" className="text-brand-400 hover:text-brand-300 font-semibold transition-colors">
          Create one free
        </Link>
      </p>
    </AuthLayout>
  );
}

// ══════════════════════════════════════════════════════════════
// REGISTER PAGE
// ══════════════════════════════════════════════════════════════
const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email'),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Enter valid 10-digit Indian mobile number'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain uppercase letter')
    .regex(/[0-9]/, 'Must contain a number'),
  hostelName: z.string().min(2, 'Enter your hostel name'),
  district: z.string().min(1, 'Select your district'),
  locality: z.string().min(1, 'Select your locality'),
  gender: z.enum(['male', 'female', 'other'], { errorMap: () => ({ message: 'Select your gender' }) }),
  collegeStudent: z.preprocess((val) => val === true || val === 'true', z.boolean()).optional(),
  collegeName: z.string().optional(),
  isHosteller: z.preprocess((val) => val === true || val === 'true', z.boolean()).optional(),
  onCampus: z.preprocess((val) => val === true || val === 'true', z.boolean()).optional(),
  roomNumber: z.string().optional(),
  hostelLocation: z.string().optional(),
  referralCode: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.collegeStudent && !data.collegeName) {
    ctx.addIssue({ path: ['collegeName'], message: 'College name is required for college students' });
  }
  if (data.collegeStudent && typeof data.isHosteller !== 'boolean') {
    ctx.addIssue({ path: ['isHosteller'], message: 'Please indicate if you are a hosteller' });
  }
  if (data.collegeStudent && data.isHosteller) {
    if (typeof data.onCampus !== 'boolean') {
      ctx.addIssue({ path: ['onCampus'], message: 'Please indicate if you live on campus' });
    }
    if (data.onCampus && !data.roomNumber) {
      ctx.addIssue({ path: ['roomNumber'], message: 'Room number is required for on-campus hostellers' });
    }
    if (data.onCampus === false && !data.hostelLocation) {
      ctx.addIssue({ path: ['hostelLocation'], message: 'Hostel location is required for off-campus hostellers' });
    }
  }
});

export function RegisterPage() {
  const [showPass, setShowPass] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const { data: districts = [] } = useQuery({
    queryKey: ['districts'],
    queryFn: districtsApi.getAll,
    select: (d) => d.data.districts,
    staleTime: 30 * 60 * 1000,
  });

  const { data: localities = [] } = useQuery({
    queryKey: ['localities'],
    queryFn: localitiesApi.getAll,
    select: (d) => d.data.localities,
    staleTime: 30 * 60 * 1000,
  });

  const {
    register,
    watch,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { referralCode: searchParams.get('ref') || '' },
  });

  const selectedDistrict = watch('district');
  useEffect(() => {
    setValue('locality', '');
  }, [selectedDistrict, setValue]);

  const localityOptions = localities.filter((locality) => locality.district._id === selectedDistrict);

  const mutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: (data) => {
      toast.success('Account created! Use the OTP to login.');
      // Show OTP in a modal or alert for development
      alert(`Your login OTP is: ${data.data.otp}\n\nUse this OTP to login to your account.`);
      navigate('/auth/login');
    },
    onError: (err) => toast.error(err.message || 'Registration failed'),
  });

  return (
    <AuthLayout title="Join CARTEX" subtitle="Shop smarter from your hostel">
      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Full Name" placeholder="Arjun Sharma" leftIcon={<User className="w-4 h-4" />} error={errors.name?.message} {...register('name')} />
          <Input label="Phone" placeholder="9876543210" leftIcon={<Phone className="w-4 h-4" />} error={errors.phone?.message} {...register('phone')} />
        </div>

        <Input label="Email" type="email" placeholder="you@college.edu" leftIcon={<Mail className="w-4 h-4" />} error={errors.email?.message} {...register('email')} />

        <Input
          label="Password"
          type={showPass ? 'text' : 'password'}
          placeholder="Min 8 chars, 1 uppercase, 1 number"
          leftIcon={<Lock className="w-4 h-4" />}
          rightIcon={
            <button type="button" onClick={() => setShowPass(!showPass)} className="hover:text-white transition-colors">
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          }
          error={errors.password?.message}
          {...register('password')}
        />

        <Input label="Hostel Name" placeholder="e.g. Boys Hostel Block A" leftIcon={<Home className="w-4 h-4" />} error={errors.hostelName?.message} {...register('hostelName')} />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-semibold text-white/70 mb-2 block">District</label>
            <select className="input w-full" {...register('district') }>
              <option value="">Select district</option>
              {districts.map((district) => (
                <option key={district._id} value={district._id}>{district.name}</option>
              ))}
            </select>
            {errors.district?.message && <p className="text-red-400 text-xs mt-1">{errors.district.message}</p>}
          </div>
          <div>
            <label className="text-sm font-semibold text-white/70 mb-2 block">Locality</label>
            <select className="input w-full" {...register('locality')} disabled={!selectedDistrict}>
              <option value="">Select locality</option>
              {localityOptions.map((locality) => (
                <option key={locality._id} value={locality._id}>{locality.name}</option>
              ))}
            </select>
            {errors.locality?.message && <p className="text-red-400 text-xs mt-1">{errors.locality.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-semibold text-white/70 mb-2 block">Gender</label>
            <div className="grid grid-cols-3 gap-2">
              {['male', 'female', 'other'].map((option) => (
                <label key={option} className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-surface-2 border border-white/10 cursor-pointer hover:border-brand-500">
                  <input type="radio" value={option} {...register('gender')} className="hidden" />
                  <span className="text-sm capitalize text-white/80">{option}</span>
                </label>
              ))}
            </div>
            {errors.gender?.message && <p className="text-red-400 text-xs mt-1">{errors.gender.message}</p>}
          </div>

          <div>
            <label className="text-sm font-semibold text-white/70 mb-2 block">College Student</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Yes', value: 'true' },
                { label: 'No', value: 'false' },
              ].map((option) => (
                <label key={option.value} className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-surface-2 border border-white/10 cursor-pointer hover:border-brand-500">
                  <input type="radio" value={option.value} {...register('collegeStudent')} className="hidden" />
                  <span className="text-sm text-white/80">{option.label}</span>
                </label>
              ))}
            </div>
            {errors.collegeStudent?.message && <p className="text-red-400 text-xs mt-1">{errors.collegeStudent.message}</p>}
          </div>
        </div>

        {watch('collegeStudent') === 'true' && (
          <div className="space-y-4">
            <Input label="College Name" placeholder="e.g. Institute of Engineering" error={errors.collegeName?.message} {...register('collegeName')} />

            <div>
              <label className="text-sm font-semibold text-white/70 mb-2 block">Hosteller?</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Yes', value: 'true' },
                  { label: 'No', value: 'false' },
                ].map((option) => (
                  <label key={option.value} className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-surface-2 border border-white/10 cursor-pointer hover:border-brand-500">
                    <input type="radio" value={option.value} {...register('isHosteller')} className="hidden" />
                    <span className="text-sm text-white/80">{option.label}</span>
                  </label>
                ))}
              </div>
              {errors.isHosteller?.message && <p className="text-red-400 text-xs mt-1">{errors.isHosteller.message}</p>}
            </div>

            {watch('isHosteller') === 'true' && (
              <div>
                <label className="text-sm font-semibold text-white/70 mb-2 block">Live on campus?</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Yes', value: 'true' },
                    { label: 'No', value: 'false' },
                  ].map((option) => (
                    <label key={option.value} className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-surface-2 border border-white/10 cursor-pointer hover:border-brand-500">
                      <input type="radio" value={option.value} {...register('onCampus')} className="hidden" />
                      <span className="text-sm text-white/80">{option.label}</span>
                    </label>
                  ))}
                </div>
                {errors.onCampus?.message && <p className="text-red-400 text-xs mt-1">{errors.onCampus.message}</p>}
              </div>
            )}

            {watch('isHosteller') === 'true' && watch('onCampus') === 'true' && (
              <Input label="Room Number" placeholder="e.g. A-204" error={errors.roomNumber?.message} {...register('roomNumber')} />
            )}

            {watch('isHosteller') === 'true' && watch('onCampus') === 'false' && (
              <Input label="Hostel Location" placeholder="e.g. Block B, East Wing" error={errors.hostelLocation?.message} {...register('hostelLocation')} />
            )}
          </div>
        )}

        <Input label="Referral Code (optional)" placeholder="Enter friend's code" error={errors.referralCode?.message} {...register('referralCode')} hint="Both you and your friend earn 50 reward points!" />

        <Button type="submit" className="w-full" loading={mutation.isPending} rightIcon={<ArrowRight className="w-4 h-4" />}>
          Create Account
        </Button>

        <p className="text-center text-white/30 text-xs">
          By signing up, you agree to our Terms of Service and Privacy Policy
        </p>
      </form>

      <Divider />
      <p className="text-center text-white/50 text-sm">
        Already have an account?{' '}
        <Link to="/auth/login" className="text-brand-400 hover:text-brand-300 font-semibold">Sign in</Link>
      </p>
    </AuthLayout>
  );
}

// ══════════════════════════════════════════════════════════════
// VERIFY EMAIL PAGE
// ══════════════════════════════════════════════════════════════
export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const userId = searchParams.get('userId');
  const email = searchParams.get('email');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const mutation = useMutation({
    mutationFn: authApi.verifyEmail,
    onSuccess: (data) => {
      login(data.data.user, data.data.accessToken);
      toast.success('Email verified! Welcome to CARTEX 🎉');
      connectSocket();
      navigate('/');
    },
    onError: (err) => toast.error(err.message || 'Invalid OTP'),
  });

  const resendMutation = useMutation({
    mutationFn: () => authApi.forgotPassword({ email }),
    onSuccess: () => toast.success('New OTP sent to your email'),
    onError: () => toast.error('Failed to resend OTP'),
  });

  const handleOtpChange = (val, idx) => {
    const clean = val.replace(/\D/, '');
    const next = [...otp];
    next[idx] = clean;
    setOtp(next);
    if (clean && idx < 5) {
      document.getElementById(`otp-${idx + 1}`)?.focus();
    }
    if (next.every(d => d) && next.join('').length === 6) {
      mutation.mutate({ userId, otp: next.join('') });
    }
  };

  const handleKeyDown = (e, idx) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
      document.getElementById(`otp-${idx - 1}`)?.focus();
    }
  };

  const handlePaste = (e) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (text.length === 6) {
      setOtp(text.split(''));
      mutation.mutate({ userId, otp: text });
    }
  };

  return (
    <AuthLayout title="Verify your email" subtitle={`We sent a 6-digit OTP to ${email || 'your email'}`}>
      <div className="text-center mb-6">
        <div className="text-5xl mb-3">📧</div>
        <p className="text-white/50 text-sm">Enter the OTP to activate your account</p>
      </div>

      <div className="flex gap-3 justify-center" onPaste={handlePaste}>
        {otp.map((digit, i) => (
          <input
            key={i}
            id={`otp-${i}`}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleOtpChange(e.target.value, i)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            className="w-12 h-14 text-center text-2xl font-black bg-surface-2 border-2 border-white/10 rounded-xl text-white focus:border-brand-500 focus:outline-none transition-colors"
          />
        ))}
      </div>

      {mutation.isPending && (
        <div className="text-center text-white/50 text-sm animate-pulse">Verifying...</div>
      )}

      <Button
        className="w-full"
        loading={mutation.isPending}
        disabled={otp.join('').length !== 6}
        onClick={() => mutation.mutate({ userId, otp: otp.join('') })}
      >
        Verify OTP
      </Button>

      <p className="text-center text-white/50 text-sm">
        Didn't get the OTP?{' '}
        <button onClick={() => resendMutation.mutate()} className="text-brand-400 hover:text-brand-300 font-semibold" disabled={resendMutation.isPending}>
          {resendMutation.isPending ? 'Resending...' : 'Resend'}
        </button>
      </p>
    </AuthLayout>
  );
}

// ══════════════════════════════════════════════════════════════
// FORGOT PASSWORD PAGE
// ══════════════════════════════════════════════════════════════
export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState('');

  const mutation = useMutation({
    mutationFn: authApi.forgotPassword,
    onSuccess: () => setSent(true),
    onError: (err) => toast.error(err.message),
  });

  return (
    <AuthLayout title="Reset password" subtitle="Enter your email and we'll send an OTP">
      {sent ? (
        <div className="text-center space-y-4">
          <div className="text-5xl">📬</div>
          <p className="text-white font-semibold">OTP sent!</p>
          <p className="text-white/50 text-sm">Check your inbox at {email}</p>
          <Link to={`/auth/reset-password?email=${encodeURIComponent(email)}`}>
            <Button className="w-full" rightIcon={<ArrowRight className="w-4 h-4" />}>Enter OTP</Button>
          </Link>
        </div>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate({ email }); }} className="space-y-4">
          <Input
            label="Email address"
            type="email"
            placeholder="you@college.edu"
            leftIcon={<Mail className="w-4 h-4" />}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Button type="submit" className="w-full" loading={mutation.isPending}>Send Reset OTP</Button>
          <p className="text-center">
            <Link to="/auth/login" className="text-brand-400 text-sm hover:text-brand-300">← Back to login</Link>
          </p>
        </form>
      )}
    </AuthLayout>
  );
}

// ══════════════════════════════════════════════════════════════
// RESET PASSWORD PAGE
// ══════════════════════════════════════════════════════════════
export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';
  const navigate = useNavigate();
  const [showPass, setShowPass] = useState(false);

  const schema = z.object({
    otp: z.string().length(6, 'OTP must be 6 digits'),
    newPassword: z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/),
    confirmPassword: z.string(),
  }).refine(d => d.newPassword === d.confirmPassword, {
    message: "Passwords don't match", path: ['confirmPassword'],
  });

  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema) });

  const mutation = useMutation({
    mutationFn: authApi.resetPassword,
    onSuccess: () => {
      toast.success('Password reset! Please log in.');
      navigate('/auth/login');
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <AuthLayout title="Set new password" subtitle={`Reset password for ${email}`}>
      <form onSubmit={handleSubmit((d) => mutation.mutate({ email, ...d }))} className="space-y-4">
        <Input label="6-digit OTP" placeholder="123456" leftIcon={<KeyRound className="w-4 h-4" />} error={errors.otp?.message} maxLength={6} {...register('otp')} />
        <Input
          label="New Password"
          type={showPass ? 'text' : 'password'}
          placeholder="Min 8 chars, 1 uppercase, 1 number"
          leftIcon={<Lock className="w-4 h-4" />}
          rightIcon={<button type="button" onClick={() => setShowPass(!showPass)}>{showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>}
          error={errors.newPassword?.message}
          {...register('newPassword')}
        />
        <Input label="Confirm Password" type="password" placeholder="Repeat new password" leftIcon={<Lock className="w-4 h-4" />} error={errors.confirmPassword?.message} {...register('confirmPassword')} />
        <Button type="submit" className="w-full" loading={mutation.isPending}>Reset Password</Button>
      </form>
    </AuthLayout>
  );
}

export default LoginPage;


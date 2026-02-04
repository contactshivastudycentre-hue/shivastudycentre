import { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, ArrowLeft, Shield, KeyRound, LogOut } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const ADMIN_EMAIL = 'contact.shivastudycentre@gmail.com';
// Master password for admin creation authorization
const ADMIN_CREATION_PASSWORD = 'sscshivastudycentre987704ssc';

export default function AdminAuthPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSetupMode, setIsSetupMode] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { user, isAdmin, isLoading: authLoading, signIn, signOut, refreshProfile } = useAuth();
  const { toast } = useToast();

  // Redirect if already logged in as admin
  if (user && isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  // If logged in but not admin, show error with logout option
  if (user && !authLoading && !isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col">
        <div className="p-6">
          <Link to="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Home
          </Link>
        </div>
        <div className="flex-1 flex items-center justify-center px-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md bg-slate-800 rounded-2xl p-8 border border-slate-700 text-center"
          >
            <div className="w-20 h-20 rounded-full bg-red-900/50 flex items-center justify-center mx-auto mb-6">
              <Shield className="w-10 h-10 text-red-400" />
            </div>
            <h1 className="text-2xl font-display font-bold text-white mb-3">
              Access Denied
            </h1>
            <p className="text-slate-400 mb-4">
              You are logged in as a non-admin account. Please sign out and login with the admin account.
            </p>
            <p className="text-xs text-slate-500 mb-6">
              Admin Email: {ADMIN_EMAIL}
            </p>
            <div className="space-y-3">
              <Button 
                onClick={signOut}
                className="w-full bg-primary hover:bg-primary/90"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out & Login as Admin
              </Button>
              <Link to="/student-login">
                <Button variant="outline" className="w-full border-slate-600 text-white hover:bg-slate-700">
                  Go to Student Login
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      email: formData.get('email') as string,
      password: formData.get('password') as string,
    };

    try {
      loginSchema.parse(data);
    } catch (err) {
      if (err instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        err.errors.forEach((error) => {
          if (error.path[0]) {
            fieldErrors[error.path[0] as string] = error.message;
          }
        });
        setErrors(fieldErrors);
        setIsLoading(false);
        return;
      }
    }

    // Validate admin email
    if (data.email !== ADMIN_EMAIL) {
      toast({
        title: 'Access Denied',
        description: 'Only authorized admin email can login here.',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    const { error } = await signIn(data.email, data.password);

    if (error) {
      let description = error.message;
      if (error.message === 'Invalid login credentials') {
        description = 'Invalid password. If this is your first time, click "First Time Setup" below.';
      }
      toast({
        title: 'Login Failed',
        description,
        variant: 'destructive',
      });
    } else {
      // Refresh profile to get admin status
      await refreshProfile();
      toast({
        title: 'Login Successful',
        description: 'Welcome back, Admin!',
      });
    }

    setIsLoading(false);
  };

  const handleAdminSetup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const authorizationPassword = formData.get('authorizationPassword') as string;
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    // Verify authorization password first
    if (authorizationPassword !== ADMIN_CREATION_PASSWORD) {
      toast({
        title: 'Unauthorized Action',
        description: 'Invalid authorization password. Admin creation is not allowed.',
        variant: 'destructive',
      });
      setErrors({ authorizationPassword: 'Invalid authorization password' });
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setErrors({ password: 'Password must be at least 6 characters' });
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setErrors({ confirmPassword: 'Passwords do not match' });
      setIsLoading(false);
      return;
    }

    // Create admin account with the predefined email
    const { data, error } = await supabase.auth.signUp({
      email: ADMIN_EMAIL,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/admin`,
      },
    });

    if (error) {
      if (error.message.includes('already registered')) {
        toast({
          title: 'Account Exists',
          description: 'Admin account already exists. Please use Login instead.',
          variant: 'destructive',
        });
        setIsSetupMode(false);
      } else {
        toast({
          title: 'Setup Failed',
          description: error.message,
          variant: 'destructive',
        });
      }
      setIsLoading(false);
      return;
    }

    if (data.user) {
      // Wait a bit for the trigger to fire
      await new Promise(resolve => setTimeout(resolve, 1000));
      await refreshProfile();
      
      toast({
        title: 'Admin Account Created!',
        description: 'You are now logged in as admin.',
      });
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col">
      {/* Back Link */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="p-6"
      >
        <Link to="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Home
        </Link>
      </motion.div>

      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md"
        >
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-xl">
                {isSetupMode ? (
                  <KeyRound className="w-10 h-10 text-white" />
                ) : (
                  <Shield className="w-10 h-10 text-white" />
                )}
              </div>
            </div>
            <h1 className="text-3xl font-display font-bold text-white">
              {isSetupMode ? 'Admin Setup' : 'Admin Login'}
            </h1>
            <p className="text-slate-400 mt-2">
              {isSetupMode ? 'Create your admin account' : 'Authorized personnel only'}
            </p>
          </div>

          {/* Login/Setup Form */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-slate-800 rounded-2xl p-8 border border-slate-700 shadow-xl"
          >
            {!isSetupMode ? (
              // Login Form
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-300">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    defaultValue={ADMIN_EMAIL}
                    placeholder="admin@email.com"
                    className="h-12 rounded-xl bg-slate-900 border-slate-600 text-white placeholder:text-slate-500 focus:border-primary"
                    required
                    readOnly
                  />
                  {errors.email && (
                    <p className="text-sm text-red-400">{errors.email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-slate-300">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      className="pr-12 h-12 rounded-xl bg-slate-900 border-slate-600 text-white placeholder:text-slate-500 focus:border-primary"
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-sm text-red-400">{errors.password}</p>
                  )}
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-12 rounded-xl text-base bg-primary hover:bg-primary/90" 
                  disabled={isLoading}
                >
                  {isLoading ? 'Logging in...' : 'Login as Admin'}
                </Button>

                <div className="pt-4 border-t border-slate-700">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-10 rounded-xl border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
                    onClick={() => setIsSetupMode(true)}
                  >
                    <KeyRound className="w-4 h-4 mr-2" />
                    First Time Setup
                  </Button>
                </div>
              </form>
            ) : (
              // Setup Form with Authorization Password
              <form onSubmit={handleAdminSetup} className="space-y-5">
                <div className="p-3 bg-blue-900/30 border border-blue-700 rounded-xl mb-4">
                  <p className="text-sm text-blue-300">
                    <strong>Admin Email:</strong><br />
                    {ADMIN_EMAIL}
                  </p>
                </div>

                {/* Authorization Password - Required for admin creation */}
                <div className="space-y-2">
                  <Label htmlFor="authorizationPassword" className="text-amber-400 font-semibold">
                    Authorization Password *
                  </Label>
                  <Input
                    id="authorizationPassword"
                    name="authorizationPassword"
                    type="password"
                    placeholder="Enter admin creation password"
                    className="h-12 rounded-xl bg-slate-900 border-amber-600 text-white placeholder:text-slate-500 focus:border-amber-400"
                    required
                  />
                  {errors.authorizationPassword && (
                    <p className="text-sm text-red-400">{errors.authorizationPassword}</p>
                  )}
                  <p className="text-xs text-amber-400/70">
                    This password is required to authorize admin account creation
                  </p>
                </div>

                <div className="border-t border-slate-700 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="setup-password" className="text-slate-300">Create Account Password</Label>
                    <div className="relative">
                      <Input
                        id="setup-password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Minimum 6 characters"
                        className="pr-12 h-12 rounded-xl bg-slate-900 border-slate-600 text-white placeholder:text-slate-500 focus:border-primary"
                        required
                      />
                      <button
                        type="button"
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-sm text-red-400">{errors.password}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-slate-300">Confirm Account Password</Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Confirm your password"
                    className="h-12 rounded-xl bg-slate-900 border-slate-600 text-white placeholder:text-slate-500 focus:border-primary"
                    required
                  />
                  {errors.confirmPassword && (
                    <p className="text-sm text-red-400">{errors.confirmPassword}</p>
                  )}
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-12 rounded-xl text-base bg-primary hover:bg-primary/90" 
                  disabled={isLoading}
                >
                  {isLoading ? 'Creating Account...' : 'Create Admin Account'}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full h-10 text-slate-400 hover:text-white"
                  onClick={() => setIsSetupMode(false)}
                >
                  Back to Login
                </Button>
              </form>
            )}
          </motion.div>

          <p className="text-center text-slate-500 text-sm mt-6">
            Not an admin?{' '}
            <Link to="/student-login" className="text-primary hover:underline">
              Go to Student Login
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

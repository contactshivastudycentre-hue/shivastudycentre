import { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, ArrowLeft, Shield } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { Logo } from '@/components/Logo';
import { motion } from 'framer-motion';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export default function AdminAuthPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { user, isAdmin, isLoading: authLoading, signIn } = useAuth();
  const { toast } = useToast();

  // Redirect if already logged in as admin
  if (user && isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  // If logged in but not admin, show error
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
            <p className="text-slate-400 mb-6">
              You do not have admin privileges. Please login with an admin account.
            </p>
            <Link to="/student-login">
              <Button variant="outline" className="w-full border-slate-600 text-white hover:bg-slate-700">
                Go to Student Login
              </Button>
            </Link>
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

    const { error } = await signIn(data.email, data.password);

    if (error) {
      let description = error.message;
      if (error.message === 'Invalid login credentials') {
        description = 'Invalid email or password.';
      }
      toast({
        title: 'Login Failed',
        description,
        variant: 'destructive',
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
                <Shield className="w-10 h-10 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-display font-bold text-white">
              Admin Login
            </h1>
            <p className="text-slate-400 mt-2">
              Authorized personnel only
            </p>
          </div>

          {/* Login Form */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-slate-800 rounded-2xl p-8 border border-slate-700 shadow-xl"
          >
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-300">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="admin@email.com"
                  className="h-12 rounded-xl bg-slate-900 border-slate-600 text-white placeholder:text-slate-500 focus:border-primary"
                  required
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
            </form>
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

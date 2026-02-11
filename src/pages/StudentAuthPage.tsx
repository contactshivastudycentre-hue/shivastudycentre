import { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, EyeOff, ArrowLeft, Sparkles, Clock, UserCheck, AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { Logo } from '@/components/Logo';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { ClassSelect } from '@/components/ClassSelect';
import { ForgotPasswordModal } from '@/components/ForgotPasswordModal';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signupSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  mobile: z.string().min(10, 'Please enter a valid mobile number'),
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  studentClass: z.string().min(1, 'Please select your class'),
});

export default function StudentAuthPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [studentClass, setStudentClass] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const { user, profile, isAdmin, signIn, signUp } = useAuth();
  const { toast } = useToast();

  // Redirect if already logged in and approved
  if (user && profile) {
    if (isAdmin) {
      return <Navigate to="/admin" replace />;
    }
    if (profile.status === 'approved') {
      return <Navigate to="/dashboard" replace />;
    }
  }

  // Show pending/inactive message if logged in but not approved
  if (user && profile && profile.status !== 'approved') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5 flex flex-col">
        <div className="p-6">
          <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Home
          </Link>
        </div>
        <div className="flex-1 flex items-center justify-center px-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md bg-card rounded-2xl p-8 shadow-xl border border-border text-center"
          >
            <div className="flex justify-center mb-6">
              {profile.status === 'pending' ? (
                <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center">
                  <Clock className="w-10 h-10 text-amber-600" />
                </div>
              ) : (
                <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertCircle className="w-10 h-10 text-red-600" />
                </div>
              )}
            </div>
            
            <h1 className="text-2xl font-display font-bold text-foreground mb-3">
              {profile.status === 'pending' ? 'Approval Pending' : 'Account Inactive'}
            </h1>
            
            <p className="text-muted-foreground mb-6">
              {profile.status === 'pending' 
                ? 'Your registration request has been sent for approval. Please wait for the admin to approve your account.'
                : 'Your account is not active. Please contact the institute for assistance.'}
            </p>

            <div className="p-4 bg-accent rounded-xl mb-6">
              <p className="text-sm text-muted-foreground">
                <strong>Name:</strong> {profile.full_name}<br />
                <strong>Class:</strong> {profile.class || 'Not specified'}<br />
                <strong>Status:</strong> <span className={profile.status === 'pending' ? 'text-amber-600' : 'text-red-600'}>
                  {profile.status.charAt(0).toUpperCase() + profile.status.slice(1)}
                </span>
              </p>
            </div>

            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => window.location.reload()}
            >
              Check Status Again
            </Button>
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
        description = 'Invalid email or password. If you are new, please sign up first.';
      } else if (error.message.includes('Email not confirmed')) {
        description = 'Please check your email and confirm your account first.';
      }
      toast({
        title: 'Login Failed',
        description,
        variant: 'destructive',
      });
    }

    setIsLoading(false);
  };

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      fullName: formData.get('fullName') as string,
      mobile: formData.get('mobile') as string,
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      studentClass: studentClass,
    };

    try {
      signupSchema.parse(data);
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

    // Check for duplicate mobile number
    const { data: existingMobile } = await supabase
      .from('profiles')
      .select('id')
      .eq('mobile', data.mobile)
      .maybeSingle();

    if (existingMobile) {
      toast({
        title: 'Mobile Number Already Registered',
        description: 'This mobile number is already registered with another account. Please use a different number.',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    const { error } = await signUp(
      data.email,
      data.password,
      data.fullName,
      data.mobile,
      data.studentClass
    );

    if (error) {
      if (error.message.includes('already registered')) {
        toast({
          title: 'Email Already Registered',
          description: 'This email is already registered. Please try logging in instead.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Registration Failed',
          description: error.message,
          variant: 'destructive',
        });
      }
    } else {
      toast({
        title: 'Registration Successful!',
        description: 'Your request has been sent for approval. Please wait for admin approval.',
      });
      setStudentClass('');
      (e.target as HTMLFormElement).reset();
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex flex-col">
      {/* Back Link */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="p-6"
      >
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group">
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
              <Logo size="lg" showText={false} />
            </div>
            <h1 className="text-3xl font-display font-bold text-foreground">
              Student Portal
            </h1>
            <p className="text-muted-foreground mt-2">
              Login or register as a student
            </p>
          </div>

          {/* Auth Tabs */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-card rounded-2xl p-8 shadow-xl border border-border"
          >
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6 rounded-xl h-12 bg-muted">
                <TabsTrigger value="login" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  Login
                </TabsTrigger>
                <TabsTrigger value="signup" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  Register
                </TabsTrigger>
              </TabsList>

              {/* Login Form */}
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      name="email"
                      type="email"
                      placeholder="your@email.com"
                      className="h-12 rounded-xl"
                      required
                    />
                    {errors.email && (
                      <p className="text-sm text-destructive">{errors.email}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="login-password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        className="pr-12 h-12 rounded-xl"
                        required
                      />
                      <button
                        type="button"
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-sm text-destructive">{errors.password}</p>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="text-sm text-primary hover:underline mt-1"
                    >
                      Forgot Password?
                    </button>
                  </div>

                  <Button type="submit" className="w-full h-12 rounded-xl text-base bg-primary hover:bg-primary/90" disabled={isLoading}>
                    {isLoading ? 'Logging in...' : 'Login'}
                  </Button>
                </form>
              </TabsContent>

              {/* Signup Form */}
              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      name="fullName"
                      placeholder="Your full name"
                      className="h-12 rounded-xl"
                      required
                    />
                    {errors.fullName && (
                      <p className="text-sm text-destructive">{errors.fullName}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mobile">Mobile Number</Label>
                    <Input
                      id="mobile"
                      name="mobile"
                      type="tel"
                      placeholder="+91 98765 43210"
                      className="h-12 rounded-xl"
                      required
                    />
                    {errors.mobile && (
                      <p className="text-sm text-destructive">{errors.mobile}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Class</Label>
                    <ClassSelect 
                      value={studentClass} 
                      onChange={setStudentClass}
                      placeholder="Select your class"
                      required
                    />
                    {errors.studentClass && (
                      <p className="text-sm text-destructive">{errors.studentClass}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      name="email"
                      type="email"
                      placeholder="your@email.com"
                      className="h-12 rounded-xl"
                      required
                    />
                    {errors.email && (
                      <p className="text-sm text-destructive">{errors.email}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="signup-password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Minimum 6 characters"
                        className="pr-12 h-12 rounded-xl"
                        required
                      />
                      <button
                        type="button"
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-sm text-destructive">{errors.password}</p>
                    )}
                  </div>

                  <Button type="submit" className="w-full h-12 rounded-xl text-base bg-primary hover:bg-primary/90" disabled={isLoading}>
                    {isLoading ? 'Creating Account...' : 'Register'}
                  </Button>

                  <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                    <Sparkles className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <p className="text-xs text-amber-700">
                      After registration, your account will be reviewed and approved by the admin.
                    </p>
                  </div>
                </form>
              </TabsContent>
            </Tabs>
          </motion.div>
        </motion.div>
      </div>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal 
        open={showForgotPassword} 
        onOpenChange={setShowForgotPassword} 
      />
    </div>
  );
}

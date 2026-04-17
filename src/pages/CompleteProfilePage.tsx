import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ClassSelect } from '@/components/ClassSelect';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/Logo';
import { Loader2, GraduationCap, Sparkles, LogOut } from 'lucide-react';

const schema = z.object({
  fullName: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  schoolName: z.string().trim().min(2, 'School name must be at least 2 characters').max(150),
  studentClass: z.string().min(1, 'Please select your class'),
  mobile: z.string().trim().min(10, 'Enter a valid phone number').max(15),
});

export default function CompleteProfilePage() {
  const { user, profile, isLoading, isAdmin, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    fullName: '',
    schoolName: '',
    studentClass: '',
    mobile: '',
  });

  useEffect(() => {
    if (profile) {
      setForm({
        fullName: profile.full_name || '',
        schoolName: (profile as any).school_name || '',
        studentClass: profile.class || '',
        mobile: profile.mobile || '',
      });
    }
  }, [profile]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/student-login" replace />;
  if (isAdmin) return <Navigate to="/admin" replace />;
  // Already complete? Skip this page.
  if (profile && (profile as any).profile_completed === true) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});

    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const fe: Record<string, string> = {};
      parsed.error.errors.forEach(err => {
        if (err.path[0]) fe[err.path[0] as string] = err.message;
      });
      setErrors(fe);
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: parsed.data.fullName,
          school_name: parsed.data.schoolName,
          class: parsed.data.studentClass,
          mobile: parsed.data.mobile,
          profile_completed: true,
        } as any)
        .eq('user_id', user.id);

      if (error) throw error;

      await refreshProfile();
      toast({ title: 'Welcome aboard! 🎉', description: 'Your profile is complete.' });
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      toast({
        title: 'Could not save profile',
        description: err?.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex flex-col">
      <div className="p-6 flex items-center justify-between">
        <Logo size="sm" showText={false} />
        <Button variant="ghost" size="sm" onClick={signOut} className="gap-2">
          <LogOut className="w-4 h-4" /> Sign out
        </Button>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
              <GraduationCap className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-display font-bold text-foreground">Complete your profile</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Just one quick step before you can access tests, notes, and videos.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="bg-card rounded-2xl p-6 shadow-xl border border-border space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                value={form.fullName}
                onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))}
                placeholder="Your full name"
                className="h-12 rounded-xl"
                required
              />
              {errors.fullName && <p className="text-xs text-destructive">{errors.fullName}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="schoolName">School Name *</Label>
              <Input
                id="schoolName"
                value={form.schoolName}
                onChange={e => setForm(p => ({ ...p, schoolName: e.target.value }))}
                placeholder="e.g. DAV Public School"
                className="h-12 rounded-xl"
                required
              />
              {errors.schoolName && <p className="text-xs text-destructive">{errors.schoolName}</p>}
            </div>

            <div className="space-y-2">
              <Label>Class / Grade *</Label>
              <ClassSelect
                value={form.studentClass}
                onChange={(v) => setForm(p => ({ ...p, studentClass: v }))}
                placeholder="Select your class"
              />
              {errors.studentClass && <p className="text-xs text-destructive">{errors.studentClass}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="mobile">Phone Number *</Label>
              <Input
                id="mobile"
                type="tel"
                value={form.mobile}
                onChange={e => setForm(p => ({ ...p, mobile: e.target.value }))}
                placeholder="+91 98765 43210"
                className="h-12 rounded-xl"
                required
              />
              {errors.mobile && <p className="text-xs text-destructive">{errors.mobile}</p>}
            </div>

            <Button
              type="submit"
              className="w-full h-12 rounded-xl text-base mt-2"
              disabled={submitting}
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" /> Continue to Dashboard
                </span>
              )}
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { KeyRound, CheckCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';

interface ForgotPasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const requestSchema = z.object({
  identifier: z.string().min(1, 'Please enter your email or mobile number'),
});

export function ForgotPasswordModal({ open, onOpenChange }: ForgotPasswordModalProps) {
  const [identifier, setIdentifier] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      requestSchema.parse({ identifier });
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message);
        return;
      }
    }

    setIsSubmitting(true);

    // Check if it's email or mobile
    const isEmail = identifier.includes('@');
    
    // Try to find the user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('user_id, full_name, class, mobile')
      .or(isEmail 
        ? `mobile.eq.${identifier}` 
        : `mobile.eq.${identifier}`)
      .maybeSingle();

    // Create password reset request
    const { error: insertError } = await supabase
      .from('password_reset_requests')
      .insert({
        user_id: profile?.user_id || null,
        email: isEmail ? identifier : null,
        mobile: !isEmail ? identifier : null,
        status: 'pending'
      });

    if (insertError) {
      toast({
        title: 'Error',
        description: 'Failed to submit request. Please try again.',
        variant: 'destructive',
      });
      setIsSubmitting(false);
      return;
    }

    setIsSuccess(true);
    setIsSubmitting(false);
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset state after animation
    setTimeout(() => {
      setIdentifier('');
      setIsSuccess(false);
      setError('');
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {isSuccess ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full bg-green-100 mx-auto mb-4 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-center">Request Submitted</DialogTitle>
              <DialogDescription className="text-center">
                Your password reset request has been sent to the admin. 
                They will contact you with a new password shortly.
              </DialogDescription>
            </DialogHeader>
            <Button 
              className="mt-6 w-full" 
              onClick={handleClose}
            >
              Close
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <div className="w-12 h-12 rounded-full bg-primary/10 mx-auto mb-4 flex items-center justify-center">
                <KeyRound className="w-6 h-6 text-primary" />
              </div>
              <DialogTitle className="text-center">Forgot Password?</DialogTitle>
              <DialogDescription className="text-center">
                Enter your registered email or mobile number. 
                The admin will review your request and reset your password.
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="identifier">Email or Mobile Number</Label>
                <Input
                  id="identifier"
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    setError('');
                  }}
                  placeholder="your@email.com or +91 98765 43210"
                  className="h-12 rounded-xl"
                  disabled={isSubmitting}
                />
                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}
              </div>

              <div className="flex gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="flex-1"
                  onClick={handleClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Request'
                  )}
                </Button>
              </div>

              <p className="text-xs text-center text-muted-foreground">
                For security, password resets are handled by the admin.
                You will be contacted with your new password.
              </p>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

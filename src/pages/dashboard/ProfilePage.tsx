import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { User, Mail, Phone, GraduationCap, Calendar, Save, LogOut, Send, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ClassSelect, CLASSES } from '@/components/ClassSelect';
import { RoleBadge } from '@/components/RoleBadge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface ClassChangeRequest {
  id: string;
  current_class: string;
  requested_class: string;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  admin_response: string | null;
}

export default function ProfilePage() {
  const { profile, user, refreshProfile, signOut } = useAuth();
  const { toast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [classRequests, setClassRequests] = useState<ClassChangeRequest[]>([]);
  const [requestedClass, setRequestedClass] = useState('');
  const [requestReason, setRequestReason] = useState('');

  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    mobile: profile?.mobile || '',
  });

  useEffect(() => {
    setFormData({
      full_name: profile?.full_name || '',
      mobile: profile?.mobile || '',
    });
  }, [profile?.full_name, profile?.mobile]);

  useEffect(() => {
    if (user?.id) {
      fetchClassRequests(user.id);
    }
  }, [user?.id]);

  const fetchClassRequests = async (userId: string) => {
    setIsLoadingRequests(true);
    try {
      const { data, error } = await (supabase as any)
        .from('class_change_requests')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error('[ProfilePage] class request fetch failed:', error);
        return;
      }

      setClassRequests((data || []) as ClassChangeRequest[]);
    } finally {
      setIsLoadingRequests(false);
    }
  };

  const handleSave = async () => {
    if (!profile) return;

    setIsSaving(true);

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: formData.full_name,
        mobile: formData.mobile,
      })
      .eq('id', profile.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update profile.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Profile Updated',
        description: 'Your profile has been saved.',
      });
      await refreshProfile();
      setIsEditing(false);
    }

    setIsSaving(false);
  };

  const handleClassRequest = async () => {
    if (!user?.id || !profile?.class) return;

    if (!requestedClass) {
      toast({ title: 'Missing class', description: 'Please select the requested class.', variant: 'destructive' });
      return;
    }

    if (requestedClass === profile.class) {
      toast({
        title: 'Same class selected',
        description: 'Choose a different class to request change.',
        variant: 'destructive',
      });
      return;
    }

    setIsRequesting(true);

    const { error } = await (supabase as any)
      .from('class_change_requests')
      .insert({
        user_id: user.id,
        current_class: profile.class,
        requested_class: requestedClass,
        reason: requestReason || null,
      });

    if (error) {
      console.error('[ProfilePage] class request insert failed:', error);
      const duplicatePending = error?.code === '23505';
      toast({
        title: 'Request failed',
        description: duplicatePending
          ? 'You already have a pending class change request.'
          : error.message || 'Could not submit request.',
        variant: 'destructive',
      });
      setIsRequesting(false);
      return;
    }

    toast({
      title: 'Request submitted',
      description: 'Your class change request was sent to admin.',
    });

    setRequestedClass('');
    setRequestReason('');
    setIsRequesting(false);
    fetchClassRequests(user.id);
  };

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Profile</h1>
        <p className="text-muted-foreground">Manage your account information</p>
      </div>

      <div className="dashboard-card space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center">
            <span className="text-3xl font-display font-bold text-primary-foreground">
              {profile?.full_name?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">{profile?.full_name}</h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <RoleBadge role="student" />
              <span
                className={`text-xs font-medium px-2 py-1 rounded-full ${
                  profile?.status === 'approved'
                    ? 'status-approved'
                    : profile?.status === 'pending'
                      ? 'status-pending'
                      : 'status-inactive'
                }`}
              >
                {profile?.status?.charAt(0).toUpperCase()}
                {profile?.status?.slice(1)}
              </span>
              {profile?.class && (
                <span className="text-xs font-medium px-2 py-1 rounded-full bg-secondary text-secondary-foreground">
                  {profile.class}
                </span>
              )}
            </div>
          </div>
        </div>

        {isEditing ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="input-focus"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mobile">Mobile Number</Label>
              <Input
                id="mobile"
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                className="input-focus"
              />
            </div>
            <div className="flex gap-3">
              <Button onClick={handleSave} disabled={isSaving}>
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-secondary">
              <User className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Full Name</p>
                <p className="font-medium text-foreground">{profile?.full_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-xl bg-secondary">
              <Mail className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium text-foreground">{user?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-xl bg-secondary">
              <Phone className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Mobile</p>
                <p className="font-medium text-foreground">{profile?.mobile}</p>
              </div>
            </div>
            {profile?.class && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-secondary">
                <GraduationCap className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Current Class</p>
                  <p className="font-medium text-foreground">{profile.class}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3 p-4 rounded-xl bg-secondary">
              <Calendar className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Member Since</p>
                <p className="font-medium text-foreground">
                  {profile?.created_at &&
                    new Date(profile.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                </p>
              </div>
            </div>
            <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
          </div>
        )}

        {profile?.class && (
          <div className="border-t pt-6 space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Request Class Change</h3>
            <div className="space-y-2">
              <Label>Requested Class</Label>
              <ClassSelect value={requestedClass} onChange={setRequestedClass} placeholder="Select new class" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Reason (optional)</Label>
              <Textarea
                id="reason"
                value={requestReason}
                onChange={(e) => setRequestReason(e.target.value)}
                placeholder="Write why class should be changed..."
                rows={3}
              />
            </div>
            <Button onClick={handleClassRequest} disabled={isRequesting} className="h-12 w-full sm:w-auto">
              {isRequesting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Submit Request
            </Button>

            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-foreground">Recent Requests</h4>
              {isLoadingRequests ? (
                <p className="text-sm text-muted-foreground">Loading requests...</p>
              ) : classRequests.length === 0 ? (
                <p className="text-sm text-muted-foreground">No class change requests yet.</p>
              ) : (
                classRequests.map((request) => (
                  <div key={request.id} className="rounded-lg border border-border p-3 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-foreground">
                        {request.current_class} → {request.requested_class}
                      </p>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          request.status === 'approved'
                            ? 'bg-success/10 text-success'
                            : request.status === 'rejected'
                              ? 'bg-destructive/10 text-destructive'
                              : 'bg-secondary text-secondary-foreground'
                        }`}
                      >
                        {request.status}
                      </span>
                    </div>
                    {request.reason && <p className="text-xs text-muted-foreground">Reason: {request.reason}</p>}
                    {request.admin_response && (
                      <p className="text-xs text-muted-foreground">Admin: {request.admin_response}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {new Date(request.created_at).toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <div className="dashboard-card">
        <h3 className="text-lg font-semibold text-foreground mb-4">Account Actions</h3>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="w-full sm:w-auto">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure you want to logout?</AlertDialogTitle>
              <AlertDialogDescription>
                You will be signed out of your account and redirected to the home page.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleLogout}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Logout
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

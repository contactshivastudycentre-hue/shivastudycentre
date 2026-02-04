import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Mail, Phone, GraduationCap, Calendar, Save } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function ProfilePage() {
  const { profile, user, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    mobile: profile?.mobile || '',
    class: profile?.class || '',
  });

  const handleSave = async () => {
    if (!profile) return;
    
    setIsSaving(true);

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: formData.full_name,
        mobile: formData.mobile,
        class: formData.class,
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

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Profile</h1>
        <p className="text-muted-foreground">Manage your account information</p>
      </div>

      {/* Profile Card */}
      <div className="dashboard-card">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center">
            <span className="text-3xl font-display font-bold text-primary-foreground">
              {profile?.full_name?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">{profile?.full_name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                profile?.status === 'approved' ? 'status-approved' :
                profile?.status === 'pending' ? 'status-pending' : 'status-inactive'
              }`}>
                {profile?.status?.charAt(0).toUpperCase()}{profile?.status?.slice(1)}
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
            <div className="space-y-2">
              <Label htmlFor="class">Class</Label>
              <Input
                id="class"
                value={formData.class}
                onChange={(e) => setFormData({ ...formData, class: e.target.value })}
                placeholder="e.g., Class 10, Class 12"
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
                  <p className="text-sm text-muted-foreground">Class</p>
                  <p className="font-medium text-foreground">{profile.class}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3 p-4 rounded-xl bg-secondary">
              <Calendar className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Member Since</p>
                <p className="font-medium text-foreground">
                  {profile?.created_at && new Date(profile.created_at).toLocaleDateString('en-US', {
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
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Users, Search, MoreVertical, CheckCircle, Ban, Undo, Edit, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  mobile: string;
  class: string | null;
  status: 'pending' | 'approved' | 'inactive';
  created_at: string;
}

const CLASS_OPTIONS = ['Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'];

export default function AdminStudentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [editClass, setEditClass] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const statusFilter = searchParams.get('status') as 'pending' | 'approved' | 'inactive' | null;

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) {
      // Filter out admin accounts (those with null class OR dummy mobile numbers)
      const students = data.filter((profile: Profile) => {
        // Exclude profiles with null class (typically admin accounts)
        if (!profile.class) return false;
        // Exclude dummy mobile numbers
        if (profile.mobile === '0000000000' || profile.mobile === '+91 9876543210') return false;
        // Exclude profiles named "Admin"
        if (profile.full_name.toLowerCase() === 'admin') return false;
        return true;
      });
      setProfiles(students as Profile[]);
    }
    setIsLoading(false);
  };

  const updateStatus = async (profileId: string, newStatus: 'approved' | 'inactive' | 'pending') => {
    const { error } = await supabase
      .from('profiles')
      .update({ status: newStatus })
      .eq('id', profileId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update student status.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Status Updated',
        description: `Student status changed to ${newStatus}.`,
      });
      fetchProfiles();
    }
  };

  const handleEditClass = (profile: Profile) => {
    setEditingProfile(profile);
    setEditClass(profile.class || '');
  };

  const saveClassChange = async () => {
    if (!editingProfile || !editClass) return;

    setIsSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ class: editClass })
      .eq('id', editingProfile.id);

    setIsSaving(false);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update student class.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Class Updated',
        description: `Student class changed to ${editClass}.`,
      });
      setEditingProfile(null);
      fetchProfiles();
    }
  };

  // Filter profiles based on search, status, and class
  const filteredProfiles = profiles.filter((profile) => {
    const matchesSearch =
      profile.full_name.toLowerCase().includes(search.toLowerCase()) ||
      profile.mobile.includes(search);
    const matchesStatus = !statusFilter || profile.status === statusFilter;
    const matchesClass = classFilter === 'all' || profile.class === classFilter;
    return matchesSearch && matchesStatus && matchesClass;
  });

  // Calculate counts for each status
  const statusCounts = {
    all: profiles.filter((p) => classFilter === 'all' || p.class === classFilter).length,
    pending: profiles.filter((p) => p.status === 'pending' && (classFilter === 'all' || p.class === classFilter)).length,
    approved: profiles.filter((p) => p.status === 'approved' && (classFilter === 'all' || p.class === classFilter)).length,
    inactive: profiles.filter((p) => p.status === 'inactive' && (classFilter === 'all' || p.class === classFilter)).length,
  };

  // Get unique classes for the filter
  const availableClasses = [...new Set(profiles.map((p) => p.class).filter(Boolean))] as string[];

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-success/10 text-success';
      case 'pending':
        return 'bg-pending/10 text-pending';
      case 'inactive':
        return 'bg-destructive/10 text-destructive';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse text-muted-foreground">Loading students...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Students</h1>
        <p className="text-muted-foreground">Manage student approvals and access</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4">
        {/* Search and Class Filter Row */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or mobile..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 input-focus"
            />
          </div>
          <Select value={classFilter} onValueChange={setClassFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by class" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {CLASS_OPTIONS.map((cls) => (
                <SelectItem key={cls} value={cls}>
                  {cls}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Status Filter Row */}
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={!statusFilter ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSearchParams({})}
          >
            All ({statusCounts.all})
          </Button>
          <Button
            variant={statusFilter === 'pending' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSearchParams({ status: 'pending' })}
          >
            Pending ({statusCounts.pending})
          </Button>
          <Button
            variant={statusFilter === 'approved' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSearchParams({ status: 'approved' })}
          >
            Approved ({statusCounts.approved})
          </Button>
          <Button
            variant={statusFilter === 'inactive' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSearchParams({ status: 'inactive' })}
          >
            Inactive ({statusCounts.inactive})
          </Button>
        </div>
      </div>

      {/* Table */}
      {filteredProfiles.length === 0 ? (
        <div className="dashboard-card text-center py-12">
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Students Found</h3>
          <p className="text-muted-foreground">
            {search || classFilter !== 'all'
              ? 'Try adjusting your filters.'
              : 'No students have registered yet.'}
          </p>
        </div>
      ) : (
        <div className="dashboard-card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[280px]">Student</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProfiles.map((profile) => (
                  <TableRow key={profile.id} className="hover:bg-muted/30">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                          {getInitials(profile.full_name)}
                        </div>
                        <span className="font-medium">{profile.full_name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{profile.mobile}</TableCell>
                    <TableCell>
                      <span className="text-sm font-medium text-foreground">
                        {profile.class || '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`text-xs font-medium px-2.5 py-1 rounded-full ${getStatusBadgeClass(
                          profile.status
                        )}`}
                      >
                        {profile.status.charAt(0).toUpperCase() + profile.status.slice(1)}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(profile.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditClass(profile)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Class
                          </DropdownMenuItem>
                          {profile.status !== 'approved' && (
                            <DropdownMenuItem onClick={() => updateStatus(profile.id, 'approved')}>
                              <CheckCircle className="w-4 h-4 mr-2 text-success" />
                              Approve
                            </DropdownMenuItem>
                          )}
                          {profile.status !== 'inactive' && (
                            <DropdownMenuItem onClick={() => updateStatus(profile.id, 'inactive')}>
                              <Ban className="w-4 h-4 mr-2 text-destructive" />
                              Deactivate
                            </DropdownMenuItem>
                          )}
                          {profile.status === 'inactive' && (
                            <DropdownMenuItem onClick={() => updateStatus(profile.id, 'pending')}>
                              <Undo className="w-4 h-4 mr-2" />
                              Set to Pending
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Edit Class Dialog */}
      <Dialog open={!!editingProfile} onOpenChange={() => setEditingProfile(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Student Class</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                {editingProfile ? getInitials(editingProfile.full_name) : ''}
              </div>
              <div>
                <p className="font-medium">{editingProfile?.full_name}</p>
                <p className="text-sm text-muted-foreground">{editingProfile?.mobile}</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="class-select">Class</Label>
              <Select value={editClass} onValueChange={setEditClass}>
                <SelectTrigger id="class-select">
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {CLASS_OPTIONS.map((cls) => (
                    <SelectItem key={cls} value={cls}>
                      {cls}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingProfile(null)}>
              Cancel
            </Button>
            <Button onClick={saveClassChange} disabled={isSaving || !editClass}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

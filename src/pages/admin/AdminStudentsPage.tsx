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
import { Users, Search, MoreVertical, CheckCircle, XCircle, Ban, Undo } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  mobile: string;
  class: string | null;
  status: 'pending' | 'approved' | 'inactive';
  created_at: string;
}

export default function AdminStudentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
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
      setProfiles(data as Profile[]);
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

  const filteredProfiles = profiles.filter((profile) => {
    const matchesSearch =
      profile.full_name.toLowerCase().includes(search.toLowerCase()) ||
      profile.mobile.includes(search);
    const matchesStatus = !statusFilter || profile.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusCounts = {
    all: profiles.length,
    pending: profiles.filter((p) => p.status === 'pending').length,
    approved: profiles.filter((p) => p.status === 'approved').length,
    inactive: profiles.filter((p) => p.status === 'inactive').length,
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
            {search ? 'Try a different search term.' : 'No students have registered yet.'}
          </p>
        </div>
      ) : (
        <div className="dashboard-card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProfiles.map((profile) => (
                  <TableRow key={profile.id}>
                    <TableCell className="font-medium">{profile.full_name}</TableCell>
                    <TableCell>{profile.mobile}</TableCell>
                    <TableCell>{profile.class || '-'}</TableCell>
                    <TableCell>
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded-full ${
                          profile.status === 'approved'
                            ? 'status-approved'
                            : profile.status === 'pending'
                            ? 'status-pending'
                            : 'status-inactive'
                        }`}
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
    </div>
  );
}

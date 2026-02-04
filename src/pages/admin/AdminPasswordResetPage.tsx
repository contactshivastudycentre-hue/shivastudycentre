import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { KeyRound, Check, X, Loader2, RefreshCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';

interface ResetRequest {
  id: string;
  user_id: string | null;
  email: string | null;
  mobile: string | null;
  status: 'pending' | 'completed' | 'rejected';
  admin_notes: string | null;
  created_at: string;
  resolved_at: string | null;
  profile?: {
    full_name: string;
    class: string | null;
  };
}

export default function AdminPasswordResetPage() {
  const [requests, setRequests] = useState<ResetRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<ResetRequest | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setIsLoading(true);
    
    const { data, error } = await supabase
      .from('password_reset_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) {
      // Fetch profile info for each request with user_id
      const requestsWithProfiles: ResetRequest[] = [];
      
      for (const request of data) {
        let profile = null;
        if (request.user_id) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('full_name, class')
            .eq('user_id', request.user_id)
            .maybeSingle();
          profile = profileData;
        }
        requestsWithProfiles.push({ ...request, profile } as ResetRequest);
      }
      
      setRequests(requestsWithProfiles);
    }
    
    setIsLoading(false);
  };

  const openResolveDialog = (request: ResetRequest) => {
    setSelectedRequest(request);
    setNewPassword('');
    setAdminNotes('');
    setIsDialogOpen(true);
  };

  const handleResolve = async (action: 'completed' | 'rejected') => {
    if (!selectedRequest) return;
    
    setIsProcessing(true);

    // Update the request status
    const { error } = await supabase
      .from('password_reset_requests')
      .update({
        status: action,
        admin_notes: adminNotes || null,
        resolved_at: new Date().toISOString(),
        resolved_by: user?.id
      })
      .eq('id', selectedRequest.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update request.',
        variant: 'destructive',
      });
      setIsProcessing(false);
      return;
    }

    if (action === 'completed') {
      toast({
        title: 'Request Completed',
        description: `Password reset marked as completed. Please share the new password with the student manually.`,
      });
    } else {
      toast({
        title: 'Request Rejected',
        description: 'The password reset request has been rejected.',
      });
    }

    setIsDialogOpen(false);
    setIsProcessing(false);
    fetchRequests();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Pending</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Completed</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse text-muted-foreground">Loading requests...</div>
      </div>
    );
  }

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Password Reset Requests</h1>
          <p className="text-muted-foreground">
            Manage student password reset requests
            {pendingCount > 0 && (
              <span className="ml-2 text-amber-600 font-medium">
                ({pendingCount} pending)
              </span>
            )}
          </p>
        </div>
        <Button variant="outline" onClick={fetchRequests} className="gap-2">
          <RefreshCcw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {requests.length === 0 ? (
        <div className="dashboard-card text-center py-12">
          <KeyRound className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Requests</h3>
          <p className="text-muted-foreground">No password reset requests at this time.</p>
        </div>
      ) : (
        <div className="dashboard-card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">
                      {request.profile?.full_name || 'Unknown'}
                    </TableCell>
                    <TableCell>
                      {request.email || request.mobile || 'N/A'}
                    </TableCell>
                    <TableCell>
                      {request.profile?.class || 'N/A'}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(request.status)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(request.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      {request.status === 'pending' ? (
                        <Button
                          size="sm"
                          onClick={() => openResolveDialog(request)}
                        >
                          Resolve
                        </Button>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          {request.resolved_at 
                            ? new Date(request.resolved_at).toLocaleDateString()
                            : '-'}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Resolve Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Resolve Password Reset</DialogTitle>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <p className="text-sm">
                  <strong>Student:</strong> {selectedRequest.profile?.full_name || 'Unknown'}
                </p>
                <p className="text-sm">
                  <strong>Class:</strong> {selectedRequest.profile?.class || 'N/A'}
                </p>
                <p className="text-sm">
                  <strong>Contact:</strong> {selectedRequest.email || selectedRequest.mobile}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password (for your reference)</Label>
                <Input
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password to share with student"
                />
                <p className="text-xs text-muted-foreground">
                  Note: You need to reset the password manually in your authentication system 
                  and share this password with the student.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="adminNotes">Admin Notes (optional)</Label>
                <Textarea
                  id="adminNotes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Any notes about this request..."
                  className="resize-none"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => handleResolve('rejected')}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <X className="w-4 h-4 mr-2" />
                      Reject
                    </>
                  )}
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => handleResolve('completed')}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Mark Complete
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

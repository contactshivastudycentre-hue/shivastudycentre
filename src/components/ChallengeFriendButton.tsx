import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Trophy, Share2, Copy, Check, MessageCircle, Send } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Props {
  testId?: string;
  attemptId?: string;
  score?: number | null;
  totalMarks?: number | null;
  testTitle?: string;
  rank?: number | null;
  variant?: 'primary' | 'compact';
}

const SITE_URL = 'https://shivastudycentre.org';

export default function ChallengeFriendButton({
  testId, attemptId, score, totalMarks, testTitle, rank, variant = 'primary',
}: Props) {
  const { user, profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const buildMessage = (link: string) => {
    const scorePart =
      score !== null && score !== undefined && totalMarks
        ? `I scored ${score}/${totalMarks}`
        : score !== null && score !== undefined
          ? `I scored ${score}`
          : `I just took a test`;
    const rankPart = rank ? ` (Rank #${rank})` : '';
    const titlePart = testTitle ? ` in "${testTitle}"` : '';
    return `${scorePart}${rankPart}${titlePart} on Shiva Study Center. Can you beat my score? Try it here: ${link}`;
  };

  const ensureShare = async (method: string): Promise<string> => {
    if (referralCode) {
      return `${SITE_URL}/?challenge=${referralCode}`;
    }
    setCreating(true);
    try {
      const { data, error } = await supabase
        .from('challenge_shares')
        .insert({
          student_id: user!.id,
          test_id: testId || null,
          attempt_id: attemptId || null,
          score: score ?? null,
          test_title: testTitle || null,
          challenger_name: profile?.full_name || null,
          share_method: method,
        })
        .select('referral_code')
        .single();
      if (error) throw error;
      setReferralCode(data.referral_code);
      return `${SITE_URL}/?challenge=${data.referral_code}`;
    } finally {
      setCreating(false);
    }
  };

  const handleOpen = async () => {
    setOpen(true);
    // Try native share immediately if available
    if (navigator.share) {
      try {
        const link = await ensureShare('native');
        await navigator.share({
          title: 'Beat my score on Shiva Study Center!',
          text: buildMessage(link),
          url: link,
        });
        setOpen(false);
        return;
      } catch (e: any) {
        if (e?.name !== 'AbortError') {
          // Fall through to manual share dialog
        }
      }
    }
  };

  const shareWhatsApp = async () => {
    const link = await ensureShare('whatsapp');
    const text = encodeURIComponent(buildMessage(link));
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener');
  };

  const shareTelegram = async () => {
    const link = await ensureShare('telegram');
    const text = encodeURIComponent(buildMessage(link));
    window.open(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${text}`, '_blank', 'noopener');
  };

  const shareSMS = async () => {
    const link = await ensureShare('sms');
    const text = encodeURIComponent(buildMessage(link));
    window.location.href = `sms:?body=${text}`;
  };

  const copyLink = async () => {
    const link = await ensureShare('copy');
    try {
      await navigator.clipboard.writeText(buildMessage(link));
      setCopied(true);
      toast({ title: 'Copied!', description: 'Challenge link copied to clipboard.' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'Copy failed', description: 'Please long-press and copy manually.', variant: 'destructive' });
    }
  };

  const buttonLabel =
    score !== null && score !== undefined
      ? `My Score: ${score}${totalMarks ? `/${totalMarks}` : ''}. Can you beat me?`
      : 'Challenge a Friend';

  return (
    <>
      {variant === 'compact' ? (
        <Button onClick={handleOpen} size="sm" variant="outline" className="gap-2">
          <Share2 className="w-4 h-4" />
          Challenge
        </Button>
      ) : (
        <Button
          onClick={handleOpen}
          size="lg"
          className="w-full h-14 text-base rounded-2xl bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 shadow-lg shadow-primary/20 gap-2 font-semibold"
        >
          <Trophy className="w-5 h-5" />
          {buttonLabel}
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" />
              Challenge a Friend
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground -mt-2">
            Share your score and invite friends to try Shiva Study Center.
          </p>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button
              onClick={shareWhatsApp}
              disabled={creating}
              variant="outline"
              className="h-16 flex-col gap-1 rounded-xl border-green-200 hover:bg-green-50 hover:border-green-300"
            >
              <MessageCircle className="w-5 h-5 text-green-600" />
              <span className="text-xs font-medium">WhatsApp</span>
            </Button>
            <Button
              onClick={shareTelegram}
              disabled={creating}
              variant="outline"
              className="h-16 flex-col gap-1 rounded-xl border-blue-200 hover:bg-blue-50 hover:border-blue-300"
            >
              <Send className="w-5 h-5 text-blue-600" />
              <span className="text-xs font-medium">Telegram</span>
            </Button>
            <Button
              onClick={shareSMS}
              disabled={creating}
              variant="outline"
              className="h-16 flex-col gap-1 rounded-xl"
            >
              <MessageCircle className="w-5 h-5" />
              <span className="text-xs font-medium">SMS</span>
            </Button>
            <Button
              onClick={copyLink}
              disabled={creating}
              variant="outline"
              className="h-16 flex-col gap-1 rounded-xl"
            >
              {copied ? <Check className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5" />}
              <span className="text-xs font-medium">{copied ? 'Copied!' : 'Copy Link'}</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

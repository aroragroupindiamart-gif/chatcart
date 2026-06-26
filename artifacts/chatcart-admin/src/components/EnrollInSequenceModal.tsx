import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, MessageCircle, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useWASequences, useEnrollInSequence } from '@/hooks/useAdminApi';
import { useToast } from '@/hooks/use-toast';

interface Props {
  open: boolean;
  onClose: () => void;
  sellerIds: number[];
  sellerLabel?: string;
}

export function EnrollInSequenceModal({ open, onClose, sellerIds, sellerLabel }: Props) {
  const { toast } = useToast();
  const [selectedSeqId, setSelectedSeqId] = useState<number | null>(null);
  const { data: sequences, isLoading: seqLoading } = useWASequences();
  const enrollMut = useEnrollInSequence();

  const handleClose = () => {
    setSelectedSeqId(null);
    onClose();
  };

  const handleEnroll = async () => {
    if (!selectedSeqId) return;
    try {
      const result = await enrollMut.mutateAsync({ sequenceId: selectedSeqId, sellerIds });
      const added = result.added;
      const skipped = result.skipped;
      toast({
        title: `Enrolled ${added} seller${added !== 1 ? 's' : ''}`,
        description: skipped > 0 ? `${skipped} already enrolled — skipped.` : undefined,
      });
      handleClose();
    } catch (e: any) {
      let msg = e.message ?? 'Enrollment failed';
      try { msg = JSON.parse(msg).error ?? msg; } catch {}
      toast({ title: 'Enrollment failed', description: msg, variant: 'destructive' });
    }
  };

  const activeSequences = sequences?.filter(s => s.isActive) ?? [];

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" />
            Enroll in WA Sequence
          </DialogTitle>
          {sellerLabel && (
            <p className="text-sm text-muted-foreground pt-1">{sellerLabel}</p>
          )}
        </DialogHeader>

        <div className="py-2 space-y-3">
          {seqLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />Loading sequences…
            </div>
          ) : activeSequences.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-muted-foreground gap-2">
              <AlertTriangle className="w-6 h-6 opacity-40" />
              <p className="text-sm">No active sequences yet.</p>
              <p className="text-xs">Create one in the WA Marketing tab first.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {activeSequences.map((seq) => (
                <button
                  key={seq.id}
                  type="button"
                  onClick={() => setSelectedSeqId(seq.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                    selectedSeqId === seq.id
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-border hover:border-primary/50 hover:bg-muted/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm truncate">{seq.name}</div>
                      {seq.description && (
                        <div className="text-xs text-muted-foreground mt-0.5 truncate">{seq.description}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge variant="outline" className="text-xs">{seq.stepCount} steps</Badge>
                      {selectedSeqId === seq.id && (
                        <CheckCircle2 className="w-4 h-4 text-primary" />
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button
            onClick={handleEnroll}
            disabled={!selectedSeqId || enrollMut.isPending}
          >
            {enrollMut.isPending
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Enrolling…</>
              : <>Enroll {sellerIds.length > 1 ? `${sellerIds.length} sellers` : 'seller'}</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

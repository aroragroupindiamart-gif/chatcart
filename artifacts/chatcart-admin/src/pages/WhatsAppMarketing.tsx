import React, { useEffect, useRef, useState } from 'react';
import { formatOffset } from '@/lib/waOffset';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminFetch } from '@/lib/adminFetch';
import { Layout } from '@/components/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Wifi, WifiOff, Loader2, QrCode, MessageCircle, Users, Activity,
  Plus, Trash2, Play, Pause, RefreshCw, CheckCircle2, XCircle,
  AlertTriangle, Clock, MessageSquare, TrendingUp, PhoneIncoming,
  ChevronDown, ChevronRight, Flame, Link2,
  ArrowUp, ArrowDown, Upload, FileImage, FileVideo, FileText, X, Pencil
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';

// ── Types ──────────────────────────────────────────────────────────────────────

interface WAState {
  status: 'disconnected' | 'connecting' | 'connected';
  qr: string | null;
  phone: string | null;
  connectedAt: string | null;
  settings: WASettings;
}

interface WASettings {
  id: number;
  dailyLimit: number;
  warmupDailyLimit: number;
  warmupDays: number;
  replyRateThreshold: number;
  isPaused: boolean;
  connectedAt: string | null;
  autoEnrollSequenceId: number | null;
}

interface Sequence {
  id: number;
  name: string;
  description: string | null;
  steps: SequenceStep[];
  leadCount: number;
  createdAt: string;
}

interface SequenceStep {
  id?: number;
  hourOffset: number;
  message: string;
  mediaUrl?: string | null;
  mediaType?: 'image' | 'video' | 'document' | null;
  mediaFilename?: string | null;
}

interface CampaignLead {
  id: number;
  sequenceId: number;
  sequenceName: string;
  sellerId: number | null;
  inboundLeadId: number | null;
  storeName: string | null;
  inboundDisplayName: string | null;
  inboundPhone: string | null;
  phone: string | null;
  currentHourOffset: number;
  nextSendAt: string | null;
  lastSentAt: string | null;
  repliedAt: string | null;
  status: 'active' | 'paused_no_reply' | 'paused_manual' | 'completed' | 'removed' | 'send_failed'; // paused_no_reply is legacy — no longer set by scheduler
  sendFailureCount: number;
  createdAt: string;
}

interface PendingSeller {
  id: number;
  storeName: string;
  phone: string;
  subdomain: string;
  createdAt: string;
}

interface InboundLead {
  id: number;
  phone: string;
  displayName: string | null;
  firstMessage: string | null;
  lastMessage: string | null;
  lastMessageAt: string;
  messageCount: number;
  isWarm: boolean;
  matchedSellerId: number | null;
  matchedSellerName: string | null;
  matchedSellerPlan: string | null;
  createdAt: string;
}

interface InboundMessage {
  id: number;
  inboundLeadId: number;
  message: string;
  receivedAt: string;
}

interface HealthMetrics {
  sentToday: number;
  sentThisWeek: number;
  failedToday: number;
  replyRate: number | null;
  activeLeads: number;
  pausedLeads: number;
  completedLeads: number;
  sendFailedLeads: number;
  inboundTotal: number;
  dailyLimit: number;
  warmupDailyLimit: number;
  warmupDays: number;
  isPaused: boolean;
  replyRateThreshold: number;
  connectedAt: string | null;
}

interface SendLog {
  id: number;
  toPhone: string;
  message: string;
  status: 'sent' | 'failed';
  errorMessage: string | null;
  sentAt: string;
  storeName: string | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function fmtRelative(d: string | null) {
  if (!d) return '—';
  const ms = Date.now() - new Date(d).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return fmtDate(d);
}

function StatusBadge({ status }: { status: CampaignLead['status'] }) {
  const map: Record<string, { label: string; color: string }> = {
    active: { label: 'Active', color: 'bg-green-100 text-green-800' },
    paused_no_reply: { label: 'Paused (no reply)', color: 'bg-yellow-100 text-yellow-800' },
    paused_manual: { label: 'Paused', color: 'bg-orange-100 text-orange-800' },
    completed: { label: 'Completed', color: 'bg-blue-100 text-blue-800' },
    removed: { label: 'Removed', color: 'bg-gray-100 text-gray-600' },
    send_failed: { label: 'Send Failed', color: 'bg-red-100 text-red-800' },
  };
  const { label, color } = map[status] ?? map.active;
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${color}`}>{label}</span>;
}

// ── Connection Tab ─────────────────────────────────────────────────────────────

function ConnectionTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [waState, setWaState] = useState<WAState | null>(null);
  const [settings, setSettings] = useState<WASettings | null>(null);
  const esRef = useRef<EventSource | null>(null);

  const { data: initialStatus } = useQuery<WAState>({
    queryKey: ['wa-status'],
    queryFn: () => adminFetch('/api/admin/wa/status'),
    refetchInterval: false,
  });

  useEffect(() => {
    if (initialStatus) {
      setWaState(initialStatus);
      setSettings(initialStatus.settings);
    }
  }, [initialStatus]);

  useEffect(() => {
    const token = localStorage.getItem('chatcart_admin_token') ?? '';
    const es = new EventSource(`/api/admin/wa/stream?token=${encodeURIComponent(token)}`);
    esRef.current = es;

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'state') {
          setWaState((prev) => ({ ...(prev ?? {} as any), ...data }));
        } else if (data.type === 'qr') {
          setWaState((prev) => prev ? { ...prev, qr: data.qr } : null);
        } else if (data.type === 'inbound_lead') {
          qc.invalidateQueries({ queryKey: ['wa-inbound-leads'] });
        }
      } catch {}
    };

    es.onerror = () => {};

    return () => { es.close(); };
  }, [qc]);

  const connectMut = useMutation({
    mutationFn: () => adminFetch('/api/admin/wa/connect', { method: 'POST' }),
    onSuccess: () => toast({ title: 'Connecting…', description: 'Scan the QR code with your WhatsApp' }),
    onError: () => toast({ title: 'Error', description: 'Could not start connection', variant: 'destructive' }),
  });

  const disconnectMut = useMutation({
    mutationFn: () => adminFetch('/api/admin/wa/disconnect', { method: 'POST' }),
    onSuccess: () => {
      toast({ title: 'Disconnected', description: 'WhatsApp session ended and session data cleared' });
      setWaState((prev) => prev ? { ...prev, status: 'disconnected', qr: null, phone: null } : null);
    },
    onError: () => toast({ title: 'Error', description: 'Could not disconnect', variant: 'destructive' }),
  });

  const saveMut = useMutation({
    mutationFn: (data: Partial<WASettings>) => adminFetch('/api/admin/wa/settings', { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: (updated: WASettings) => { setSettings(updated); toast({ title: 'Settings saved' }); },
    onError: () => toast({ title: 'Error', description: 'Could not save settings', variant: 'destructive' }),
  });

  const purgeFilesMut = useMutation({
    mutationFn: () => adminFetch<{ ok: boolean; deleted: number }>('/api/admin/wa/purge-stale-files', { method: 'POST' }),
    onSuccess: (data) => toast({ title: 'Done', description: `Purged ${data.deleted} stale file(s)` }),
    onError: () => toast({ title: 'Error', description: 'Failed to purge files', variant: 'destructive' }),
  });

  const status = waState?.status ?? 'disconnected';
  const qr = waState?.qr;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {status === 'connected' ? <Wifi className="w-5 h-5 text-green-600" /> :
              status === 'connecting' ? <Loader2 className="w-5 h-5 animate-spin text-yellow-600" /> :
              <WifiOff className="w-5 h-5 text-muted-foreground" />}
            Connection Status
          </CardTitle>
          <CardDescription>
            {status === 'connected' && `Connected as ${waState?.phone ?? 'unknown'}`}
            {status === 'connecting' && 'Waiting for QR scan…'}
            {status === 'disconnected' && 'Not connected. Click Connect to generate a QR code.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'connected' && (
            <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
              <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
              <div>
                <div className="font-medium text-green-800">WhatsApp Connected</div>
                <div className="text-sm text-green-700">Phone: +{waState?.phone}</div>
                {waState?.connectedAt && <div className="text-xs text-green-600">Since {fmtDate(waState.connectedAt)}</div>}
              </div>
            </div>
          )}
          {status === 'connecting' && qr && (
            <div className="flex flex-col items-center gap-4 p-6 bg-muted rounded-lg">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <QrCode className="w-4 h-4" />
                Scan with WhatsApp → Settings → Linked Devices → Link a Device
              </div>
              <img src={qr} alt="WhatsApp QR Code" className="w-64 h-64 rounded-lg border-4 border-white shadow-md" />
              <p className="text-xs text-muted-foreground">QR refreshes automatically. Do not close this window.</p>
            </div>
          )}
          {status === 'connecting' && !qr && (
            <div className="flex items-center gap-3 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <Loader2 className="w-5 h-5 animate-spin text-yellow-600" />
              <span className="text-yellow-800">Initialising connection…</span>
            </div>
          )}
          <div className="flex gap-3">
            {status === 'disconnected' && (
              <Button onClick={() => connectMut.mutate()} disabled={connectMut.isPending}>
                {connectMut.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wifi className="w-4 h-4 mr-2" />}
                Connect WhatsApp
              </Button>
            )}
            {status !== 'disconnected' && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={disconnectMut.isPending}>
                    {disconnectMut.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <WifiOff className="w-4 h-4 mr-2" />}
                    Disconnect & Clear Session
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Disconnect WhatsApp?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will log out the linked WhatsApp number and delete the stored session. You'll need to scan a new QR code to reconnect.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => disconnectMut.mutate()} className="bg-destructive text-destructive-foreground">Disconnect</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </CardContent>
      </Card>

      {settings && (
        <Card>
          <CardHeader>
            <CardTitle>Sending Limits & Safety Settings</CardTitle>
            <CardDescription>All limits are enforced server-side. Changes take effect immediately.</CardDescription>
          </CardHeader>
          <CardContent>
            <SettingsForm settings={settings} onSave={(d) => saveMut.mutate(d)} saving={saveMut.isPending} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Maintenance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Remove stale Baileys key files from object storage. Only{' '}
              <code className="text-xs bg-muted px-1 rounded">creds.json</code> is kept.
            </p>
            <Button variant="outline" size="sm" onClick={() => purgeFilesMut.mutate()} disabled={purgeFilesMut.isPending}>
              {purgeFilesMut.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Purge stale session files
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SettingsForm({ settings, onSave, saving }: { settings: WASettings; onSave: (d: Partial<WASettings>) => void; saving: boolean }) {
  const [form, setForm] = useState(settings);
  useEffect(() => setForm(settings), [settings]);
  const changed = JSON.stringify(form) !== JSON.stringify(settings);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>Daily Send Limit (after warm-up)</Label>
          <Input type="number" min={1} max={200} value={form.dailyLimit} onChange={(e) => setForm((f) => ({ ...f, dailyLimit: +e.target.value }))} />
          <p className="text-xs text-muted-foreground">Hard cap on outbound messages per day after warm-up period.</p>
        </div>
        <div className="space-y-2">
          <Label>Warm-up Daily Limit</Label>
          <Input type="number" min={1} max={50} value={form.warmupDailyLimit} onChange={(e) => setForm((f) => ({ ...f, warmupDailyLimit: +e.target.value }))} />
          <p className="text-xs text-muted-foreground">Cap during the first {form.warmupDays} days after connecting.</p>
        </div>
        <div className="space-y-2">
          <Label>Warm-up Period (days)</Label>
          <Input type="number" min={1} max={90} value={form.warmupDays} onChange={(e) => setForm((f) => ({ ...f, warmupDays: +e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>Reply Rate Warning Threshold (%)</Label>
          <Input type="number" min={0} max={100} value={form.replyRateThreshold} onChange={(e) => setForm((f) => ({ ...f, replyRateThreshold: +e.target.value }))} />
        </div>
      </div>
      {changed && (
        <Button onClick={() => onSave({ dailyLimit: form.dailyLimit, warmupDailyLimit: form.warmupDailyLimit, warmupDays: form.warmupDays, replyRateThreshold: form.replyRateThreshold })} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}Save Settings
        </Button>
      )}
    </div>
  );
}

// ── Sequences Tab ──────────────────────────────────────────────────────────────

function SequencesTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Sequence | null>(null);

  const { data: sequences = [], isLoading } = useQuery<Sequence[]>({
    queryKey: ['wa-sequences'],
    queryFn: () => adminFetch('/api/admin/wa/sequences'),
  });

  const { data: waStatus } = useQuery<WAState>({
    queryKey: ['wa-status'],
    queryFn: () => adminFetch('/api/admin/wa/status'),
  });
  const autoEnrollSequenceId = waStatus?.settings?.autoEnrollSequenceId ?? null;

  const deleteMut = useMutation({
    mutationFn: (id: number) => adminFetch(`/api/admin/wa/sequences/${id}`, { method: 'DELETE' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['wa-sequences'] }); toast({ title: 'Sequence deleted' }); },
    onError: () => toast({ title: 'Error', description: 'Could not delete sequence', variant: 'destructive' }),
  });

  const autoEnrollMut = useMutation({
    mutationFn: (sequenceId: number | null) =>
      adminFetch('/api/admin/wa/settings', { method: 'PATCH', body: JSON.stringify({ autoEnrollSequenceId: sequenceId }) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['wa-status'] }); toast({ title: 'Auto-enroll updated' }); },
    onError: () => toast({ title: 'Error', description: 'Failed to update auto-enroll', variant: 'destructive' }),
  });

  if (isLoading) return <div className="flex items-center gap-2 py-8 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>;

  return (
    <div className="space-y-6">
      {/* Auto-enroll setting */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Auto-Enroll Inbound Leads</CardTitle>
          <CardDescription>Automatically enroll every new WhatsApp contact into a drip sequence the moment they message you.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Switch
              checked={autoEnrollSequenceId !== null}
              onCheckedChange={(on) => autoEnrollMut.mutate(on ? (sequences[0]?.id ?? null) : null)}
              disabled={autoEnrollMut.isPending || sequences.length === 0}
            />
            {autoEnrollSequenceId !== null && sequences.length > 0 && (
              <select
                className="h-8 text-sm border rounded-md px-2 bg-background"
                value={autoEnrollSequenceId ?? ''}
                onChange={(e) => autoEnrollMut.mutate(Number(e.target.value))}
                disabled={autoEnrollMut.isPending}
              >
                {sequences.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            )}
            {sequences.length === 0 && (
              <span className="text-xs text-muted-foreground">Create a sequence first to enable auto-enroll.</span>
            )}
            {autoEnrollSequenceId !== null && (
              <span className="text-xs text-muted-foreground">New contacts → enrolled instantly</span>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Drip Sequences</h3>
          <p className="text-sm text-muted-foreground">Create multi-day message sequences. Use {'{{name}}'} and {'{{storeName}}'} as template variables.</p>
        </div>
        <Dialog open={creating} onOpenChange={setCreating}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />New Sequence</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Create Sequence</DialogTitle></DialogHeader>
            <CreateSequenceForm onSuccess={() => { setCreating(false); qc.invalidateQueries({ queryKey: ['wa-sequences'] }); }} />
          </DialogContent>
        </Dialog>
      </div>

      {sequences.length === 0 && (
        <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
          <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No sequences yet. Create your first drip sequence.</p>
        </div>
      )}

      <div className="space-y-4">
        {sequences.map((seq) => (
          <Card key={seq.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">{seq.name}</CardTitle>
                  {seq.description && <CardDescription>{seq.description}</CardDescription>}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{seq.steps.length} step{seq.steps.length !== 1 ? 's' : ''}</Badge>
                  <Badge variant="secondary">{seq.leadCount} lead{seq.leadCount !== 1 ? 's' : ''}</Badge>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(seq)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive h-8 w-8"><Trash2 className="w-4 h-4" /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete "{seq.name}"?</AlertDialogTitle>
                        <AlertDialogDescription>This will also remove all leads enrolled in this sequence.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteMut.mutate(seq.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {seq.steps.map((step) => (
                  <div key={step.id ?? step.hourOffset} className="flex gap-3 text-sm">
                    <span className="shrink-0 w-14 text-muted-foreground font-medium pt-0.5">{formatOffset(step.hourOffset)}</span>
                    <div className="flex-1 min-w-0">
                      <span className="text-foreground/80 whitespace-pre-wrap leading-relaxed">{step.message}</span>
                      {step.mediaType && (
                        <div className="mt-1">
                          <Badge variant="outline" className="text-xs gap-1">
                            {step.mediaType === 'image' && <FileImage className="w-3 h-3" />}
                            {step.mediaType === 'video' && <FileVideo className="w-3 h-3" />}
                            {step.mediaType === 'document' && <FileText className="w-3 h-3" />}
                            {step.mediaFilename ?? step.mediaType}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit sequence dialog */}
      <Dialog open={editing !== null} onOpenChange={(o) => { if (!o) setEditing(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Sequence</DialogTitle></DialogHeader>
          {editing && (
            <EditSequenceForm
              sequence={editing}
              onSuccess={() => { setEditing(null); qc.invalidateQueries({ queryKey: ['wa-sequences'] }); }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface StepDraft {
  hourOffset: number;
  message: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'document';
  mediaFilename?: string;
  _uploading?: boolean;
  _uploadError?: string;
  _sizeWarning?: string;
  _unit: 'hours' | 'days';
}

function MediaTypeIcon({ type }: { type: string }) {
  if (type === 'image') return <FileImage className="w-3.5 h-3.5" />;
  if (type === 'video') return <FileVideo className="w-3.5 h-3.5" />;
  return <FileText className="w-3.5 h-3.5" />;
}

function CreateSequenceForm({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [steps, setSteps] = useState<StepDraft[]>([{ hourOffset: 0, message: '', _unit: 'hours' }]);
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const createMut = useMutation({
    mutationFn: (data: { name: string; description?: string; steps: SequenceStep[] }) =>
      adminFetch('/api/admin/wa/sequences', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => { toast({ title: 'Sequence created' }); onSuccess(); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateStep = (idx: number, patch: Partial<StepDraft>) =>
    setSteps((s) => s.map((st, i) => i === idx ? { ...st, ...patch } : st));

  const addStep = () => {
    const lastOffset = steps[steps.length - 1]?.hourOffset ?? 0;
    const nextOffset = lastOffset + 6;
    // Enforce invariant: any step >48h must be in Days mode
    const nextUnit: 'hours' | 'days' = nextOffset > 48 ? 'days' : 'hours';
    setSteps((s) => [...s, { hourOffset: nextOffset, message: '', _unit: nextUnit }]);
  };

  // Enforces invariant: hourOffset > 48 always displays in Days, ≤ 48 uses stored preference
  const effectiveUnit = (step: StepDraft): 'hours' | 'days' =>
    step.hourOffset > 48 ? 'days' : step._unit;

  const removeStep = (idx: number) =>
    setSteps((s) => s.filter((_, i) => i !== idx));

  const moveStep = (idx: number, dir: -1 | 1) => {
    const next = idx + dir;
    if (next < 0 || next >= steps.length) return;
    setSteps((s) => {
      const arr = [...s];
      // Swap hourOffset + _unit together so display stays consistent
      const tmpOffset = arr[idx].hourOffset;
      const tmpUnit = arr[idx]._unit;
      arr[idx] = { ...arr[idx], hourOffset: arr[next].hourOffset, _unit: arr[next]._unit };
      arr[next] = { ...arr[next], hourOffset: tmpOffset, _unit: tmpUnit };
      return [...arr].sort((a, b) => a.hourOffset - b.hourOffset);
    });
  };

  const handleFileSelect = async (idx: number, file: File) => {
    const token = localStorage.getItem('chatcart_admin_token') ?? '';

    // Clear previous media state
    updateStep(idx, { _uploading: true, _uploadError: undefined, _sizeWarning: undefined, mediaUrl: undefined, mediaType: undefined, mediaFilename: undefined });

    try {
      // Request presigned URL + get server-determined mediaType and any size warning
      const res = await fetch('/api/admin/wa/media/request-upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'Upload failed');
      }
      const { uploadURL, objectPath, mediaType, sizeWarning } = await res.json();

      // PUT file directly to GCS presigned URL
      const putRes = await fetch(uploadURL, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!putRes.ok) throw new Error('Failed to upload to storage');

      updateStep(idx, {
        _uploading: false,
        _sizeWarning: sizeWarning ?? undefined,
        mediaUrl: objectPath,
        mediaType,
        mediaFilename: file.name,
      });
    } catch (e: any) {
      updateStep(idx, { _uploading: false, _uploadError: e.message ?? 'Upload failed', mediaUrl: undefined, mediaType: undefined, mediaFilename: undefined });
    }
  };

  const clearMedia = (idx: number) => {
    updateStep(idx, { mediaUrl: undefined, mediaType: undefined, mediaFilename: undefined, _sizeWarning: undefined, _uploadError: undefined });
    if (fileInputRefs.current[idx]) fileInputRefs.current[idx]!.value = '';
  };

  // Validate ascending, no duplicates
  const offsetErrors = steps.map((s, i) => {
    if (i === 0) return null;
    return s.hourOffset <= steps[i - 1].hourOffset ? `Hour offset must be greater than the previous step (${steps[i - 1].hourOffset}h)` : null;
  });
  const hasOffsetError = offsetErrors.some(Boolean);

  const submit = () => {
    if (!name.trim()) { toast({ title: 'Sequence name is required', variant: 'destructive' }); return; }
    if (steps.some((s) => !s.message.trim())) { toast({ title: 'All steps need message text', variant: 'destructive' }); return; }
    if (hasOffsetError) { toast({ title: 'Fix hour offset order before saving', variant: 'destructive' }); return; }
    if (steps.some((s) => s._uploading)) { toast({ title: 'Wait for uploads to finish', variant: 'destructive' }); return; }
    createMut.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
      steps: steps.map((s) => ({
        hourOffset: s.hourOffset,
        message: s.message,
        mediaUrl: s.mediaUrl ?? null,
        mediaType: s.mediaType ?? null,
        mediaFilename: s.mediaFilename ?? null,
      })),
    });
  };

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>Sequence Name *</Label>
        <Input placeholder="e.g. 7-Day Pending Seller Nudge" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Description (optional)</Label>
        <Input placeholder="Internal note about this sequence" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Message Steps</Label>
          <span className="text-xs text-muted-foreground">Variables: {'{{name}}'}, {'{{storeName}}'}</span>
        </div>

        {steps.map((step, idx) => (
          <div key={idx} className={`border rounded-lg p-4 space-y-3 ${offsetErrors[idx] ? 'border-destructive bg-destructive/5' : 'bg-muted/30'}`}>
            {/* Step header: day offset + reorder + remove */}
            <div className="flex items-center gap-2">
              <div className="flex flex-col gap-0.5">
                <button
                  type="button"
                  disabled={idx === 0}
                  onClick={() => moveStep(idx, -1)}
                  className="p-0.5 rounded text-muted-foreground hover:text-foreground disabled:opacity-25"
                >
                  <ArrowUp className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  disabled={idx === steps.length - 1}
                  onClick={() => moveStep(idx, 1)}
                  className="p-0.5 rounded text-muted-foreground hover:text-foreground disabled:opacity-25"
                >
                  <ArrowDown className="w-3 h-3" />
                </button>
              </div>
              {(() => {
                const unit = effectiveUnit(step);
                return (
                  <div className="flex items-center gap-1.5 flex-1 flex-wrap">
                    <Label className="text-sm font-semibold shrink-0">Send after</Label>
                    <Input
                      type="number"
                      min={unit === 'days' ? 1 : 0}
                      max={unit === 'days' ? undefined : 48}
                      className="w-20 h-8 text-sm"
                      value={unit === 'days' ? Math.floor(step.hourOffset / 24) || 1 : step.hourOffset}
                      onChange={(e) => {
                        const raw = parseInt(e.target.value) || 0;
                        if (unit === 'days') {
                          updateStep(idx, { hourOffset: Math.max(1, raw) * 24 });
                        } else {
                          updateStep(idx, { hourOffset: Math.min(48, Math.max(0, raw)) });
                        }
                      }}
                    />
                    <select
                      className="h-8 text-sm border rounded-md px-2 bg-background"
                      value={unit}
                      onChange={(e) => {
                        const newUnit = e.target.value as 'hours' | 'days';
                        if (newUnit === 'days') {
                          const days = Math.max(1, Math.floor(step.hourOffset / 24));
                          updateStep(idx, { _unit: 'days', hourOffset: days * 24 });
                        } else {
                          const hours = Math.min(48, step.hourOffset);
                          updateStep(idx, { _unit: 'hours', hourOffset: hours });
                        }
                      }}
                    >
                      <option value="hours">Hours</option>
                      <option value="days">Days</option>
                    </select>
                    {unit === 'days' && (
                      <span className="text-xs text-muted-foreground shrink-0">= {step.hourOffset}h total</span>
                    )}
                    {unit === 'hours' && step.hourOffset === 0 && (
                      <span className="text-xs text-muted-foreground shrink-0">immediate</span>
                    )}
                    {offsetErrors[idx] && (
                      <span className="text-xs text-destructive">{offsetErrors[idx]}</span>
                    )}
                  </div>
                );
              })()}
              {steps.length > 1 && (
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={() => removeStep(idx)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>

            {/* Message textarea — becomes caption when media is attached */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                {step.mediaUrl ? 'Caption (sent with the media)' : 'Message text'}
              </Label>
              <Textarea
                rows={3}
                placeholder={step.mediaUrl ? `Caption for ${step.hourOffset}h step — use {{name}}, {{storeName}}…` : `Hi {{name}}, message sent at +${step.hourOffset}h…`}
                value={step.message}
                onChange={(e) => updateStep(idx, { message: e.target.value })}
                className="font-mono text-sm"
              />
            </div>

            {/* Media attachment */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Media attachment (optional) — images up to 5 MB · videos up to 100 MB · PDFs/docs up to 100 MB
              </Label>

              {step.mediaUrl ? (
                <div className="flex items-center gap-2 p-2 bg-background border rounded-md text-sm">
                  <MediaTypeIcon type={step.mediaType ?? 'document'} />
                  <span className="flex-1 truncate text-foreground font-medium">{step.mediaFilename}</span>
                  <Badge variant="outline" className="text-xs shrink-0">{step.mediaType}</Badge>
                  <button type="button" onClick={() => clearMedia(idx)} className="text-muted-foreground hover:text-destructive">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div>
                  <input
                    ref={(el) => { fileInputRefs.current[idx] = el; }}
                    type="file"
                    accept="image/*,video/*,.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(idx, f); }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    disabled={step._uploading}
                    onClick={() => fileInputRefs.current[idx]?.click()}
                  >
                    {step._uploading
                      ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Uploading…</>
                      : <><Upload className="w-3.5 h-3.5 mr-1.5" />Attach media</>}
                  </Button>
                </div>
              )}

              {step._sizeWarning && (
                <div className="flex items-start gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  {step._sizeWarning}
                </div>
              )}
              {step._uploadError && (
                <p className="text-xs text-destructive">{step._uploadError}</p>
              )}
            </div>
          </div>
        ))}

        <Button variant="outline" onClick={addStep} className="w-full">
          <Plus className="w-4 h-4 mr-2" />Add Step
        </Button>
      </div>

      <Button onClick={submit} disabled={createMut.isPending || hasOffsetError} className="w-full">
        {createMut.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
        Create Sequence
      </Button>
    </div>
  );
}

function EditSequenceForm({ sequence, onSuccess }: { sequence: Sequence; onSuccess: () => void }) {
  const { toast } = useToast();
  const toStepDraft = (s: SequenceStep): StepDraft => ({
    hourOffset: s.hourOffset,
    message: s.message,
    mediaUrl: s.mediaUrl ?? undefined,
    mediaType: (s.mediaType as StepDraft['mediaType']) ?? undefined,
    mediaFilename: s.mediaFilename ?? undefined,
    _unit: s.hourOffset > 48 ? 'days' : 'hours',
  });

  const [name, setName] = useState(sequence.name);
  const [description, setDescription] = useState(sequence.description ?? '');
  const [steps, setSteps] = useState<StepDraft[]>(sequence.steps.map(toStepDraft));
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const editMut = useMutation({
    mutationFn: (data: { name: string; description?: string; steps: SequenceStep[] }) =>
      adminFetch(`/api/admin/wa/sequences/${sequence.id}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => { toast({ title: 'Sequence saved' }); onSuccess(); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateStep = (idx: number, patch: Partial<StepDraft>) =>
    setSteps((s) => s.map((st, i) => i === idx ? { ...st, ...patch } : st));
  const addStep = () => {
    const lastOffset = steps[steps.length - 1]?.hourOffset ?? 0;
    const nextOffset = lastOffset + 6;
    setSteps((s) => [...s, { hourOffset: nextOffset, message: '', _unit: nextOffset > 48 ? 'days' : 'hours' }]);
  };
  const removeStep = (idx: number) => setSteps((s) => s.filter((_, i) => i !== idx));
  const moveStep = (idx: number, dir: -1 | 1) => {
    const next = idx + dir;
    if (next < 0 || next >= steps.length) return;
    setSteps((s) => {
      const arr = [...s];
      const tmpOffset = arr[idx].hourOffset; const tmpUnit = arr[idx]._unit;
      arr[idx] = { ...arr[idx], hourOffset: arr[next].hourOffset, _unit: arr[next]._unit };
      arr[next] = { ...arr[next], hourOffset: tmpOffset, _unit: tmpUnit };
      return [...arr].sort((a, b) => a.hourOffset - b.hourOffset);
    });
  };
  const effectiveUnit = (step: StepDraft): 'hours' | 'days' => step.hourOffset > 48 ? 'days' : step._unit;
  const clearMedia = (idx: number) => {
    updateStep(idx, { mediaUrl: undefined, mediaType: undefined, mediaFilename: undefined, _sizeWarning: undefined, _uploadError: undefined });
    if (fileInputRefs.current[idx]) fileInputRefs.current[idx]!.value = '';
  };
  const handleFileSelect = async (idx: number, file: File) => {
    const token = localStorage.getItem('chatcart_admin_token') ?? '';
    updateStep(idx, { _uploading: true, _uploadError: undefined, _sizeWarning: undefined, mediaUrl: undefined, mediaType: undefined, mediaFilename: undefined });
    try {
      const res = await fetch('/api/admin/wa/media/request-upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error ?? 'Upload failed'); }
      const { uploadURL, objectPath, mediaType, sizeWarning } = await res.json();
      const putRes = await fetch(uploadURL, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
      if (!putRes.ok) throw new Error('Failed to upload to storage');
      updateStep(idx, { _uploading: false, _sizeWarning: sizeWarning ?? undefined, mediaUrl: objectPath, mediaType, mediaFilename: file.name });
    } catch (e: any) {
      updateStep(idx, { _uploading: false, _uploadError: e.message ?? 'Upload failed', mediaUrl: undefined, mediaType: undefined, mediaFilename: undefined });
    }
  };

  const offsetErrors = steps.map((s, i) => i === 0 ? null : s.hourOffset <= steps[i - 1].hourOffset ? `Must be > ${steps[i - 1].hourOffset}h` : null);
  const hasOffsetError = offsetErrors.some(Boolean);

  const submit = () => {
    if (!name.trim()) { toast({ title: 'Name required', variant: 'destructive' }); return; }
    if (steps.some((s) => !s.message.trim())) { toast({ title: 'All steps need message text', variant: 'destructive' }); return; }
    if (hasOffsetError) { toast({ title: 'Fix hour offset order', variant: 'destructive' }); return; }
    if (steps.some((s) => s._uploading)) { toast({ title: 'Wait for uploads to finish', variant: 'destructive' }); return; }
    editMut.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
      steps: steps.map((s) => ({ hourOffset: s.hourOffset, message: s.message, mediaUrl: s.mediaUrl ?? null, mediaType: s.mediaType ?? null, mediaFilename: s.mediaFilename ?? null })),
    });
  };

  return (
    <div className="space-y-5">
      <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-700 flex gap-2">
        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        Editing steps replaces all existing steps. Active leads continue from their current position using the new step content.
      </div>
      <div className="space-y-2">
        <Label>Sequence Name *</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Description (optional)</Label>
        <Input value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Message Steps</Label>
          <span className="text-xs text-muted-foreground">Variables: {'{{name}}'}, {'{{storeName}}'}</span>
        </div>
        {steps.map((step, idx) => (
          <div key={idx} className={`border rounded-lg p-4 space-y-3 ${offsetErrors[idx] ? 'border-destructive bg-destructive/5' : 'bg-muted/30'}`}>
            <div className="flex items-center gap-2">
              <div className="flex flex-col gap-0.5">
                <button type="button" disabled={idx === 0} onClick={() => moveStep(idx, -1)} className="p-0.5 rounded text-muted-foreground hover:text-foreground disabled:opacity-25"><ArrowUp className="w-3 h-3" /></button>
                <button type="button" disabled={idx === steps.length - 1} onClick={() => moveStep(idx, 1)} className="p-0.5 rounded text-muted-foreground hover:text-foreground disabled:opacity-25"><ArrowDown className="w-3 h-3" /></button>
              </div>
              {(() => {
                const unit = effectiveUnit(step);
                return (
                  <div className="flex items-center gap-1.5 flex-1 flex-wrap">
                    <Label className="text-sm font-semibold shrink-0">Send after</Label>
                    <Input type="number" min={unit === 'days' ? 1 : 0} max={unit === 'days' ? undefined : 48} className="w-20 h-8 text-sm"
                      value={unit === 'days' ? Math.floor(step.hourOffset / 24) || 1 : step.hourOffset}
                      onChange={(e) => { const raw = parseInt(e.target.value) || 0; updateStep(idx, { hourOffset: unit === 'days' ? Math.max(1, raw) * 24 : Math.min(48, Math.max(0, raw)) }); }} />
                    <select className="h-8 text-sm border rounded-md px-2 bg-background" value={unit}
                      onChange={(e) => { const u = e.target.value as 'hours' | 'days'; updateStep(idx, u === 'days' ? { _unit: 'days', hourOffset: Math.max(1, Math.floor(step.hourOffset / 24)) * 24 } : { _unit: 'hours', hourOffset: Math.min(48, step.hourOffset) }); }}>
                      <option value="hours">Hours</option>
                      <option value="days">Days</option>
                    </select>
                    {offsetErrors[idx] && <span className="text-xs text-destructive">{offsetErrors[idx]}</span>}
                  </div>
                );
              })()}
              {steps.length > 1 && <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={() => removeStep(idx)}><Trash2 className="w-3.5 h-3.5" /></Button>}
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{step.mediaUrl ? 'Caption' : 'Message text'}</Label>
              <Textarea rows={3} value={step.message} onChange={(e) => updateStep(idx, { message: e.target.value })} className="font-mono text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Media attachment (optional)</Label>
              {step.mediaUrl ? (
                <div className="flex items-center gap-2 p-2 bg-background border rounded-md text-sm">
                  <MediaTypeIcon type={step.mediaType ?? 'document'} />
                  <span className="flex-1 truncate font-medium">{step.mediaFilename}</span>
                  <Badge variant="outline" className="text-xs">{step.mediaType}</Badge>
                  <button type="button" onClick={() => clearMedia(idx)} className="text-muted-foreground hover:text-destructive"><X className="w-3.5 h-3.5" /></button>
                </div>
              ) : (
                <div>
                  <input ref={(el) => { fileInputRefs.current[idx] = el; }} type="file" accept="image/*,video/*,.pdf,.doc,.docx" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(idx, f); }} />
                  <Button type="button" variant="outline" size="sm" className="h-8 text-xs" disabled={step._uploading} onClick={() => fileInputRefs.current[idx]?.click()}>
                    {step._uploading ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Uploading…</> : <><Upload className="w-3.5 h-3.5 mr-1.5" />Attach media</>}
                  </Button>
                </div>
              )}
              {step._uploadError && <p className="text-xs text-destructive">{step._uploadError}</p>}
            </div>
          </div>
        ))}
        <Button variant="outline" onClick={addStep} className="w-full"><Plus className="w-4 h-4 mr-2" />Add Step</Button>
      </div>
      <Button onClick={submit} disabled={editMut.isPending || hasOffsetError} className="w-full">
        {editMut.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}Save Changes
      </Button>
    </div>
  );
}

// ── Leads Tab ──────────────────────────────────────────────────────────────────

function LeadsTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const { data: leads = [], isLoading } = useQuery<CampaignLead[]>({
    queryKey: ['wa-leads'],
    queryFn: () => adminFetch('/api/admin/wa/leads'),
    refetchInterval: 30000,
  });

  const sendFailedCount = leads.filter(l => l.status === 'send_failed').length;
  const filteredLeads = statusFilter === 'all' ? leads : leads.filter(l => l.status === statusFilter);

  const allFilteredIds = filteredLeads.map(l => l.id);
  const allSelected = allFilteredIds.length > 0 && allFilteredIds.every(id => selectedIds.has(id));
  const someSelected = allFilteredIds.some(id => selectedIds.has(id)) && !allSelected;

  const toggleAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(allFilteredIds));
  };

  const toggleOne = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const updateMut = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      adminFetch(`/api/admin/wa/leads/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wa-leads'] }),
    onError: () => toast({ title: 'Error', description: 'Could not update lead', variant: 'destructive' }),
  });

  const bulkMut = useMutation({
    mutationFn: ({ ids, action }: { ids: number[]; action: 'pause' | 'resume' | 'retry' }) =>
      adminFetch('/api/admin/wa/leads/bulk', { method: 'POST', body: JSON.stringify({ ids, action }) }),
    onSuccess: (_data, vars) => {
      toast({ title: 'Done', description: `${vars.ids.length} lead${vars.ids.length !== 1 ? 's' : ''} updated` });
      setSelectedIds(new Set());
      qc.invalidateQueries({ queryKey: ['wa-leads'] });
    },
    onError: () => toast({ title: 'Error', description: 'Bulk action failed', variant: 'destructive' }),
  });

  const getLeadLabel = (lead: CampaignLead) => lead.storeName ?? lead.inboundDisplayName ?? lead.inboundPhone ?? lead.phone ?? '?';
  const getLeadPhone = (lead: CampaignLead) => lead.phone ?? (lead.inboundPhone ? `+${lead.inboundPhone}` : null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Campaign Leads</h3>
          <p className="text-sm text-muted-foreground">All contacts enrolled in drip sequences. All steps send automatically regardless of reply.</p>
        </div>
        <Dialog open={enrollOpen} onOpenChange={setEnrollOpen}>
          <DialogTrigger asChild>
            <Button><Users className="w-4 h-4 mr-2" />Enroll Sellers</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Enroll Pending Sellers in a Sequence</DialogTitle></DialogHeader>
            <EnrollForm onSuccess={() => { setEnrollOpen(false); qc.invalidateQueries({ queryKey: ['wa-leads'] }); }} />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading && <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" />Loading…</div>}

      {!isLoading && sendFailedCount > 0 && (
        <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <XCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span className="text-sm text-red-800 font-medium">{sendFailedCount} lead{sendFailedCount !== 1 ? 's' : ''} failed to send after 3 attempts.</span>
          <Button size="sm" variant="outline" className="ml-auto h-7 text-xs border-red-300 text-red-700 hover:bg-red-100" onClick={() => setStatusFilter('send_failed')}>
            View failed
          </Button>
        </div>
      )}

      {!isLoading && leads.length === 0 && (
        <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
          <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No leads enrolled yet. Use "Enroll Sellers" or enroll contacts from the Inbound tab.</p>
        </div>
      )}

      {leads.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setSelectedIds(new Set()); }} className="text-sm border rounded-md px-3 py-1.5 bg-background">
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="paused_manual">Paused</option>
              <option value="send_failed">Send Failed</option>
              <option value="completed">Completed</option>
              <option value="removed">Removed</option>
            </select>
            {statusFilter !== 'all' && (
              <button onClick={() => setStatusFilter('all')} className="text-xs text-muted-foreground hover:text-foreground underline">
                Clear filter
              </button>
            )}
            <span className="text-xs text-muted-foreground ml-auto">{filteredLeads.length} of {leads.length}</span>
          </div>
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
            <span className="text-sm text-blue-800 font-medium">{selectedIds.size} selected</span>
            <div className="flex gap-1.5 ml-auto">
              <Button size="sm" variant="outline" className="h-7 text-xs" disabled={bulkMut.isPending}
                onClick={() => bulkMut.mutate({ ids: [...selectedIds], action: 'pause' })}>
                <Pause className="w-3 h-3 mr-1" />Pause
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs text-green-700 border-green-300 hover:bg-green-50" disabled={bulkMut.isPending}
                onClick={() => bulkMut.mutate({ ids: [...selectedIds], action: 'resume' })}>
                <Play className="w-3 h-3 mr-1" />Resume
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs text-blue-700 border-blue-300 hover:bg-blue-50" disabled={bulkMut.isPending}
                onClick={() => bulkMut.mutate({ ids: [...selectedIds], action: 'retry' })}>
                <RefreshCw className="w-3 h-3 mr-1" />Retry
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setSelectedIds(new Set())}>Clear</Button>
            </div>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 pr-2 w-8">
                  <input type="checkbox" checked={allSelected} ref={el => { if (el) el.indeterminate = someSelected; }}
                    onChange={toggleAll} className="rounded border-gray-300 cursor-pointer" />
                </th>
                <th className="pb-2 pr-4 font-medium">Contact</th>
                <th className="pb-2 pr-4 font-medium">Sequence</th>
                <th className="pb-2 pr-4 font-medium">Step</th>
                <th className="pb-2 pr-4 font-medium">Status</th>
                <th className="pb-2 pr-4 font-medium">Replied</th>
                <th className="pb-2 pr-4 font-medium">Next Send</th>
                <th className="pb-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredLeads.map((lead) => (
                <tr key={lead.id} className={`hover:bg-muted/30 transition-colors ${selectedIds.has(lead.id) ? 'bg-blue-50/50' : ''}`}>
                  <td className="py-3 pr-2">
                    <input type="checkbox" checked={selectedIds.has(lead.id)} onChange={() => toggleOne(lead.id)}
                      className="rounded border-gray-300 cursor-pointer" />
                  </td>
                  <td className="py-3 pr-4">
                    <div className="font-medium flex items-center gap-1.5">
                      {getLeadLabel(lead)}
                      {lead.inboundLeadId && !lead.sellerId && (
                        <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-medium">inbound</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">{getLeadPhone(lead)}</div>
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground">{lead.sequenceName}</td>
                  <td className="py-3 pr-4">
                    <span className="font-mono font-semibold">{lead.currentHourOffset < 0 ? '–' : formatOffset(lead.currentHourOffset)}</span>
                  </td>
                  <td className="py-3 pr-4"><StatusBadge status={lead.status} /></td>
                  <td className="py-3 pr-4">
                    {lead.repliedAt ? (
                      <span className="flex items-center gap-1 text-green-700 text-xs"><CheckCircle2 className="w-3.5 h-3.5" />{fmtDate(lead.repliedAt)}</span>
                    ) : (
                      <span className="text-muted-foreground text-xs">No reply</span>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-xs text-muted-foreground">{fmtDate(lead.nextSendAt)}</td>
                  <td className="py-3">
                    <div className="flex gap-1">
                      {lead.status === 'active' && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-orange-600" title="Pause manually"
                          onClick={() => updateMut.mutate({ id: lead.id, status: 'paused_manual' })}>
                          <Pause className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      {(lead.status === 'paused_manual' || lead.status === 'paused_no_reply' || lead.status === 'send_failed') && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600" title="Resume"
                          onClick={() => updateMut.mutate({ id: lead.id, status: 'active' })}>
                          <Play className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      {lead.status === 'send_failed' && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-600" title="Retry sending"
                          onClick={() => updateMut.mutate({ id: lead.id, status: 'active' })}>
                          <RefreshCw className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      {lead.status !== 'removed' && lead.status !== 'completed' && lead.status !== 'send_failed' && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" title="Remove"
                          onClick={() => updateMut.mutate({ id: lead.id, status: 'removed' })}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </div>
      )}
    </div>
  );
}

function EnrollForm({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const [selectedSequenceId, setSelectedSequenceId] = useState<number | null>(null);
  const [selectedSellerIds, setSelectedSellerIds] = useState<Set<number>>(new Set());

  const { data: sequences = [] } = useQuery<Sequence[]>({ queryKey: ['wa-sequences'], queryFn: () => adminFetch('/api/admin/wa/sequences') });
  const { data: pendingSellers = [], isLoading: loadingSellers } = useQuery<PendingSeller[]>({ queryKey: ['wa-pending-sellers'], queryFn: () => adminFetch('/api/admin/wa/pending-sellers') });

  const enrollMut = useMutation({
    mutationFn: (data: { sequenceId: number; sellerIds: number[] }) =>
      adminFetch('/api/admin/wa/leads', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: (res: any) => { toast({ title: 'Enrolled', description: `${res.added} seller(s) added.` }); onSuccess(); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const toggleSeller = (id: number) => {
    setSelectedSellerIds((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };

  const submit = () => {
    if (!selectedSequenceId) { toast({ title: 'Select a sequence first', variant: 'destructive' }); return; }
    if (selectedSellerIds.size === 0) { toast({ title: 'Select at least one seller', variant: 'destructive' }); return; }
    enrollMut.mutate({ sequenceId: selectedSequenceId, sellerIds: [...selectedSellerIds] });
  };

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>Select Sequence</Label>
        {sequences.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sequences yet. Create one in the Sequences tab first.</p>
        ) : (
          <div className="space-y-2">
            {sequences.map((seq) => (
              <button key={seq.id} onClick={() => setSelectedSequenceId(seq.id)}
                className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${selectedSequenceId === seq.id ? 'border-primary bg-primary/5' : 'hover:bg-muted'}`}>
                <div className="font-medium">{seq.name}</div>
                <div className="text-xs text-muted-foreground">{seq.steps.length} days · {seq.leadCount} leads enrolled</div>
              </button>
            ))}
          </div>
        )}
      </div>
      {selectedSequenceId && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Select Pending Sellers</Label>
            {selectedSellerIds.size > 0 && <span className="text-xs text-muted-foreground">{selectedSellerIds.size} selected</span>}
          </div>
          {loadingSellers ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm"><Loader2 className="w-4 h-4 animate-spin" />Loading…</div>
          ) : pendingSellers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending sellers found.</p>
          ) : (
            <div className="max-h-64 overflow-y-auto border rounded-lg divide-y">
              {pendingSellers.map((seller) => (
                <label key={seller.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted cursor-pointer">
                  <input type="checkbox" checked={selectedSellerIds.has(seller.id)} onChange={() => toggleSeller(seller.id)} className="w-4 h-4 rounded" />
                  <div>
                    <div className="font-medium text-sm">{seller.storeName}</div>
                    <div className="text-xs text-muted-foreground">{seller.phone} · {seller.subdomain}.chatcart.in</div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>
      )}
      <Button onClick={submit} disabled={enrollMut.isPending || !selectedSequenceId || selectedSellerIds.size === 0} className="w-full">
        {enrollMut.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Users className="w-4 h-4 mr-2" />}
        Enroll {selectedSellerIds.size > 0 ? `${selectedSellerIds.size} Seller${selectedSellerIds.size > 1 ? 's' : ''}` : 'Sellers'}
      </Button>
    </div>
  );
}

// ── Inbound Leads Tab ──────────────────────────────────────────────────────────

function InboundLeadRow({ lead, sequences, onEnrolled, onDeleted, checked, onCheckedChange }: {
  lead: InboundLead; sequences: Sequence[]; onEnrolled: () => void; onDeleted: () => void;
  checked?: boolean; onCheckedChange?: (v: boolean) => void;
}) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [selectedSeqId, setSelectedSeqId] = useState<number | null>(null);

  const deleteMut = useMutation({
    mutationFn: () => adminFetch(`/api/admin/wa/inbound-leads/${lead.id}`, { method: 'DELETE' }),
    onSuccess: () => { toast({ title: 'Lead removed' }); onDeleted(); },
    onError: () => toast({ title: 'Delete failed', variant: 'destructive' }),
  });

  const { data: messages = [], isLoading: loadingMsgs } = useQuery<InboundMessage[]>({
    queryKey: ['wa-inbound-messages', lead.id],
    queryFn: () => adminFetch(`/api/admin/wa/inbound-leads/${lead.id}/messages`),
    enabled: expanded,
  });

  const enrollMut = useMutation({
    mutationFn: (seqId: number) =>
      adminFetch(`/api/admin/wa/inbound-leads/${lead.id}/enroll`, { method: 'POST', body: JSON.stringify({ sequenceId: seqId }) }),
    onSuccess: () => {
      toast({ title: 'Enrolled in sequence', description: `${lead.displayName ?? lead.phone} added to sequence.` });
      setEnrollOpen(false);
      onEnrolled();
    },
    onError: (e: Error) => toast({ title: 'Already enrolled', description: e.message, variant: 'destructive' }),
  });

  const isNewContact = !lead.matchedSellerId;

  return (
    <div className={`border rounded-lg overflow-hidden ${checked ? 'border-blue-300 bg-blue-50/30' : ''}`}>
      <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 cursor-pointer" onClick={() => setExpanded((v) => !v)}>
        {onCheckedChange !== undefined && (
          <div onClick={(e) => e.stopPropagation()}>
            <input type="checkbox" checked={!!checked} onChange={e => onCheckedChange(e.target.checked)}
              className="rounded border-gray-300 cursor-pointer" />
          </div>
        )}
        <button className="shrink-0 text-muted-foreground">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium">{lead.displayName || `+${lead.phone}`}</span>
            {lead.displayName && <span className="text-xs text-muted-foreground">+{lead.phone}</span>}
            {lead.isWarm && (
              <span className="flex items-center gap-0.5 text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-medium">
                <Flame className="w-3 h-3" />warm
              </span>
            )}
            {isNewContact ? (
              <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">new contact</span>
            ) : (
              <span className="flex items-center gap-0.5 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">
                <Link2 className="w-3 h-3" />{lead.matchedSellerName} ({lead.matchedSellerPlan})
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5 truncate max-w-md">{lead.lastMessage || '—'}</div>
        </div>

        <div className="shrink-0 text-right">
          <div className="text-xs text-muted-foreground">{fmtRelative(lead.lastMessageAt)}</div>
          <div className="text-xs text-muted-foreground">{lead.messageCount} msg{lead.messageCount !== 1 ? 's' : ''}</div>
        </div>

        <div className="shrink-0 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
            disabled={deleteMut.isPending}
            onClick={() => deleteMut.mutate()}>
            {deleteMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          </Button>
          <Dialog open={enrollOpen} onOpenChange={setEnrollOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="text-xs h-7">
                <Plus className="w-3 h-3 mr-1" />Enroll
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Enroll {lead.displayName ?? `+${lead.phone}`} in a Sequence</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                {sequences.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No sequences created yet. Create one in the Sequences tab first.</p>
                ) : (
                  <div className="space-y-2">
                    {sequences.map((seq) => (
                      <button key={seq.id} onClick={() => setSelectedSeqId(seq.id)}
                        className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${selectedSeqId === seq.id ? 'border-primary bg-primary/5' : 'hover:bg-muted'}`}>
                        <div className="font-medium text-sm">{seq.name}</div>
                        <div className="text-xs text-muted-foreground">{seq.steps.length} days · {seq.leadCount} leads</div>
                      </button>
                    ))}
                  </div>
                )}
                <Button className="w-full" disabled={!selectedSeqId || enrollMut.isPending}
                  onClick={() => selectedSeqId && enrollMut.mutate(selectedSeqId)}>
                  {enrollMut.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Add to Sequence
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {expanded && (
        <div className="border-t bg-muted/20 px-4 py-3">
          {loadingMsgs ? (
            <div className="flex items-center gap-2 text-muted-foreground text-xs"><Loader2 className="w-3 h-3 animate-spin" />Loading messages…</div>
          ) : messages.length === 0 ? (
            <p className="text-xs text-muted-foreground">No message history captured.</p>
          ) : (
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Message History</div>
              {messages.map((msg) => (
                <div key={msg.id} className="flex gap-3 text-sm">
                  <span className="text-xs text-muted-foreground shrink-0 pt-0.5 w-28">{fmtDate(msg.receivedAt)}</span>
                  <span className="text-foreground/80">{msg.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function InboundTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkSeqId, setBulkSeqId] = useState<number | ''>('');

  const bulkDeleteMut = useMutation({
    mutationFn: (ids: number[]) =>
      adminFetch('/api/admin/wa/inbound-leads/bulk', { method: 'DELETE', body: JSON.stringify({ ids }) }),
    onSuccess: (data: any) => {
      toast({ title: `${data.deleted} lead${data.deleted !== 1 ? 's' : ''} removed` });
      setSelectedIds(new Set());
      qc.invalidateQueries({ queryKey: ['wa-inbound-leads'] });
    },
    onError: () => toast({ title: 'Delete failed', variant: 'destructive' }),
  });

  const { data: leads = [], isLoading, refetch } = useQuery<InboundLead[]>({
    queryKey: ['wa-inbound-leads'],
    queryFn: () => adminFetch('/api/admin/wa/inbound-leads'),
    refetchInterval: 30000,
  });

  const { data: sequences = [] } = useQuery<Sequence[]>({
    queryKey: ['wa-sequences'],
    queryFn: () => adminFetch('/api/admin/wa/sequences'),
  });

  const newContacts = leads.filter((l) => !l.matchedSellerId);
  const matchedSellers = leads.filter((l) => l.matchedSellerId);
  const allIds = leads.map((l) => l.id);
  const allSelected = allIds.length > 0 && allIds.every(id => selectedIds.has(id));
  const someSelected = allIds.some(id => selectedIds.has(id)) && !allSelected;

  const toggleOne = (id: number, v: boolean) => setSelectedIds(prev => {
    const next = new Set(prev);
    if (v) next.add(id); else next.delete(id);
    return next;
  });

  const onEnrolled = () => {
    qc.invalidateQueries({ queryKey: ['wa-leads'] });
    qc.invalidateQueries({ queryKey: ['wa-sequences'] });
  };

  const bulkEnrollMut = useMutation({
    mutationFn: ({ ids, sequenceId }: { ids: number[]; sequenceId: number }) =>
      adminFetch('/api/admin/wa/inbound-leads/bulk-enroll', { method: 'POST', body: JSON.stringify({ ids, sequenceId }) }),
    onSuccess: (data: any) => {
      toast({ title: 'Enrolled', description: `${data.enrolled} added, ${data.skipped} already enrolled` });
      setSelectedIds(new Set());
      setBulkSeqId('');
      onEnrolled();
    },
    onError: () => toast({ title: 'Error', description: 'Bulk enroll failed', variant: 'destructive' }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <PhoneIncoming className="w-5 h-5 text-green-600" />
            Inbound Leads
          </h3>
          <p className="text-sm text-muted-foreground">
            Contacts who messaged your connected number directly — the safest, highest-priority audience for campaigns.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {leads.length > 0 && (
            <label className="flex items-center gap-1.5 text-sm text-muted-foreground cursor-pointer select-none">
              <input type="checkbox" checked={allSelected}
                ref={el => { if (el) el.indeterminate = someSelected; }}
                onChange={e => setSelectedIds(e.target.checked ? new Set(allIds) : new Set())}
                className="rounded border-gray-300" />
              Select all
            </label>
          )}
          <Button variant="ghost" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-1" />Refresh
          </Button>
        </div>
      </div>

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg flex-wrap">
          <span className="text-sm text-blue-800 font-medium">{selectedIds.size} selected</span>
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            <select value={bulkSeqId} onChange={e => setBulkSeqId(e.target.value ? Number(e.target.value) : '')}
              className="text-sm border rounded-md px-2 py-1 bg-background h-7">
              <option value="">Pick a sequence…</option>
              {sequences.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <Button size="sm" className="h-7 text-xs" disabled={!bulkSeqId || bulkEnrollMut.isPending}
              onClick={() => bulkSeqId && bulkEnrollMut.mutate({ ids: [...selectedIds], sequenceId: Number(bulkSeqId) })}>
              {bulkEnrollMut.isPending ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Plus className="w-3 h-3 mr-1" />}
              Enroll in Sequence
            </Button>
            <Button size="sm" variant="destructive" className="h-7 text-xs" disabled={bulkDeleteMut.isPending}
              onClick={() => bulkDeleteMut.mutate([...selectedIds])}>
              {bulkDeleteMut.isPending ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Trash2 className="w-3 h-3 mr-1" />}
              Delete Selected
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setSelectedIds(new Set())}>Clear</Button>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1.5">
          <span className="flex items-center gap-0.5 bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-medium"><Flame className="w-3 h-3" />warm</span>
          = messaged you first (lowest ban risk)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">new contact</span>
          = not yet in your seller database
        </span>
        <span className="flex items-center gap-1.5">
          <span className="flex items-center gap-0.5 bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium"><Link2 className="w-3 h-3" />matched</span>
          = linked to existing seller record
        </span>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" />Loading…</div>
      )}

      {!isLoading && leads.length === 0 && (
        <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-lg">
          <PhoneIncoming className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No inbound messages yet</p>
          <p className="text-sm mt-1">When someone messages your connected WhatsApp number, they'll appear here automatically.</p>
        </div>
      )}

      {matchedSellers.length > 0 && (
        <div className="space-y-3">
          <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Existing Sellers ({matchedSellers.length})
          </div>
          {matchedSellers.map((lead) => (
            <InboundLeadRow key={lead.id} lead={lead} sequences={sequences} onEnrolled={onEnrolled}
              onDeleted={() => qc.invalidateQueries({ queryKey: ['wa-inbound-leads'] })}
              checked={selectedIds.has(lead.id)} onCheckedChange={v => toggleOne(lead.id, v)} />
          ))}
        </div>
      )}

      {newContacts.length > 0 && (
        <div className="space-y-3">
          <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            New Contacts ({newContacts.length})
          </div>
          {newContacts.map((lead) => (
            <InboundLeadRow key={lead.id} lead={lead} sequences={sequences} onEnrolled={onEnrolled}
              onDeleted={() => qc.invalidateQueries({ queryKey: ['wa-inbound-leads'] })}
              checked={selectedIds.has(lead.id)} onCheckedChange={v => toggleOne(lead.id, v)} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Health Tab ─────────────────────────────────────────────────────────────────

function HealthTab() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: health, isLoading: loadingHealth, refetch } = useQuery<HealthMetrics>({
    queryKey: ['wa-health'],
    queryFn: () => adminFetch('/api/admin/wa/health'),
    refetchInterval: 60000,
  });

  const { data: sendLog = [], isLoading: loadingLog } = useQuery<SendLog[]>({
    queryKey: ['wa-send-log'],
    queryFn: () => adminFetch('/api/admin/wa/send-log'),
    refetchInterval: 60000,
  });

  const pauseMut = useMutation({
    mutationFn: (isPaused: boolean) => adminFetch('/api/admin/wa/settings', { method: 'PATCH', body: JSON.stringify({ isPaused }) }),
    onSuccess: (_, isPaused) => {
      qc.invalidateQueries({ queryKey: ['wa-health'] });
      toast({ title: isPaused ? 'All sending paused' : 'Sending resumed' });
    },
    onError: () => toast({ title: 'Error', variant: 'destructive' }),
  });

  const isWarmup = (() => {
    if (!health?.connectedAt) return false;
    const days = Math.floor((Date.now() - new Date(health.connectedAt).getTime()) / 86400000);
    return days < (health.warmupDays ?? 14);
  })();

  const effectiveLimit = isWarmup ? health?.warmupDailyLimit : health?.dailyLimit;
  const replyRateLow = health?.replyRate !== null && health?.replyRate !== undefined && health.replyRate < (health.replyRateThreshold ?? 10);

  return (
    <div className="space-y-6">
      <Card className={health?.isPaused ? 'border-orange-300 bg-orange-50' : ''}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {health?.isPaused ? <Pause className="w-5 h-5 text-orange-600" /> : <Play className="w-5 h-5 text-green-600" />}
                Global Send Control
              </CardTitle>
              <CardDescription>
                {health?.isPaused ? 'All outbound messages are paused.' : 'Scheduler is active.'}
              </CardDescription>
            </div>
            {health && (
              <Button variant={health.isPaused ? 'default' : 'destructive'} onClick={() => pauseMut.mutate(!health.isPaused)} disabled={pauseMut.isPending} className="shrink-0">
                {pauseMut.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : health.isPaused ? <Play className="w-4 h-4 mr-2" /> : <Pause className="w-4 h-4 mr-2" />}
                {health.isPaused ? 'Resume Sending' : 'Pause All Sending'}
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {replyRateLow && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-red-800">Low Reply Rate Warning</div>
            <div className="text-sm text-red-700">Reply rate is {health!.replyRate}% — below {health!.replyRateThreshold}% threshold.</div>
          </div>
        </div>
      )}

      {isWarmup && (
        <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <Clock className="w-5 h-5 text-blue-600 shrink-0" />
          <div>
            <div className="font-semibold text-blue-800">Warm-up Mode Active</div>
            <div className="text-sm text-blue-700">Daily limit is {health?.warmupDailyLimit}/day for the first {health?.warmupDays} days.</div>
          </div>
        </div>
      )}

      {loadingHealth ? (
        <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" />Loading metrics…</div>
      ) : health && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard label="Sent Today" value={`${health.sentToday} / ${effectiveLimit}`} icon={<MessageCircle className="w-5 h-5 text-blue-600" />} />
          <MetricCard label="Sent This Week" value={health.sentThisWeek} icon={<TrendingUp className="w-5 h-5 text-green-600" />} />
          <MetricCard label="Reply Rate" value={health.replyRate !== null ? `${health.replyRate}%` : '—'} icon={<MessageSquare className="w-5 h-5 text-purple-600" />} warn={replyRateLow} />
          <MetricCard label="Failed Today" value={health.failedToday} icon={<XCircle className="w-5 h-5 text-red-600" />} warn={health.failedToday > 0} />
          <MetricCard label="Active Leads" value={health.activeLeads} icon={<Play className="w-5 h-5 text-green-600" />} />
          <MetricCard label="Send Failed" value={health.sendFailedLeads} icon={<XCircle className="w-5 h-5 text-red-600" />} />
          <MetricCard label="Paused Leads" value={health.pausedLeads} icon={<Pause className="w-5 h-5 text-yellow-600" />} />
          <MetricCard label="Completed" value={health.completedLeads} icon={<CheckCircle2 className="w-5 h-5 text-blue-600" />} />
          <MetricCard label="Inbound Contacts" value={health.inboundTotal} icon={<PhoneIncoming className="w-5 h-5 text-orange-600" />} />
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Recent Sends</h3>
          <Button variant="ghost" size="sm" onClick={() => refetch()}><RefreshCw className="w-4 h-4 mr-1" />Refresh</Button>
        </div>
        {loadingLog ? (
          <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" />Loading…</div>
        ) : sendLog.length === 0 ? (
          <p className="text-sm text-muted-foreground">No messages sent yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">Sent At</th>
                  <th className="pb-2 pr-4 font-medium">To</th>
                  <th className="pb-2 pr-4 font-medium">Status</th>
                  <th className="pb-2 font-medium">Message</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {sendLog.map((log) => (
                  <tr key={log.id} className="hover:bg-muted/30">
                    <td className="py-2 pr-4 text-xs text-muted-foreground whitespace-nowrap">{fmtDate(log.sentAt)}</td>
                    <td className="py-2 pr-4">
                      <div className="text-xs font-medium">{log.storeName ?? log.toPhone}</div>
                      <div className="text-xs text-muted-foreground">{log.toPhone}</div>
                    </td>
                    <td className="py-2 pr-4">
                      {log.status === 'sent' ? (
                        <span className="flex items-center gap-1 text-green-700 text-xs"><CheckCircle2 className="w-3.5 h-3.5" />Sent</span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-700 text-xs"><XCircle className="w-3.5 h-3.5" />Failed</span>
                      )}
                      {log.errorMessage && <div className="text-xs text-red-600 mt-0.5">{log.errorMessage}</div>}
                    </td>
                    <td className="py-2 text-xs text-muted-foreground max-w-xs truncate">{log.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon, warn = false }: { label: string; value: string | number; icon: React.ReactNode; warn?: boolean }) {
  return (
    <Card className={warn ? 'border-red-200 bg-red-50' : ''}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
          {icon}
        </div>
        <div className={`text-2xl font-bold ${warn ? 'text-red-700' : ''}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function WhatsAppMarketing() {
  return (
    <Layout>
      <div className="space-y-6 max-w-5xl">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <MessageCircle className="w-6 h-6 text-green-600" />
            WhatsApp Marketing
          </h1>
          <p className="text-muted-foreground mt-1">
            Connect a dedicated WhatsApp number to run reply-gated drip campaigns. Inbound contacts are captured automatically.
          </p>
        </div>

        <Tabs defaultValue="connection">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="connection">Connection</TabsTrigger>
            <TabsTrigger value="sequences">Sequences</TabsTrigger>
            <TabsTrigger value="leads">Leads</TabsTrigger>
            <TabsTrigger value="inbound" className="flex items-center gap-1">
              <PhoneIncoming className="w-3.5 h-3.5" />Inbound
            </TabsTrigger>
            <TabsTrigger value="health">Health</TabsTrigger>
          </TabsList>

          <TabsContent value="connection" className="mt-6"><ConnectionTab /></TabsContent>
          <TabsContent value="sequences" className="mt-6"><SequencesTab /></TabsContent>
          <TabsContent value="leads" className="mt-6"><LeadsTab /></TabsContent>
          <TabsContent value="inbound" className="mt-6"><InboundTab /></TabsContent>
          <TabsContent value="health" className="mt-6"><HealthTab /></TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

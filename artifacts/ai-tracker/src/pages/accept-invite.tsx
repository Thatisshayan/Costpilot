import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { CheckCircle2, XCircle, Loader2, Users, Clock, ArrowRight, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useAcceptInvite, useGetInviteByToken } from '@workspace/api-client-react';

export default function AcceptInvite() {
  const [location, setLocation] = useLocation();
  const params = new URLSearchParams(location.split('?')[1] || '');
  const token = params.get('token') || '';

  const { data: invite, isLoading: inviteLoading, isError: inviteError } = useGetInviteByToken(token, {
    query: { enabled: !!token, retry: false },
  });

  const acceptInviteMutation = useAcceptInvite();

  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isExpired = invite && new Date(invite.expiresAt) < new Date();

  useEffect(() => {
    if (inviteError) {
      setError('Invite not found or invalid link.');
    }
  }, [inviteError]);

  const handleAccept = async () => {
    try {
      const result = await acceptInviteMutation.mutateAsync({ data: { token } });
      setAccepted(true);
      toast.success('You have joined the workspace!');
    } catch (err: any) {
      const message = err?.data?.error || 'Failed to accept invite. The link may have expired.';
      setError(message);
      toast.error(message);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 p-4">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6">
            <XCircle size={40} className="text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Invalid Invite Link</h1>
          <p className="text-slate-400 text-sm mb-8">
            No invite token was provided. Please check the link and try again.
          </p>
          <button
            onClick={() => setLocation('/collaboration')}
            className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 rounded-xl text-white font-bold text-sm transition-all inline-flex items-center gap-2"
          >
            Go to Collaboration
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  if (inviteLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-indigo-400 mx-auto mb-4" />
          <p className="text-slate-400 text-sm">Loading invite details...</p>
        </div>
      </div>
    );
  }

  if (error && !invite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 p-4">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6">
            <XCircle size={40} className="text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Invite Not Found</h1>
          <p className="text-slate-400 text-sm mb-8">{error}</p>
          <button
            onClick={() => setLocation('/collaboration')}
            className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 rounded-xl text-white font-bold text-sm transition-all inline-flex items-center gap-2"
          >
            Go to Collaboration
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 p-4">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} className="text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Welcome aboard!</h1>
          <p className="text-slate-400 text-sm mb-8">
            You've successfully joined <span className="text-white font-bold">{invite?.workspaceName}</span>.
          </p>
          <button
            onClick={() => setLocation('/collaboration')}
            className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 rounded-xl text-white font-bold text-sm transition-all inline-flex items-center gap-2"
          >
            Go to Workspace
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  if (invite?.status !== 'pending' && invite?.status !== undefined) {
    const isAccepted = invite.status === 'accepted';
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 p-4">
        <div className="max-w-md w-full text-center">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${isAccepted ? 'bg-emerald-500/10' : 'bg-amber-500/10'}`}>
            {isAccepted ? (
              <CheckCircle2 size={40} className="text-emerald-400" />
            ) : (
              <Clock size={40} className="text-amber-400" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">
            {isAccepted ? 'Already Accepted' : 'Invite Expired'}
          </h1>
          <p className="text-slate-400 text-sm mb-8">
            {isAccepted
              ? `You've already accepted the invite to ${invite.workspaceName}.`
              : 'This invite has expired. Please ask the workspace owner to send a new one.'}
          </p>
          <button
            onClick={() => setLocation('/collaboration')}
            className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 rounded-xl text-white font-bold text-sm transition-all inline-flex items-center gap-2"
          >
            {isAccepted ? 'Go to Workspace' : 'Go to Collaboration'}
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 p-4">
      <div className="max-w-md w-full">
        {/* Brand */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-indigo-500/20">
            <Users size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">CostPilot</h1>
        </div>

        {/* Invite Card */}
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-[2rem] p-8 backdrop-blur-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center mx-auto mb-5">
              <Users size={32} className="text-indigo-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">You're invited!</h2>
            <p className="text-slate-400 text-sm">
              You've been invited to join
            </p>
            <p className="text-2xl font-black text-white mt-2 bg-gradient-to-r from-indigo-400 to-indigo-200 bg-clip-text text-transparent">
              {invite?.workspaceName}
            </p>
          </div>

          {invite && (
            <div className="space-y-3 mb-8 p-4 bg-white/[0.02] rounded-xl border border-white/[0.05]">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Invited email</span>
                <span className="text-white font-medium">{invite.email}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Workspace</span>
                <span className="text-white font-medium">{invite.workspaceName}</span>
              </div>
              {invite.expiresAt && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Expires</span>
                  <span className="text-amber-400 font-medium">
                    {new Date(invite.expiresAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-500/5 border border-red-500/10 rounded-xl flex items-start gap-3">
              <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          {isExpired && (
            <div className="mb-6 p-4 bg-amber-500/5 border border-amber-500/10 rounded-xl flex items-start gap-3">
              <Clock size={18} className="text-amber-400 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-300">This invite has expired. Ask the workspace owner to send a new one.</p>
            </div>
          )}

          <button
            onClick={handleAccept}
            disabled={acceptInviteMutation.isPending || !!isExpired}
            className="w-full px-6 py-4 bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-700 rounded-xl text-white font-bold text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 disabled:shadow-none disabled:cursor-not-allowed"
          >
            {acceptInviteMutation.isPending ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Accepting...
              </>
            ) : (
              <>
                <CheckCircle2 size={18} />
                Accept Invitation
              </>
            )}
          </button>
        </div>

        <p className="text-center mt-6 text-xs text-slate-600">
          By accepting, you agree to join this workspace on CostPilot.
        </p>
      </div>
    </div>
  );
}

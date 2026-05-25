'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Facebook,
  Mail,
  MessageCircle,
  MessagesSquare,
  Send,
  Twitter,
} from 'lucide-react';
import { PageLoading } from '@/components/loading';

type LinkValidityOption = '1d' | '2d' | '3d' | '1w' | '1m';

const LINK_VALIDITY_OPTIONS: Array<{
  value: LinkValidityOption;
  label: string;
}> = [
  { value: '1d', label: '1 day (Default)' },
  { value: '2d', label: '2 days' },
  { value: '3d', label: '3 days' },
  { value: '1w', label: '1 week' },
  { value: '1m', label: '1 month' },
];

interface SharedShareProps {
  // State values
  shareModalOpen: boolean;
  setShareModalOpen: (open: boolean) => void;
  shareInfo: {
    url: string;
    pin: string;
    expiresAt: string;
  } | null;
  setShareInfo: (info: {
    url: string;
    pin: string;
    expiresAt: string;
  } | null) => void;
  shareNotice: string;
  setShareNotice: (notice: string) => void;
  shareLoading: boolean;
  setShareLoading: (loading: boolean) => void;
  linkValidity: LinkValidityOption;
  setLinkValidity: (validity: LinkValidityOption) => void;
  copiedLink: boolean;
  setCopiedLink: (copied: boolean) => void;
  copiedPin: boolean;
  setCopiedPin: (copied: boolean) => void;
  viewLoading: boolean;
  setViewLoading: (loading: boolean) => void;

  // Data for sharing
  downloadUrl: string | null;
  pdfUrl: string | null;
  pdfBlob: Blob | null;
  fileName: string;
  reportType: string;
  createdBy: string;

  // Optional: for yearly report specific features
  serverKey?: string | null;
  setServerKey?: (key: string | null) => void;
  queueShare?: () => Promise<boolean>;

  // Callbacks
  handleView: () => void;
  handleDownload: () => void;

  // Refs
  pdfUrlRef: React.MutableRefObject<string | null>;
  resetCopiedTimeoutRef: React.MutableRefObject<number | null>;

  // Platform detection
  isIOS: boolean;
  isMobile: boolean;

  // Environment variables
  fbAppId?: string;
}

export const SharedShare = ({
  shareModalOpen,
  setShareModalOpen,
  shareInfo,
  setShareInfo,
  shareNotice,
  setShareNotice,
  shareLoading,
  setShareLoading,
  linkValidity,
  setLinkValidity,
  copiedLink,
  setCopiedLink,
  copiedPin,
  setCopiedPin,
  viewLoading,
  setViewLoading,
  downloadUrl,
  pdfUrl,
  pdfBlob,
  fileName,
  reportType,
  createdBy,
  serverKey,
  setServerKey,
  queueShare,
  handleView,
  handleDownload,
  pdfUrlRef,
  resetCopiedTimeoutRef,
  isIOS,
  isMobile,
  fbAppId,
}: SharedShareProps) => {

  const createShareLink = useCallback(
    async ({
      cacheKey,
      fileName,
      reportType,
      createdBy,
      linkValidity,
      pdfBlob,
    }: {
      cacheKey: string;
      fileName: string;
      reportType: string;
      createdBy: string;
      linkValidity: LinkValidityOption;
      pdfBlob?: Blob | null;
    }) => {
      const formData = new FormData();
      formData.append('fileName', fileName);
      formData.append('reportType', reportType);
      formData.append('linkValidity', linkValidity);
      if (createdBy) {
        formData.append('createdBy', createdBy);
      }
      if (cacheKey) {
        formData.append('cacheKey', cacheKey);
      }
      if (pdfBlob) {
        formData.append('pdf', pdfBlob, fileName);
      }
      const response = await fetch('/api/reports/share', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) return null;
      const data = await response.json();
      if (!data?.shareUrl || !data?.pin) return null;
      return {
        url: data.shareUrl as string,
        pin: data.pin as string,
        expiresAt: data.expiresAt as string,
        cacheKey: data.cacheKey as string | undefined,
      };
    },
    []
  );

  const openShareModal = useCallback(
    (data: { url: string; pin: string; expiresAt: string }) => {
      setShareInfo(data);
      setShareModalOpen(true);
      setCopiedLink(false);
      setCopiedPin(false);
      setShareNotice('');
    },
    [setShareInfo, setShareModalOpen, setCopiedLink, setCopiedPin, setShareNotice]
  );

  const handleShare = useCallback(async () => {
    if (!shareModalOpen) {
      setShareModalOpen(true);
      setShareInfo(null);
      setShareNotice('');
      return;
    }
    if (!pdfBlob || !downloadUrl) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      if (queueShare) {
        await queueShare();
      }
      return;
    }
    setShareLoading(true);
    try {
      const data = await createShareLink({
        cacheKey: '',
        fileName,
        reportType,
        createdBy,
        linkValidity,
        pdfBlob,
      });
      if (!data) {
        setShareNotice('Failed to create share link.');
        return;
      }
      if (data.cacheKey && data.cacheKey !== serverKey) {
        if (setServerKey) setServerKey(data.cacheKey);
      }
      openShareModal(data);
    } catch (err) {
      console.error('Failed to create share link', err);
      setShareNotice('Failed to create share link.');
    } finally {
      setShareLoading(false);
    }
  }, [
    shareModalOpen,
    setShareModalOpen,
    setShareInfo,
    setShareNotice,
    pdfBlob,
    downloadUrl,
    fileName,
    reportType,
    createdBy,
    linkValidity,
    createShareLink,
    serverKey,
    setServerKey,
    openShareModal,
    queueShare,
  ]);

  const syncQueuedShares = useCallback(async () => {
    // This would be implemented similarly to the original but simplified
    // For now, we'll leave it as a placeholder that can be expanded
    return false;
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const trySync = () => {
      if (!navigator.onLine) return;
      syncQueuedShares();
    };
    trySync();
    window.addEventListener('online', trySync);
    return () => window.removeEventListener('online', trySync);
  }, [syncQueuedShares]);

  const showShareNotice = useCallback(
    (message: string, timeoutMs = 4000) => {
      setShareNotice(message);
      if (resetCopiedTimeoutRef.current) {
        window.clearTimeout(resetCopiedTimeoutRef.current);
      }
      resetCopiedTimeoutRef.current = window.setTimeout(() => {
        setShareNotice('');
      }, timeoutMs);
    },
    [setShareNotice, resetCopiedTimeoutRef]
  );

  if (
    shareModalOpen &&
    shareInfo &&
    (!downloadUrl || viewLoading)
  ) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-card w-full max-w-md rounded-xl border border-border shadow-xl">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h5 className="text-lg font-semibold text-foreground">
              Share Report Card
            </h5>
            <button
              type="button"
              onClick={() => setShareModalOpen(false)}
              className="p-2 rounded-full hover:bg-muted transition-colors"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <div className="p-4 space-y-4">
            <div className="rounded-lg border border-border bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground mb-1">
                Link validity
              </p>
              <select
                value={linkValidity}
                onChange={(e) =>
                  setLinkValidity(e.target.value as LinkValidityOption)
                }
                className="w-full border border-border px-2 py-2 rounded bg-background text-foreground text-sm"
              >
                {LINK_VALIDITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            {shareInfo && (
              <>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Expires on{' '}
                    {new Date(shareInfo.expiresAt).toLocaleString()}.
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground mb-1">
                    Share Link
                  </p>
                  <p className="text-sm break-all">{shareInfo.url}</p>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(shareInfo.url);
                        setShareNotice('Link copied.');
                        setCopiedLink(true);
                        if (resetCopiedTimeoutRef.current) {
                          window.clearTimeout(resetCopiedTimeoutRef.current);
                        }
                        resetCopiedTimeoutRef.current = window.setTimeout(
                          () => {
                            setCopiedLink(false);
                            setShareNotice('');
                          },
                          2000,
                        );
                      } catch {
                        setShareNotice('Copy failed.');
                      }
                    }}
                    className="mt-2 px-3 py-1.5 text-xs rounded border border-border hover:bg-muted"
                  >
                    {copiedLink ? (
                      <span className="inline-flex items-center gap-1">
                        <span className="text-green-600">✓</span>
                        <span>Copied</span>
                      </span>
                    ) : (
                      'Copy Link'
                    )}
                  </button>
                </div>
                <div className="rounded-lg border border-border bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground mb-1">PIN</p>
                  <p className="text-2xl font-semibold tracking-widest">
                    {shareInfo.pin}
                  </p>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(shareInfo.pin);
                        setShareNotice('PIN copied.');
                        setCopiedPin(true);
                        if (resetCopiedTimeoutRef.current) {
                          window.clearTimeout(resetCopiedTimeoutRef.current);
                        }
                        resetCopiedTimeoutRef.current = window.setTimeout(
                          () => {
                            setCopiedPin(false);
                            setShareNotice('');
                          },
                          2000,
                        );
                      } catch {
                        setShareNotice('Copy failed.');
                      }
                    }}
                    className="mt-2 px-3 py-1.5 text-xs rounded border border-border hover:bg-muted"
                  >
                    {copiedPin ? (
                      <span className="inline-flex items-center gap-1">
                        <span className="text-green-600">✓</span>
                        <span>Copied</span>
                      </span>
                    ) : (
                      'Copy PIN'
                    )}
                  </button>
                </div>
                {shareNotice && (
                  <p className="text-xs text-muted-foreground">
                    {shareNotice}
                  </p>
                )}
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-muted-foreground">
                      Share on social media
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        if (navigator.share) {
                          navigator.share({
                            title: 'Report Card',
                            text: `PIN: ${shareInfo.pin}`,
                            url: shareInfo.url,
                          });
                        }
                      }}
                      className="px-2 py-1 text-[11px] rounded border border-border hover:bg-muted"
                    >
                      Share via
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      {
                        label: 'WhatsApp',
                        Icon: MessageCircle,
                        build: () =>
                          `https://wa.me/?text=${encodeURIComponent(
                            `Report Card link: ${shareInfo.url} | PIN: ${shareInfo.pin}`,
                          )}`,
                      },
                      {
                        label: 'Facebook',
                        Icon: Facebook,
                        build: () =>
                          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
                            shareInfo.url,
                          )}&quote=${encodeURIComponent(`PIN: ${shareInfo.pin}`)}`,
                      },
                      {
                        label: 'Messenger',
                        Icon: MessagesSquare,
                        build: () =>
                          `fb-messenger://share/?link=${encodeURIComponent(
                            shareInfo.url,
                          )}&app_id=${encodeURIComponent(
                            fbAppId || '',
                          )}&ref=${encodeURIComponent(`PIN: ${shareInfo.pin}`)}`,
                      },
                      {
                        label: 'X',
                        Icon: Twitter,
                        build: () =>
                          `https://twitter.com/intent/tweet?text=${encodeURIComponent(
                            `Report Card link: ${shareInfo.url} | PIN: ${shareInfo.pin}`,
                          )}`,
                      },
                      {
                        label: 'Telegram',
                        Icon: Send,
                        build: () =>
                          `https://t.me/share/url?url=${encodeURIComponent(
                            shareInfo.url,
                          )}&text=${encodeURIComponent(`PIN: ${shareInfo.pin}`)}`,
                      },
                      {
                        label: 'Email',
                        Icon: Mail,
                        build: () =>
                          `mailto:?subject=${encodeURIComponent(
                            'Report Card',
                          )}&body=${encodeURIComponent(
                            `Report Card link: ${shareInfo.url}\nPIN: ${shareInfo.pin}`,
                          )}`,
                      },
                    ].map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => window.open(item.build(), '_blank')}
                        className="px-3 py-1.5 text-xs rounded border border-border hover:bg-muted inline-flex items-center gap-2"
                      >
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted">
                          <item.Icon className="h-3.5 w-3.5 text-muted-foreground" />
                        </span>
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
            <div className="flex justify-end gap-2">
              {(!shareInfo || shareLoading) && (
                <button
                  type="button"
                  onClick={handleShare}
                  disabled={shareLoading || !downloadUrl}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 border border-primary text-sm disabled:opacity-50"
                >
                  {shareLoading ? 'Generating Link...' : 'Generate'}
                </button>
              )}
              {(shareInfo && !shareLoading) && (
                <button
                  type="button"
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: 'Report Card',
                        text: `PIN: ${shareInfo.pin}`,
                        url: shareInfo.url,
                      });
                    }
                  }}
                  className="px-4 py-2 bg-muted text-muted-foreground rounded hover:bg-muted/80 border border-border text-sm"
                >
                  Share
                </button>
              )}
              <button
                type="button"
                onClick={() => setShareModalOpen(false)}
                className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 border border-primary text-sm"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
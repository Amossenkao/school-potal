'use client';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
	Bot,
	Send,
	Sparkles,
	Plus,
	Trash2,
	Copy,
	Check,
	ChevronDown,
	Square,
	MessageSquare,
	PanelLeftClose,
	PanelLeftOpen,
	Pencil,
} from 'lucide-react';
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import useAuth from '@/store/useAuth';
import { getClientCache, setClientCache } from '@/utils/clientCache';
import SmartRenderer from '@/components/SmartRenderer'; // Added Import

// ─── Types ────────────────────────────────────────────────────────────────────
interface Message {
	id: string;
	role: 'user' | 'assistant';
	content: string;
	timestamp: Date;
	isStreaming?: boolean;
}

interface ChatSession {
	id: string;
	title: string;
	createdAt: Date;
	preview?: string;
	messages?: Message[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const groupSessionsByDate = (sessions: ChatSession[]) => {
	const now = new Date();
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const yesterday = new Date(today);
	yesterday.setDate(today.getDate() - 1);
	const week = new Date(today);
	week.setDate(today.getDate() - 7);
	const month = new Date(today);
	month.setDate(today.getDate() - 30);

	const groups: { label: string; items: ChatSession[] }[] = [
		{ label: 'Today', items: [] },
		{ label: 'Yesterday', items: [] },
		{ label: 'Previous 7 days', items: [] },
		{ label: 'Previous 30 days', items: [] },
		{ label: 'Older', items: [] },
	];

	for (const s of sessions) {
		const d = new Date(s.createdAt);
		if (d >= today) groups[0].items.push(s);
		else if (d >= yesterday) groups[1].items.push(s);
		else if (d >= week) groups[2].items.push(s);
		else if (d >= month) groups[3].items.push(s);
		else groups[4].items.push(s);
	}

	return groups.filter((g) => g.items.length > 0);
};

const chatSessionsCacheKey = (uid: string) => `chat:sessions:${uid}`;
const chatMessagesCacheKey = (uid: string, sessionId: string) =>
	`chat:messages:${uid}:${sessionId}`;

const normalizeMessage = (m: any, fallbackId: string): Message => ({
	id: m?.id ?? fallbackId,
	role: m?.role ?? (m?.sender === 'assistant' ? 'assistant' : 'user'),
	content: m?.content ?? '',
	timestamp: new Date(m?.timestamp ?? Date.now()),
	isStreaming: Boolean(m?.isStreaming),
});

const normalizeSession = (s: any): ChatSession => {
	const messages: Message[] | undefined = Array.isArray(s?.messages)
		? s.messages.map((m: any, i: number) =>
				normalizeMessage(m, `h-${i}-${s?.id ?? 'session'}`),
			)
		: undefined;

	return {
		id: s?.id,
		title: s?.title ?? 'New conversation',
		createdAt: new Date(s?.createdAt ?? Date.now()),
		preview:
			s?.preview ??
			messages?.find((m) => m.role === 'user')?.content?.slice(0, 80) ??
			'',
		messages,
	};
};

const sessionStubs = (sessions: ChatSession[]) =>
	sessions.map(({ messages, ...session }) => session);

// ─── Sub-components ───────────────────────────────────────────────────────────

function ThinkingDots() {
	return (
		<span
			className="inline-flex items-center gap-[3px] py-0.5 px-0.5"
			aria-label="AI is thinking"
		>
			{[0, 1, 2].map((i) => (
				<span
					key={i}
					className="block w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce"
					style={{ animationDelay: `${i * 150}ms`, animationDuration: '900ms' }}
				/>
			))}
		</span>
	);
}

function MessageBubble({
	message,
	userAvatar,
	userName,
}: {
	message: Message;
	userAvatar?: string;
	userName?: string;
}) {
	const [copied, setCopied] = useState(false);
	const contentRef = useRef<HTMLDivElement>(null); // 👈 1. Create a ref
	const isUser = message.role === 'user';

	const handleCopy = async () => {
		try {
			const text = message.content;

			// 2. Clone the DOM node so we can safely edit it before copying
			const clone = contentRef.current?.cloneNode(true) as HTMLDivElement;
			if (clone) {
				// Strip out any UI buttons (like the "Copy code" buttons) so they don't end up in Word
				const buttons = clone.querySelectorAll('button');
				buttons.forEach((btn) => btn.remove());
			}

			// 3. Grab the raw, perfectly formatted HTML
			const rawHtml = clone?.innerHTML || '';

			// 4. Wrap it in Word-friendly styles
			const styledHtml = `
				<!DOCTYPE html>
				<html>
				<head>
					<style>
						table { border-collapse: collapse; width: 100%; margin: 16px 0; font-family: sans-serif; font-size: 14px; }
						th, td { border: 1px solid #d1d5db; padding: 8px 12px; text-align: left; }
						th { background-color: #f3f4f6; font-weight: bold; }
						pre { background-color: #1e1e1e; color: #d4d4d4; padding: 12px; border-radius: 6px; font-family: monospace; }
						code { font-family: monospace; background-color: #f3f4f6; padding: 2px 4px; border-radius: 4px; }
						p { margin-bottom: 12px; font-family: sans-serif; line-height: 1.6; }
					</style>
				</head>
				<body>
					${rawHtml}
				</body>
				</html>
			`;

			const textBlob = new Blob([text], { type: 'text/plain' });
			const htmlBlob = new Blob([styledHtml], { type: 'text/html' });

			await navigator.clipboard.write([
				new ClipboardItem({
					'text/plain': textBlob,
					'text/html': htmlBlob,
				}),
			]);
		} catch (error) {
			// Fallback for older browsers
			navigator.clipboard.writeText(message.content).catch(console.error);
		}

		setCopied(true);
		setTimeout(() => setCopied(false), 1500);
	};

	return (
		<div
			className={`group flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
		>
			{/* Avatar */}
			{!isUser && (
				<div
					className="shrink-0 w-7 h-7 rounded-lg bg-primary/10 text-primary
            flex items-center justify-center mt-0.5 self-start"
					aria-hidden="true"
				>
					<Bot size={13} />
				</div>
			)}
			{isUser && (
				<div
					className="shrink-0 w-7 h-7 rounded-full bg-muted border border-border
            flex items-center justify-center mt-0.5 self-start text-xs font-semibold text-muted-foreground overflow-hidden"
					aria-hidden="true"
				>
					{userAvatar ? (
						<img
							src={userAvatar}
							alt={userName || 'User'}
							className="w-full h-full object-cover"
						/>
					) : userName ? (
						userName.charAt(0).toUpperCase()
					) : (
						'U'
					)}
				</div>
			)}

			{/* Content */}
			<div
				className={`flex flex-col gap-1.5 w-full min-w-0 max-w-[85%] sm:max-w-[80%] ${
					isUser ? 'items-end' : 'items-start'
				}`}
			>
				<div
					className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed overflow-hidden ${
						isUser
							? 'bg-primary text-primary-foreground rounded-tr-sm'
							: 'bg-muted/70 text-foreground rounded-tl-sm border border-border/50'
					}`}
				>
					{message.isStreaming && !message.content ? (
						<ThinkingDots />
					) : (
						<>
							{/* 5. Attach the ref to the wrapper div right here! */}
							<div className="w-full break-words" ref={contentRef}>
								<SmartRenderer content={message.content} />
							</div>

							{message.isStreaming && (
								<span
									className="inline-block w-0.5 h-3.5 bg-current opacity-70 ml-0.5 align-middle animate-pulse"
									aria-hidden="true"
								/>
							)}
						</>
					)}
				</div>

				{/* Meta: time + copy */}
				<div
					className={`flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150 ${
						isUser ? 'flex-row-reverse' : ''
					}`}
				>
					<span className="text-[11px] text-muted-foreground">
						{message.timestamp.toLocaleTimeString([], {
							hour: '2-digit',
							minute: '2-digit',
						})}
					</span>
					{!message.isStreaming && message.content && (
						<button
							type="button"
							onClick={handleCopy}
							aria-label="Copy message"
							className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
						>
							{copied ? <Check size={10} /> : <Copy size={10} />}
							{copied ? 'Copied' : 'Copy'}
						</button>
					)}
				</div>
			</div>
		</div>
	);
}

function SkeletonMessages() {
	return (
		<div className="flex flex-col gap-5 py-4">
			{(
				[
					['60%', false],
					['45%', true],
					['70%', false],
					['35%', true],
				] as [string, boolean][]
			).map(([w, right], i) => (
				<div
					key={i}
					className={`flex gap-3 ${right ? 'flex-row-reverse' : ''}`}
				>
					<div className="w-7 h-7 rounded-lg bg-muted animate-pulse shrink-0" />
					<div
						className="rounded-2xl bg-muted animate-pulse h-10"
						style={{ width: w }}
					/>
				</div>
			))}
		</div>
	);
}

const SUGGESTED_PROMPTS = [
	"What's on my schedule this week?",
	'Help me study for my next exam',
	'How are my grades looking?',
	"Explain a topic I'm stuck on",
];

function EmptyState({ onPrompt }: { onPrompt: (p: string) => void }) {
	return (
		<div className="flex flex-col items-center justify-center h-full gap-8 px-6 text-center">
			<div className="flex flex-col items-center gap-3">
				<div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
					<Bot size={22} />
				</div>
				<div>
					<h2 className="text-base font-semibold text-foreground">
						Study Assistant
					</h2>
					<p className="text-sm text-muted-foreground mt-0.5">
						Ask me anything about your studies, schedule, or grades.
					</p>
				</div>
			</div>
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
				{SUGGESTED_PROMPTS.map((p) => (
					<button
						key={p}
						type="button"
						onClick={() => onPrompt(p)}
						className="text-left text-xs px-3.5 py-3 rounded-xl border border-border bg-muted/40
              text-muted-foreground hover:text-foreground hover:bg-muted hover:border-border/80
              transition-all leading-relaxed"
					>
						{p}
					</button>
				))}
			</div>
		</div>
	);
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function SchoolMessages() {
	const { user, setUser } = useAuth();
	const uid = user?.id || user?.username || 'me';
	const userAvatar =
		user?.avatar ||
		(user
			? `https://ui-avatars.com/api/?name=${user.firstName}+${user.lastName}`
			: undefined);
	const userName = user?.firstName || 'User';

	// Sidebar / session state
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const [sessions, setSessions] = useState<ChatSession[]>([]);
	const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
	const [sessionsLoading, setSessionsLoading] = useState(true);

	// Message state
	const [messages, setMessages] = useState<Message[]>([]);
	const [messagesLoading, setMessagesLoading] = useState(false);

	// Compose state
	const [input, setInput] = useState('');
	const [isStreaming, setIsStreaming] = useState(false);
	const [isFocused, setIsFocused] = useState(false);
	const [showScrollBtn, setShowScrollBtn] = useState(false);

	// Delete dialog
	const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);

	// Rename
	const [renameTarget, setRenameTarget] = useState<string | null>(null);
	const [renameValue, setRenameValue] = useState('');

	// Hover state for sidebar items
	const [hoveredSession, setHoveredSession] = useState<string | null>(null);

	const bottomRef = useRef<HTMLDivElement>(null);
	const scrollRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLTextAreaElement>(null);
	const abortRef = useRef<AbortController | null>(null);
	const pendingNewSessionIdRef = useRef<string | null>(null);

	const persistSessions = useCallback(
		(nextSessions: ChatSession[]) => {
			setClientCache(chatSessionsCacheKey(uid), sessionStubs(nextSessions));
			if (!user) return;
			setUser({
				...user,
				chatSessions: nextSessions.map((session) => ({
					id: session.id,
					title: session.title,
					createdAt: session.createdAt,
					messages: (session.messages ?? []).map((message) => ({
						sender: message.role,
						content: message.content,
						timestamp: message.timestamp,
					})),
				})),
			});
		},
		[setUser, uid, user],
	);

	const updateSessions = useCallback(
		(updater: (prev: ChatSession[]) => ChatSession[]) => {
			setSessions((prev) => {
				const next = updater(prev);
				persistSessions(next);
				return next;
			});
		},
		[persistSessions],
	);

	const persistSessionMessages = useCallback(
		(sessionId: string, nextMessages: Message[]) => {
			setClientCache(chatMessagesCacheKey(uid, sessionId), nextMessages);
			setSessions((prev) => {
				const next = prev.map((session) =>
					session.id === sessionId
						? {
								...session,
								messages: nextMessages,
								preview:
									nextMessages
										.find((m) => m.role === 'user')
										?.content.slice(0, 80) ?? session.preview,
							}
						: session,
				);
				persistSessions(next);
				return next;
			});
		},
		[persistSessions, uid],
	);

	// ── Initialize sidebar based on screen size ────────────────────────────────
	useEffect(() => {
		setSidebarOpen(window.innerWidth >= 1024);
	}, []);

	// ── Scroll helpers ─────────────────────────────────────────────────────────
	const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
		bottomRef.current?.scrollIntoView({ behavior });
	}, []);

	useEffect(() => {
		const el = scrollRef.current;
		if (!el) return;
		const onScroll = () =>
			setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 120);
		el.addEventListener('scroll', onScroll);
		return () => el.removeEventListener('scroll', onScroll);
	}, []);

	useEffect(() => {
		if (isStreaming) scrollToBottom();
	}, [messages, isStreaming, scrollToBottom]);

	useEffect(() => {
		inputRef.current?.focus();
	}, [activeSessionId]);

	// ── Load session list ──────────────────────────────────────────────────────
	useEffect(() => {
		let active = true;
		const authSessions = Array.isArray((user as any)?.chatSessions)
			? ((user as any).chatSessions as any[])
					.map(normalizeSession)
					.filter((session) => session.id)
			: [];

		if (authSessions.length > 0) {
			setSessions(authSessions);
			setClientCache(chatSessionsCacheKey(uid), sessionStubs(authSessions));
			for (const session of authSessions) {
				if (session.messages?.length) {
					setClientCache(
						chatMessagesCacheKey(uid, session.id),
						session.messages,
					);
				}
			}
			if (!activeSessionId) setActiveSessionId(authSessions[0].id);
			setSessionsLoading(false);
			return () => {
				active = false;
			};
		}

		const cachedSessions =
			getClientCache<ChatSession[]>(chatSessionsCacheKey(uid))
				?.map(normalizeSession)
				.filter((session) => session.id) ?? [];

		if (cachedSessions.length > 0) {
			setSessions(cachedSessions);
			if (!activeSessionId) setActiveSessionId(cachedSessions[0].id);
			setSessionsLoading(false);
			return () => {
				active = false;
			};
		}

		setSessionsLoading(true);
		fetch('/api/chat')
			.then((r) => r.json())
			.then((data) => {
				if (!active) return;
				const list: ChatSession[] = (data.sessions ?? [])
					.map(normalizeSession)
					.filter((session: ChatSession) => session.id);
				setSessions(list);
				setClientCache(chatSessionsCacheKey(uid), sessionStubs(list));
				if (list.length > 0 && !activeSessionId) {
					setActiveSessionId(list[0].id);
				}
			})
			.catch(console.error)
			.finally(() => {
				if (active) setSessionsLoading(false);
			});
		return () => {
			active = false;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [uid, user?.chatSessions]);

	// ── Load messages for active session ──────────────────────────────────────
	useEffect(() => {
		if (!activeSessionId) {
			setMessages([]);
			return;
		}
		if (pendingNewSessionIdRef.current === activeSessionId) {
			setMessagesLoading(false);
			return;
		}
		const stateSession = sessions.find((s) => s.id === activeSessionId);
		if (stateSession?.messages?.length) {
			setMessages(stateSession.messages);
			setClientCache(
				chatMessagesCacheKey(uid, activeSessionId),
				stateSession.messages,
			);
			setMessagesLoading(false);
			setTimeout(() => scrollToBottom('instant' as ScrollBehavior), 50);
			return;
		}

		const cachedMessages =
			getClientCache<Message[]>(
				chatMessagesCacheKey(uid, activeSessionId),
			)?.map((m, i) => normalizeMessage(m, `c-${i}-${activeSessionId}`)) ?? [];
		if (cachedMessages.length > 0) {
			setMessages(cachedMessages);
			persistSessionMessages(activeSessionId, cachedMessages);
			setMessagesLoading(false);
			setTimeout(() => scrollToBottom('instant' as ScrollBehavior), 50);
			return;
		}

		let active = true;
		setMessagesLoading(true);
		fetch(`/api/chat?sessionId=${activeSessionId}`)
			.then((r) => r.json())
			.then((data) => {
				if (!active) return;
				const msgs: Message[] = (data.messages ?? []).map(
					(m: any, i: number) => ({
						id: `h-${i}-${activeSessionId}`,
						role: m.sender === 'assistant' ? 'assistant' : 'user',
						content: m.content,
						timestamp: new Date(m.timestamp),
					}),
				);
				setMessages(msgs);
				persistSessionMessages(activeSessionId, msgs);
				setTimeout(() => scrollToBottom('instant' as ScrollBehavior), 50);
			})
			.catch(console.error)
			.finally(() => {
				if (active) setMessagesLoading(false);
			});
		return () => {
			active = false;
		};
	}, [activeSessionId, persistSessionMessages, scrollToBottom, sessions, uid]);

	// ── New chat ───────────────────────────────────────────────────────────────
	const startNewChat = () => {
		setActiveSessionId(null);
		setMessages([]);
		setInput('');
		if (window.innerWidth < 1024) setSidebarOpen(false);
		setTimeout(() => inputRef.current?.focus(), 50);
	};

	// ── Send message ───────────────────────────────────────────────────────────
	const sendMessage = async (overrideText?: string) => {
		const text = (overrideText ?? input).trim();
		if (!text || isStreaming) return;

		const isNew = !activeSessionId;
		const userMsgId = `u-${Date.now()}`;
		const aiId = `a-${Date.now()}`;
		const optimisticMessages: Message[] = [
			{ id: userMsgId, role: 'user', content: text, timestamp: new Date() },
			{
				id: aiId,
				role: 'assistant',
				content: '',
				timestamp: new Date(),
				isStreaming: true,
			},
		];

		setMessages((prev) => [...prev, ...optimisticMessages]);
		setInput('');
		if (inputRef.current) inputRef.current.style.height = 'auto';
		setIsStreaming(true);
		scrollToBottom('smooth');

		abortRef.current = new AbortController();
		let createdSessionId: string | null = null;

		try {
			const res = await fetch('/api/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					prompt: text,
					sessionId: activeSessionId ?? undefined,
				}),
				signal: abortRef.current.signal,
			});

			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err?.error || 'Request failed');
			}

			// Grab new session id from header if this was a new chat
			const newSessionId = res.headers.get('X-Session-Id');
			if (isNew && newSessionId) {
				pendingNewSessionIdRef.current = newSessionId;
				setActiveSessionId(newSessionId);
				// Optimistically add to sidebar with placeholder title
				updateSessions((prev) => [
					{
						id: newSessionId,
						title: 'New conversation',
						createdAt: new Date(),
						preview: text,
						messages: optimisticMessages,
					},
					...prev,
				]);
			}
			// Capture for title polling below
			createdSessionId = newSessionId;

			const contentType = res.headers.get('content-type') ?? '';
			let fullText = '';

			if (contentType.includes('text/event-stream')) {
				const reader = res.body?.getReader();
				const decoder = new TextDecoder();
				if (reader) {
					while (true) {
						const { done, value } = await reader.read();
						if (done) break;
						for (const line of decoder
							.decode(value, { stream: true })
							.split('\n')) {
							if (line.startsWith('data: ')) {
								const d = line.slice(6).trim();
								if (d === '[DONE]') break;
								// Special title update event
								if (d.startsWith('{"__title":')) {
									try {
										const { __title, sessionId } = JSON.parse(d);
										updateSessions((prev) =>
											prev.map((s) =>
												s.id === sessionId ? { ...s, title: __title } : s,
											),
										);
									} catch {}
									continue;
								}
								try {
									const delta =
										JSON.parse(d)?.choices?.[0]?.delta?.content ?? '';
									fullText += delta;
									setMessages((prev) =>
										prev.map((m) =>
											m.id === aiId ? { ...m, content: fullText } : m,
										),
									);
								} catch {}
							}
						}
					}
				}
			} else {
				const data = await res.json();
				fullText = data?.text ?? 'Sorry, I could not generate a response.';
				if (data?.__title && (isNew || newSessionId)) {
					const sid = newSessionId ?? activeSessionId;
					updateSessions((prev) =>
						prev.map((s) => (s.id === sid ? { ...s, title: data.__title } : s)),
					);
				}
				setMessages((prev) =>
					prev.map((m) => (m.id === aiId ? { ...m, content: fullText } : m)),
				);
			}

			setMessages((prev) =>
				prev.map((m) =>
					m.id === aiId
						? {
								...m,
								isStreaming: false,
								content: fullText || 'Sorry, I could not generate a response.',
							}
						: m,
				),
			);

			const finalSessionId = createdSessionId ?? activeSessionId;
			if (finalSessionId) {
				const finalMessages = [
					...messages.filter((m) => !m.isStreaming),
					{
						id: userMsgId,
						role: 'user' as const,
						content: text,
						timestamp: new Date(),
					},
					{
						id: aiId,
						role: 'assistant' as const,
						content: fullText || 'Sorry, I could not generate a response.',
						timestamp: new Date(),
					},
				];
				persistSessionMessages(finalSessionId, finalMessages);
			}

			if (
				createdSessionId &&
				pendingNewSessionIdRef.current === createdSessionId
			) {
				pendingNewSessionIdRef.current = null;
			}
		} catch (err: any) {
			const isAbort = err?.name === 'AbortError';
			const errMsg = isAbort
				? ''
				: err?.message || 'Something went wrong. Please try again.';
			setMessages((prev) =>
				prev.map((m) =>
					m.id === aiId ? { ...m, isStreaming: false, content: errMsg } : m,
				),
			);
		} finally {
			if (
				createdSessionId &&
				pendingNewSessionIdRef.current === createdSessionId
			) {
				pendingNewSessionIdRef.current = null;
			}
			setIsStreaming(false);
			setTimeout(() => inputRef.current?.focus(), 50);
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			sendMessage();
		}
	};

	const autoResize = () => {
		const ta = inputRef.current;
		if (!ta) return;
		ta.style.height = 'auto';
		ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
	};

	const handleCopy = (text: string) =>
		navigator.clipboard.writeText(text).catch(console.error);

	// ── Delete session ─────────────────────────────────────────────────────────
	const deleteSession = async () => {
		if (!deleteTarget || isDeleting) return;
		setIsDeleting(true);
		try {
			await fetch(`/api/chat?sessionId=${deleteTarget}`, { method: 'DELETE' });
			updateSessions((prev) => prev.filter((s) => s.id !== deleteTarget));
			if (activeSessionId === deleteTarget) {
				const remaining = sessions.filter((s) => s.id !== deleteTarget);
				setActiveSessionId(remaining[0]?.id ?? null);
				if (remaining.length === 0) setMessages([]);
			}
			setDeleteTarget(null);
		} catch (err) {
			console.error('Failed to delete session:', err);
		} finally {
			setIsDeleting(false);
		}
	};

	// ── Rename session ─────────────────────────────────────────────────────────
	const commitRename = async () => {
		if (!renameTarget || !renameValue.trim()) {
			setRenameTarget(null);
			return;
		}
		const newTitle = renameValue.trim();
		updateSessions((prev) =>
			prev.map((s) => (s.id === renameTarget ? { ...s, title: newTitle } : s)),
		);
		setRenameTarget(null);
		fetch('/api/chat', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ sessionId: renameTarget, title: newTitle }),
		}).catch(console.error);
	};

	const grouped = groupSessionsByDate(sessions);
	const isInputEmpty = input.trim().length === 0;
	const showEmpty = !messagesLoading && messages.length === 0;

	return (
		<>
			{/* ── Page header ─────────────────────────────────────────────────── */}
			<div className="mb-4 px-2">
				<h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
					Messages
					<span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-md bg-primary/10 text-primary">
						<Sparkles size={11} />
						AI Study Assistant
					</span>
				</h1>
				<p className="text-sm text-muted-foreground mt-0.5">
					Chat with your personal AI across multiple conversations
				</p>
			</div>

			{/* ── Shell ───────────────────────────────────────────────────────── */}
			<div
				className="relative flex rounded-xl border border-border bg-background overflow-hidden"
				style={{ height: 'calc(100vh - 210px)', minHeight: '540px' }}
			>
				{/* Mobile & Tablet Backdrop */}
				<div
					className={`absolute inset-0 z-30 bg-background/60 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
						sidebarOpen
							? 'opacity-100 visible'
							: 'opacity-0 invisible pointer-events-none'
					}`}
					onClick={() => setSidebarOpen(false)}
					aria-hidden="true"
				/>

				{/* ── Sidebar ─────────────────────────────────────────────────── */}
				<aside
					className={`absolute inset-y-0 left-0 z-40 flex flex-col border-r border-border bg-background/95 lg:bg-muted/20 backdrop-blur-xl transition-transform duration-300 w-[280px] lg:w-64 shadow-2xl lg:shadow-none
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
				>
					{/* Sidebar header */}
					<div className="flex items-center justify-between px-3 py-3 border-b border-border shrink-0">
						<span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
							Conversations
						</span>
						<button
							type="button"
							onClick={startNewChat}
							className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground
                hover:text-foreground hover:bg-muted transition-colors"
							aria-label="New conversation"
						>
							<Plus size={15} />
						</button>
					</div>

					{/* Session list */}
					<div
						className="flex-1 overflow-y-auto py-1
            [&::-webkit-scrollbar]:w-1
            [&::-webkit-scrollbar-track]:bg-transparent
            [&::-webkit-scrollbar-thumb]:bg-border
            [&::-webkit-scrollbar-thumb]:rounded-full"
					>
						{sessionsLoading ? (
							<div className="flex flex-col gap-1 p-2">
								{[80, 65, 90, 55].map((w, i) => (
									<div
										key={i}
										className="h-9 rounded-lg bg-muted animate-pulse"
										style={{ width: `${w}%` }}
									/>
								))}
							</div>
						) : sessions.length === 0 ? (
							<div className="flex flex-col items-center justify-center h-full gap-2 px-4 py-8 text-center">
								<MessageSquare size={24} className="text-muted-foreground/40" />
								<p className="text-xs text-muted-foreground">
									No conversations yet. Start chatting!
								</p>
							</div>
						) : (
							<div className="px-2 py-1">
								{grouped.map((group) => (
									<div key={group.label} className="mb-3">
										<p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
											{group.label}
										</p>
										{group.items.map((session) => (
											<div
												key={session.id}
												className="relative"
												onMouseEnter={() => setHoveredSession(session.id)}
												onMouseLeave={() => setHoveredSession(null)}
											>
												{renameTarget === session.id ? (
													<input
														autoFocus
														value={renameValue}
														onChange={(e) => setRenameValue(e.target.value)}
														onBlur={commitRename}
														onKeyDown={(e) => {
															if (e.key === 'Enter') commitRename();
															if (e.key === 'Escape') setRenameTarget(null);
														}}
														className="w-full px-2.5 py-2 text-xs rounded-lg bg-background border border-primary/50
                              text-foreground outline-none"
													/>
												) : (
													<button
														type="button"
														onClick={() => {
															setActiveSessionId(session.id);
															if (window.innerWidth < 1024)
																setSidebarOpen(false);
														}}
														className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition-colors truncate pr-14
                              ${
																activeSessionId === session.id
																	? 'bg-primary/10 text-primary font-medium'
																	: 'text-foreground/80 hover:bg-muted hover:text-foreground'
															}`}
													>
														{session.title}
													</button>
												)}

												{/* Hover actions */}
												{hoveredSession === session.id &&
													renameTarget !== session.id && (
														<div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
															<button
																type="button"
																onClick={(e) => {
																	e.stopPropagation();
																	setRenameTarget(session.id);
																	setRenameValue(session.title);
																}}
																aria-label="Rename"
																className="w-6 h-6 rounded-md flex items-center justify-center
                                text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
															>
																<Pencil size={11} />
															</button>
															<button
																type="button"
																onClick={(e) => {
																	e.stopPropagation();
																	setDeleteTarget(session.id);
																}}
																aria-label="Delete"
																className="w-6 h-6 rounded-md flex items-center justify-center
                                text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
															>
																<Trash2 size={11} />
															</button>
														</div>
													)}
											</div>
										))}
									</div>
								))}
							</div>
						)}
					</div>
				</aside>

				{/* ── Main chat area ───────────────────────────────────────────── */}
				<div
					className={`flex flex-col flex-1 w-full h-full min-w-0 transition-all duration-300 ${
						sidebarOpen ? 'lg:pl-64' : 'pl-0'
					}`}
				>
					{/* Chat top bar */}
					<div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-background shrink-0">
						<button
							type="button"
							onClick={() => setSidebarOpen((p) => !p)}
							aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
							className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground
                hover:text-foreground hover:bg-muted transition-colors shrink-0"
						>
							{sidebarOpen ? (
								<PanelLeftClose size={16} />
							) : (
								<PanelLeftOpen size={16} />
							)}
						</button>

						<div className="flex items-center gap-2.5 min-w-0">
							<div className="relative shrink-0">
								<div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
									<Bot size={14} />
								</div>
								<span className="absolute -bottom-px -right-px w-2 h-2 bg-emerald-500 rounded-full border border-background" />
							</div>
							<div className="min-w-0">
								<p className="text-sm font-semibold text-foreground leading-none truncate">
									{sessions.find((s) => s.id === activeSessionId)?.title ??
										'Study Assistant'}
								</p>
								<p className="text-[11px] text-emerald-600 dark:text-emerald-400 leading-none mt-0.5">
									Online
								</p>
							</div>
						</div>

						<div className="ml-auto">
							<button
								type="button"
								onClick={startNewChat}
								className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium
                  border border-border text-muted-foreground bg-muted/40
                  hover:text-foreground hover:bg-muted hover:border-border/80 transition-all"
							>
								<Plus size={13} />
								<span className="hidden sm:inline">New chat</span>
							</button>
						</div>
					</div>

					{/* Messages */}
					<div
						ref={scrollRef}
						className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 flex flex-col gap-5 relative
              [&::-webkit-scrollbar]:w-1
              [&::-webkit-scrollbar-track]:bg-transparent
              [&::-webkit-scrollbar-thumb]:bg-border
              [&::-webkit-scrollbar-thumb]:rounded-full"
					>
						{messagesLoading ? (
							<SkeletonMessages />
						) : showEmpty ? (
							<EmptyState onPrompt={(p) => sendMessage(p)} />
						) : (
							<>
								{messages.map((msg) => (
									<MessageBubble
										key={msg.id}
										message={msg}
										userAvatar={userAvatar}
										userName={userName}
									/>
								))}
								<div ref={bottomRef} />
							</>
						)}
					</div>

					{/* Scroll to bottom */}
					{showScrollBtn && !showEmpty && (
						<button
							type="button"
							onClick={() => scrollToBottom()}
							aria-label="Scroll to latest message"
							className="absolute bottom-24 right-6 w-8 h-8 rounded-full border border-border
                bg-background shadow-sm flex items-center justify-center text-muted-foreground
                hover:text-foreground transition-all z-10"
						>
							<ChevronDown size={15} />
						</button>
					)}

					{/* ── Composer ──────────────────────────────────────────────── */}
					<div className="shrink-0 px-4 pb-4 pt-2 bg-background border-t border-border z-10">
						<div
							className={`flex flex-col rounded-2xl border transition-all duration-200
                ${
									isFocused
										? 'border-primary/40 shadow-[0_0_0_3px_hsl(var(--primary)/0.07)]'
										: 'border-border hover:border-border/80 bg-muted/20'
								}`}
						>
							<textarea
								ref={inputRef}
								rows={1}
								value={input}
								onChange={(e) => {
									setInput(e.target.value);
									autoResize();
								}}
								onKeyDown={handleKeyDown}
								onFocus={() => setIsFocused(true)}
								onBlur={() => setIsFocused(false)}
								disabled={isStreaming}
								placeholder={
									activeSessionId
										? 'Continue the conversation…'
										: 'Start a new conversation…'
								}
								aria-label="Message input"
								className="w-full resize-none bg-transparent border-none outline-none
                  text-sm text-foreground placeholder:text-muted-foreground/50
                  px-4 pt-3.5 pb-1 min-h-[44px] max-h-[160px] leading-relaxed
                  disabled:cursor-not-allowed
                  [&::-webkit-scrollbar]:w-1
                  [&::-webkit-scrollbar-thumb]:bg-border
                  [&::-webkit-scrollbar-thumb]:rounded-full"
							/>

							<div className="flex items-center justify-between px-3 pb-2.5 pt-1 gap-2">
								<span className="text-[11px] text-muted-foreground/40 select-none">
									{isStreaming ? (
										'Generating response…'
									) : (
										<span className="hidden sm:inline">
											Press{' '}
											<kbd className="font-sans border border-border/70 rounded px-1 py-px text-[10px]">
												↵
											</kbd>{' '}
											to send
										</span>
									)}
								</span>

								<div className="flex items-center gap-1.5 ml-auto">
									{isStreaming ? (
										<button
											type="button"
											onClick={() => abortRef.current?.abort()}
											aria-label="Stop generating"
											className="flex items-center gap-1.5 h-7 px-3 rounded-lg text-xs font-medium
                        border border-destructive/40 text-destructive bg-destructive/5
                        hover:bg-destructive/10 transition-colors"
										>
											<Square size={10} strokeWidth={2.5} />
											Stop
										</button>
									) : (
										<button
											type="button"
											onClick={() => sendMessage()}
											disabled={isInputEmpty}
											aria-label="Send message"
											className={`flex items-center gap-1.5 h-7 px-3.5 rounded-lg text-xs font-medium transition-all duration-150
                        ${
													isInputEmpty
														? 'text-muted-foreground/30 cursor-default'
														: 'bg-primary text-primary-foreground hover:opacity-90 active:scale-95 shadow-sm'
												}`}
										>
											<Send size={12} strokeWidth={2.5} />
											<span className="hidden sm:inline">Send</span>
										</button>
									)}
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* ── Delete dialog ─────────────────────────────────────────────────── */}
			<Dialog
				open={!!deleteTarget}
				onOpenChange={(o) => {
					if (!o) setDeleteTarget(null);
				}}
			>
				<DialogContent className="max-w-sm">
					<DialogHeader>
						<DialogTitle>Delete conversation?</DialogTitle>
					</DialogHeader>
					<p className="text-sm text-muted-foreground">
						This will permanently delete this conversation and all its messages.
						This cannot be undone.
					</p>
					<DialogFooter className="flex flex-wrap gap-2 sm:justify-end">
						<Button
							type="button"
							variant="outline"
							onClick={() => setDeleteTarget(null)}
							disabled={isDeleting}
						>
							Cancel
						</Button>
						<Button
							type="button"
							variant="destructive"
							onClick={deleteSession}
							disabled={isDeleting}
						>
							{isDeleting ? 'Deleting…' : 'Delete'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}

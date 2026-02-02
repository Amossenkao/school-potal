'use client';
import React, { useState, useRef, useEffect } from 'react';
import { MoreHorizontal, Send, Smile, Bot, MessageCircle } from 'lucide-react';
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

// INTERFACES
interface Contact {
	id: string;
	name: string;
	role: string;
	department?: string;
	isOnline: boolean;
	lastSeen?: string;
	type: 'teacher' | 'admin' | 'ai';
}

interface Message {
	id: string;
	senderId: string;
	content: string;
	timestamp: string;
	type: 'text';
	isRead: boolean;
	isTyping?: boolean;
}

interface Chat {
	id: string;
	contact: Contact;
	lastMessage: Message;
	isPinned: boolean;
}

// CONSTANTS
const CONTACTS: Contact[] = [
	{
		id: 'ai-assistant',
		name: 'Study Assistant',
		role: 'AI Helper',
		department: 'Academic Support',
		isOnline: true,
		type: 'ai',
	},
];

const CHATS: Chat[] = [
	{
		id: 'ai-assistant',
		contact: CONTACTS.find((c) => c.id === 'ai-assistant')!,
		lastMessage: {
			id: 'last-ai',
			senderId: 'ai-assistant',
			content: 'How can I help you?',
			timestamp: 'now',
			type: 'text',
			isRead: true,
		},
		isPinned: true,
	},
];

const initialAiMessage: Message = {
	id: 'ai-msg-initial',
	senderId: 'ai-assistant',
	content: "Hello! I'm your AI study assistant. How can I help you today?",
	timestamp: 'Just now',
	type: 'text',
	isRead: true,
};

// MAIN COMPONENT
export default function SchoolMessages() {
	const { user } = useAuth();
	const [selectedChat] = useState<Chat | null>(CHATS[0]);
	const [newMessage, setNewMessage] = useState('');
	const [messages, setMessages] = useState<Message[]>([initialAiMessage]);
	const [isLoading, setIsLoading] = useState(false);
	const [isHistoryLoading, setIsHistoryLoading] = useState(true);
	const [showEmojiPicker, setShowEmojiPicker] = useState(false);
	const [showMenu, setShowMenu] = useState(false);
	const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);
	const [isClearing, setIsClearing] = useState(false);
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const emojiPickerRef = useRef<HTMLDivElement>(null);
	const menuRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
	});

	useEffect(() => {
		inputRef.current?.focus();
	}, []);

	useEffect(() => {
		if (!showEmojiPicker) return;
		const handleClickOutside = (event: MouseEvent) => {
			if (
				emojiPickerRef.current &&
				!emojiPickerRef.current.contains(event.target as Node)
			) {
				setShowEmojiPicker(false);
			}
		};
		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, [showEmojiPicker]);

	useEffect(() => {
		if (!showMenu) return;
		const handleClickOutside = (event: MouseEvent) => {
			if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
				setShowMenu(false);
			}
		};
		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, [showMenu]);

	useEffect(() => {
		let isMounted = true;
		const cacheKey = `chat:history:${user?.id || user?.username || 'me'}`;
		const loadChatHistory = async () => {
			setIsHistoryLoading(true);
			try {
				const cached = getClientCache<Message[]>(cacheKey);
				if (cached && cached.length > 0) {
					setMessages(cached);
					setIsHistoryLoading(false);
					return;
				}

				const res = await fetch('/api/chat');
				if (!res.ok) throw new Error('Failed to load chat history');
				const data = await res.json();
				const history = Array.isArray(data?.messages) ? data.messages : [];
				if (!isMounted) return;

				if (history.length === 0) {
					const greetingName = user?.firstName ? ` ${user.firstName}` : '';
					const greeting = [
						{
							...initialAiMessage,
							content: `Hello${greetingName}! I'm your AI study assistant. How can I help you today?`,
						},
					];
					setMessages(greeting);
					setClientCache(cacheKey, greeting);
				} else {
					const mapped: Message[] = history.map((msg: any, index: number) => ({
						id: `history-${index}-${new Date(msg.timestamp).getTime()}`,
						senderId: msg.sender === 'assistant' ? 'ai-assistant' : 'current-user',
						content: msg.content,
						timestamp: new Date(msg.timestamp).toLocaleTimeString([], {
							hour: '2-digit',
							minute: '2-digit',
						}),
						type: 'text',
						isRead: true,
					}));
					setMessages(mapped);
					setClientCache(cacheKey, mapped);
				}
			} catch (error) {
				console.error('Failed to load chat history:', error);
			} finally {
				if (isMounted) setIsHistoryLoading(false);
			}
		};

		if (selectedChat?.id === 'ai-assistant') {
			loadChatHistory();
		}

		return () => {
			isMounted = false;
		};
	}, [selectedChat?.id, user?.firstName, user?.id, user?.username]);

	const handleSendMessage = async () => {
		if (!newMessage.trim() || !selectedChat || isLoading) return;

		const userMessage: Message = {
			id: `msg-${Date.now()}`,
			senderId: 'current-user',
			content: newMessage.trim(),
			timestamp: 'now',
			type: 'text',
			isRead: true,
		};

		setMessages((prev) => [...prev, userMessage]);
		const currentInput = newMessage.trim();
		setNewMessage('');
		setIsLoading(true);

		const aiResponseId = `ai-response-${Date.now()}`;
		const aiPlaceholder: Message = {
			id: aiResponseId,
			senderId: 'ai-assistant',
			content: '',
			timestamp: 'now',
			type: 'text',
			isRead: false,
			isTyping: true,
		};
		setMessages((prev) => [...prev, aiPlaceholder]);

		try {
			const res = await fetch('/api/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ prompt: currentInput }),
			});
			if (!res.ok) throw new Error('Failed to fetch AI response');
			const data = await res.json();
			const responseText =
				typeof data?.text === 'string' && data.text.trim().length > 0
					? data.text
					: 'Sorry, I could not generate a response.';
			const cacheKey = `chat:history:${user?.id || user?.username || 'me'}`;
			setMessages((prev) => {
				const next = prev.map((msg) =>
					msg.id === aiResponseId
						? {
								...msg,
								content: responseText,
								isTyping: false,
								isRead: true,
						  }
						: msg,
				);
				setClientCache(cacheKey, next);
				return next;
			});
			setIsLoading(false);
		} catch (error) {
			console.error('Error fetching AI response:', error);
			setMessages((prev) =>
				prev.map((msg) =>
					msg.id === aiResponseId
						? {
								...msg,
								content: 'Sorry, I ran into an error. Please try again.',
								isTyping: false,
						  }
						: msg,
				),
			);
			setIsLoading(false);
		}
	};

	const handleKeyPress = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSendMessage();
		}
	};

	const formatTime = (timestamp: string) =>
		timestamp.toLowerCase() === 'now' || timestamp.toLowerCase() === 'just now'
			? 'Just now'
			: timestamp;

	const emojiOptions = [
		'😀',
		'😅',
		'😊',
		'😎',
		'🤔',
		'😴',
		'🎯',
		'📚',
		'✅',
		'🔥',
		'✨',
		'💡',
		'🧠',
		'📝',
		'📅',
		'📌',
		'📎',
		'🧩',
		'🎉',
		'👍',
		'🙌',
		'💪',
		'🚀',
		'⏳',
		'📈',
		'🎓',
		'🔍',
		'💬',
		'🧾',
		'🗓️',
	];

	const insertEmoji = (emoji: string) => {
		setNewMessage((prev) => `${prev}${emoji}`);
		setShowEmojiPicker(false);
	};

	const handleCopyMessage = async (content: string) => {
		try {
			await navigator.clipboard.writeText(content);
		} catch (error) {
			console.error('Failed to copy message:', error);
		}
	};

	const normalizePlainText = (input: string) =>
		input
			.replace(/```[\s\S]*?```/g, '')
			.replace(/`([^`]+)`/g, '$1')
			.replace(/\*\*(.*?)\*\*/g, '$1')
			.replace(/__(.*?)__/g, '$1')
			.replace(/\*(.*?)\*/g, '$1')
			.replace(/_(.*?)_/g, '$1')
			.replace(/~~(.*?)~~/g, '$1')
			.replace(/^\s*#{1,6}\s+/gm, '')
			.replace(/^\s*[-*+]\s+/gm, '')
			.replace(/^\s*\d+\.\s+/gm, '')
			.replace(/^\s*>\s?/gm, '')
			.replace(/\n{3,}/g, '\n\n')
			.trim();

	const handleClearChat = async () => {
		if (isClearing) return;
		setIsClearing(true);
		try {
			const res = await fetch('/api/chat', { method: 'DELETE' });
			if (!res.ok) throw new Error('Failed to clear chat');
			const greetingName = user?.firstName ? ` ${user.firstName}` : '';
			const resetMessages = [
				{
					...initialAiMessage,
					content: `Hello${greetingName}! I'm your AI study assistant. How can I help you today?`,
				},
			];
			setMessages(resetMessages);
			const cacheKey = `chat:history:${user?.id || user?.username || 'me'}`;
			setClientCache(cacheKey, resetMessages);
			setIsClearDialogOpen(false);
			setShowMenu(false);
		} catch (error) {
			console.error('Failed to clear chat:', error);
		} finally {
			setIsClearing(false);
		}
	};

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex justify-between items-center">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">Messages</h1>
					<p className="text-muted-foreground">
						Get help from your AI study assistant
					</p>
				</div>
			</div>

			<div className="rounded-lg border bg-card text-card-foreground shadow-sm flex flex-col overflow-hidden h-[calc(100vh-200px)]">
				{selectedChat ? (
					<>
						{/* Chat Header */}
					<div className="flex items-center justify-between p-4 border-b">
						<div className="flex items-center gap-3">
							<div className="relative">
								<div className="relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full bg-primary/10">
									<div className="flex h-full w-full items-center justify-center rounded-full text-primary bg-primary/20">
										<Bot className="h-4 w-4" />
									</div>
								</div>
								{selectedChat.contact.isOnline && (
									<div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background"></div>
								)}
							</div>
							<div>
								<h3 className="font-semibold">
									{selectedChat.contact.name}
								</h3>
								<p className="text-sm text-muted-foreground">
									{selectedChat.contact.isOnline
										? 'Online'
										: selectedChat.contact.lastSeen}
								</p>
							</div>
						</div>
						<div className="relative flex items-center gap-2" ref={menuRef}>
							<button
								type="button"
								className="inline-flex items-center justify-center p-0 h-8 w-8 rounded-md hover:bg-accent"
								onClick={() => setShowMenu((prev) => !prev)}
							>
								<MoreHorizontal className="h-4 w-4" />
							</button>
							{showMenu ? (
								<div className="absolute right-0 top-10 z-20 w-40 rounded-lg border bg-popover shadow-lg">
									<button
										type="button"
										className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
										onClick={() => {
											setShowMenu(false);
											setIsClearDialogOpen(true);
										}}
									>
										Clear chat
									</button>
								</div>
							) : null}
						</div>
					</div>

						{/* Messages */}
						<div className="flex-1 overflow-y-auto p-4 space-y-4">
							{isHistoryLoading ? (
								<div className="space-y-4">
									<div className="h-10 w-3/4 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800" />
									<div className="h-10 w-1/2 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800 ml-auto" />
									<div className="h-10 w-2/3 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800" />
									<div className="h-10 w-1/3 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800 ml-auto" />
								</div>
							) : (
								<>
									{messages.map((message) => {
										const isCurrentUser = message.senderId === 'current-user';
										return (
											<div
												key={message.id}
												className={`flex gap-3 ${
													isCurrentUser ? 'justify-end' : 'justify-start'
												}`}
											>
												{!isCurrentUser && (
													<div className="relative flex h-8 w-8 shrink-0 overflow-hidden rounded-full bg-primary/10">
														<div className="flex h-full w-full items-center justify-center rounded-full text-primary bg-primary/20">
															<Bot className="h-3 w-3" />
														</div>
													</div>
												)}
												<div
													className={`max-w-[70%] ${
														isCurrentUser ? 'order-first' : ''
													}`}
												>
													<div
														className={`px-4 py-2 rounded-2xl ${
															isCurrentUser
																? 'bg-primary text-primary-foreground'
																: 'bg-primary/10 text-foreground'
														}`}
													>
													{message.isTyping && !message.content ? (
														<div className="typing-indicator">
															<span></span>
															<span></span>
															<span></span>
														</div>
													) : (
														<div className="group relative">
															<p className="text-sm whitespace-pre-wrap">
																{normalizePlainText(message.content)}
															</p>
															<button
																type="button"
																className={`absolute -top-2 ${
																	isCurrentUser ? 'right-0' : 'left-0'
																} rounded-md border border-transparent bg-background/80 px-2 py-1 text-[10px] text-muted-foreground opacity-0 shadow-sm transition-opacity group-hover:opacity-100`}
																onClick={() =>
																	handleCopyMessage(
																		normalizePlainText(message.content)
																	)
																}
															>
																Copy
															</button>
														</div>
													)}
													</div>
													<p
														className={`text-xs text-muted-foreground mt-1 ${
															isCurrentUser ? 'text-right' : 'text-left'
														}`}
													>
														{formatTime(message.timestamp)}
													</p>
												</div>
											</div>
										);
									})}
									<div ref={messagesEndRef} />
								</>
							)}
						</div>

						{/* Message Input */}
						<div className="border-t p-4">
							<div className="flex items-end gap-2">
								<div className="flex-1 relative">
									<input
										ref={inputRef}
										className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm pr-10"
										placeholder="Ask the AI assistant anything..."
										value={newMessage}
										onChange={(e) => setNewMessage(e.target.value)}
										onKeyPress={handleKeyPress}
										disabled={isLoading}
									/>
									<button
										type="button"
										className="absolute right-1 top-1/2 -translate-y-1/2 p-0 h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-accent"
										disabled={isLoading}
										onClick={() => setShowEmojiPicker((prev) => !prev)}
									>
										<Smile className="h-4 w-4" />
									</button>
									{showEmojiPicker ? (
										<div
											ref={emojiPickerRef}
											className="absolute bottom-12 right-0 z-20 w-44 rounded-xl border bg-popover p-2 shadow-lg"
										>
											<div className="grid grid-cols-5 gap-1">
												{emojiOptions.map((emoji) => (
													<button
														key={emoji}
														type="button"
														className="h-8 w-8 rounded-md text-lg hover:bg-muted"
														onClick={() => insertEmoji(emoji)}
													>
														{emoji}
													</button>
												))}
											</div>
										</div>
									) : null}
								</div>
								<button
									onClick={handleSendMessage}
									disabled={!newMessage.trim() || isLoading}
									className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
								>
									<Send className="h-4 w-4" />
								</button>
							</div>
						</div>
					</>
				) : (
					<div className="flex-1 flex items-center justify-center p-6 text-center">
						<div>
							<MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
							<h3 className="text-lg font-semibold">Select a conversation</h3>
							<p className="text-muted-foreground">
								Choose a contact to start messaging.
							</p>
						</div>
					</div>
				)}
			</div>
			<Dialog
				open={isClearDialogOpen}
				onOpenChange={(open) => setIsClearDialogOpen(open)}
			>
				<DialogContent className="max-w-sm">
					<DialogHeader>
						<DialogTitle>Clear chat?</DialogTitle>
					</DialogHeader>
					<p className="text-sm text-muted-foreground">
						This will permanently remove your conversation history with the AI.
					</p>
					<DialogFooter className="flex flex-wrap gap-2 sm:justify-end">
						<Button
							type="button"
							variant="outline"
							onClick={() => setIsClearDialogOpen(false)}
							disabled={isClearing}
						>
							Cancel
						</Button>
						<Button
							type="button"
							variant="destructive"
							onClick={handleClearChat}
							disabled={isClearing}
						>
							{isClearing ? 'Clearing...' : 'Clear chat'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

'use client';
import React, { useState, useRef, useEffect } from 'react';
import {
	Search,
	MoreHorizontal,
	Send,
	Paperclip,
	Smile,
	Phone,
	Video,
	Bot,
	GraduationCap,
	Users,
	MessageCircle,
	Star,
} from 'lucide-react';

// Included directly in this file as requested.
const Typewriter: React.FC<{ text: string; speed?: number }> = ({
	text,
	speed = 1,
}) => {
	const [displayedText, setDisplayedText] = useState('');

	useEffect(() => {
		setDisplayedText(''); // Reset when text prop changes
		let i = 0;
		const intervalId = setInterval(() => {
			if (i < text.length) {
				setDisplayedText((prev) => prev + text.charAt(i));
				i++;
			} else {
				clearInterval(intervalId);
			}
		}, speed);

		return () => clearInterval(intervalId); // Cleanup on unmount
	}, [text, speed]);

	return (
		<p className="text-sm" style={{ whiteSpace: 'pre-wrap' }}>
			{displayedText}
		</p>
	);
};

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
	const [selectedChat, setSelectedChat] = useState<Chat | null>(CHATS[0]);
	const [searchQuery, setSearchQuery] = useState('');
	const [newMessage, setNewMessage] = useState('');
	const [messages, setMessages] = useState<Message[]>([initialAiMessage]);
	const [isLoading, setIsLoading] = useState(false);
	const messagesEndRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
	});

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
			const response = await fetch('/api/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ prompt: currentInput }),
			});

			if (!response.ok) throw new Error('API request failed');
			const { text } = await response.json();

			setMessages((prev) =>
				prev.map((msg) =>
					msg.id === aiResponseId
						? { ...msg, content: text, isTyping: false, isRead: true }
						: msg
				)
			);
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
						: msg
				)
			);
		} finally {
			setIsLoading(false);
		}
	};

	const filteredChats = CHATS.filter((chat) =>
		chat.contact.name.toLowerCase().includes(searchQuery.toLowerCase())
	);

	const getContactIcon = (type: string) => {
		if (type === 'ai') return <Bot className="h-4 w-4" />;
		if (type === 'teacher') return <GraduationCap className="h-4 w-4" />;
		return <Users className="h-4 w-4" />;
	};

	const getContactInitials = (name: string) =>
		name
			.split(' ')
			.map((n) => n[0])
			.join('')
			.toUpperCase();

	const handleKeyPress = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSendMessage();
		}
	};

	const handleChatSelect = (chat: Chat) => {
		setSelectedChat(chat);
		setMessages(chat.id === 'ai-assistant' ? [initialAiMessage] : []);
	};

	const formatTime = (timestamp: string) =>
		timestamp.toLowerCase() === 'now' || timestamp.toLowerCase() === 'just now'
			? 'Just now'
			: timestamp;

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
				<button className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
					<MessageCircle className="mr-2 h-4 w-4" /> New Message
				</button>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
				{/* Chat List */}
				<div className="lg:col-span-1 rounded-lg border bg-card text-card-foreground shadow-sm">
					<div className="flex flex-col space-y-1.5 p-6 pb-3">
						<div className="flex items-center justify-between">
							<h3 className="text-lg font-semibold">AI Assistant</h3>
							<button className="inline-flex items-center justify-center p-0 h-8 w-8 rounded-md hover:bg-accent">
								<MoreHorizontal className="h-4 w-4" />
							</button>
						</div>
						<div className="relative">
							<Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
							<input
								className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm pl-8"
								placeholder="Search conversations..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
							/>
						</div>
					</div>
					<div className="p-0">
						<div className="space-y-1">
							{filteredChats.map((chat) => (
								<div
									key={chat.id}
									className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors ${
										selectedChat?.id === chat.id ? 'bg-muted' : ''
									}`}
									onClick={() => handleChatSelect(chat)}
								>
									<div className="relative">
										<div
											className={`relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full ${
												chat.contact.type === 'ai'
													? 'bg-primary/10'
													: 'bg-muted'
											}`}
										>
											<div
												className={`flex h-full w-full items-center justify-center rounded-full text-sm font-medium ${
													chat.contact.type === 'ai'
														? 'bg-primary/20 text-primary'
														: 'bg-muted text-muted-foreground'
												}`}
											>
												{chat.contact.type === 'ai' ? (
													<Bot className="h-4 w-4" />
												) : (
													getContactInitials(chat.contact.name)
												)}
											</div>
										</div>
										{chat.contact.isOnline && (
											<div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background"></div>
										)}
									</div>
									<div className="flex-1 min-w-0">
										<div className="flex items-center justify-between">
											<p className="font-medium truncate">
												{chat.contact.name}
											</p>
											<span className="text-xs text-muted-foreground">
												{chat.lastMessage.timestamp}
											</span>
										</div>
										<p className="text-sm text-muted-foreground truncate">
											{chat.contact.role}
										</p>
										<p
											className="text-sm text-muted-foreground truncate"
											style={{ whiteSpace: 'pre-wrap' }}
										>
											{chat.lastMessage.content}
										</p>
									</div>
									{chat.isPinned && (
										<Star className="h-3 w-3 text-yellow-500 fill-current self-start mt-1" />
									)}
								</div>
							))}
						</div>
					</div>
				</div>

				{/* Chat Window */}
				<div className="lg:col-span-2 rounded-lg border bg-card text-card-foreground shadow-sm flex flex-col overflow-hidden">
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
								<div className="flex items-center gap-2">
									<button className="inline-flex items-center justify-center p-0 h-8 w-8 rounded-md hover:bg-accent">
										<Phone className="h-4 w-4" />
									</button>
									<button className="inline-flex items-center justify-center p-0 h-8 w-8 rounded-md hover:bg-accent">
										<Video className="h-4 w-4" />
									</button>
									<button className="inline-flex items-center justify-center p-0 h-8 w-8 rounded-md hover:bg-accent">
										<MoreHorizontal className="h-4 w-4" />
									</button>
								</div>
							</div>

							{/* Messages */}
							<div className="flex-1 overflow-y-auto p-4 space-y-4">
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
													{message.isTyping ? (
														<div className="typing-indicator">
															<span></span>
															<span></span>
															<span></span>
														</div>
													) : !isCurrentUser ? (
														<Typewriter
															text={message.content.replaceAll(/[*#]/gi, '')}
														/>
													) : (
														<p className="text-sm">{message.content}</p>
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
							</div>

							{/* Message Input */}
							<div className="border-t p-4">
								<div className="flex items-end gap-2">
									<button
										className="inline-flex items-center justify-center p-0 h-8 w-8 rounded-md hover:bg-accent"
										disabled={isLoading}
									>
										<Paperclip className="h-4 w-4" />
									</button>
									<div className="flex-1 relative">
										<input
											className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm pr-10"
											placeholder="Ask the AI assistant anything..."
											value={newMessage}
											onChange={(e) => setNewMessage(e.target.value)}
											onKeyPress={handleKeyPress}
											disabled={isLoading}
										/>
										<button
											className="absolute right-1 top-1/2 -translate-y-1/2 p-0 h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-accent"
											disabled={isLoading}
										>
											<Smile className="h-4 w-4" />
										</button>
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
			</div>
		</div>
	);
}

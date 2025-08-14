'use client';
import React, { useState, useRef, useEffect } from 'react';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
	Search,
	MoreHorizontal,
	Send,
	Paperclip,
	Smile,
	Phone,
	Video,
	Info,
	UserPlus,
	Archive,
	Trash2,
	Star,
	MessageCircle,
	Calendar,
} from 'lucide-react';

interface User {
	id: string;
	name: string;
	role: string;
	avatar?: string;
	isOnline: boolean;
	lastSeen?: string;
}

interface Message {
	id: string;
	senderId: string;
	content: string;
	timestamp: string;
	type: 'text' | 'image' | 'file';
	isRead: boolean;
}

interface Chat {
	id: string;
	participants: User[];
	lastMessage: Message;
	unreadCount: number;
	isPinned: boolean;
	isArchived: boolean;
	type: 'direct' | 'group';
	groupName?: string;
}

const USERS: User[] = [
	{
		id: '1',
		name: 'Kaiya George',
		role: 'Project Manager',
		isOnline: true,
		avatar: '/api/placeholder/40/40',
	},
	{
		id: '2',
		name: 'Lindsey Curtis',
		role: 'Designer',
		isOnline: true,
		avatar: '/api/placeholder/40/40',
	},
	{
		id: '3',
		name: 'Zain Geidt',
		role: 'Content Writer',
		isOnline: true,
		avatar: '/api/placeholder/40/40',
	},
	{
		id: '4',
		name: 'Carla George',
		role: 'Front-end Developer',
		isOnline: false,
		lastSeen: '2 days ago',
		avatar: '/api/placeholder/40/40',
	},
	{
		id: '5',
		name: 'Abram Schleifer',
		role: 'Digital Marketer',
		isOnline: true,
		avatar: '/api/placeholder/40/40',
	},
	{
		id: '6',
		name: 'Lincoln Donin',
		role: 'Product Manager',
		isOnline: false,
		lastSeen: '3 days ago',
		avatar: '/api/placeholder/40/40',
	},
];

const SAMPLE_MESSAGES: { [chatId: string]: Message[] } = {
	'chat-2': [
		{
			id: 'msg1',
			senderId: '2',
			content: 'I want to make an appointment tomorrow from 2:00 to 5:00pm?',
			timestamp: '2 hours ago',
			type: 'text',
			isRead: true,
		},
		{
			id: 'msg2',
			senderId: 'current-user',
			content: "If don't like something, I'll stay away from it.",
			timestamp: '2 hours ago',
			type: 'text',
			isRead: true,
		},
		{
			id: 'msg3',
			senderId: '2',
			content: 'I want more detailed information.',
			timestamp: '2 hours ago',
			type: 'text',
			isRead: true,
		},
		{
			id: 'msg4',
			senderId: 'current-user',
			content: "If don't like something, I'll stay away from it.",
			timestamp: '2 hours ago',
			type: 'text',
			isRead: true,
		},
		{
			id: 'msg5',
			senderId: 'current-user',
			content: 'They got there early, and got really good seats.',
			timestamp: '2 hours ago',
			type: 'text',
			isRead: true,
		},
	],
};

const CHATS: Chat[] = [
	{
		id: 'chat-1',
		participants: [USERS[0]],
		lastMessage: {
			id: 'last1',
			senderId: '1',
			content: "Hey, how's the project going?",
			timestamp: '15 mins',
			type: 'text',
			isRead: false,
		},
		unreadCount: 2,
		isPinned: false,
		isArchived: false,
		type: 'direct',
	},
	{
		id: 'chat-2',
		participants: [USERS[1]],
		lastMessage: {
			id: 'last2',
			senderId: '2',
			content: 'I want to make an appointment tomorrow from 2:00 to 5:00pm?',
			timestamp: '30 mins',
			type: 'text',
			isRead: true,
		},
		unreadCount: 0,
		isPinned: true,
		isArchived: false,
		type: 'direct',
	},
	{
		id: 'chat-3',
		participants: [USERS[2]],
		lastMessage: {
			id: 'last3',
			senderId: '3',
			content: 'The content is ready for review',
			timestamp: '45 mins',
			type: 'text',
			isRead: false,
		},
		unreadCount: 1,
		isPinned: false,
		isArchived: false,
		type: 'direct',
	},
	{
		id: 'chat-4',
		participants: [USERS[3]],
		lastMessage: {
			id: 'last4',
			senderId: '4',
			content: 'Thanks for the feedback!',
			timestamp: '2 days',
			type: 'text',
			isRead: true,
		},
		unreadCount: 0,
		isPinned: false,
		isArchived: false,
		type: 'direct',
	},
	{
		id: 'chat-5',
		participants: [USERS[4]],
		lastMessage: {
			id: 'last5',
			senderId: '5',
			content: 'The marketing campaign is live',
			timestamp: '1 hour',
			type: 'text',
			isRead: false,
		},
		unreadCount: 3,
		isPinned: false,
		isArchived: false,
		type: 'direct',
	},
	{
		id: 'chat-6',
		participants: [USERS[5]],
		lastMessage: {
			id: 'last6',
			senderId: '6',
			content: "Let's schedule a meeting",
			timestamp: '3 days',
			type: 'text',
			isRead: true,
		},
		unreadCount: 0,
		isPinned: false,
		isArchived: false,
		type: 'direct',
	},
];

export default function Messages() {
	const [selectedChat, setSelectedChat] = useState<Chat | null>(CHATS[1]); // Default to Lindsey Curtis chat
	const [searchQuery, setSearchQuery] = useState('');
	const [newMessage, setNewMessage] = useState('');
	const [messages, setMessages] = useState<Message[]>(
		SAMPLE_MESSAGES['chat-2'] || []
	);
	const messagesEndRef = useRef<HTMLDivElement>(null);

	const scrollToBottom = () => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
	};

	useEffect(() => {
		scrollToBottom();
	}, [messages]);

	const filteredChats = CHATS.filter((chat) => {
		const participant = chat.participants[0];
		return (
			participant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			participant.role.toLowerCase().includes(searchQuery.toLowerCase())
		);
	});

	const handleSendMessage = () => {
		if (!newMessage.trim() || !selectedChat) return;

		const message: Message = {
			id: `msg-${Date.now()}`,
			senderId: 'current-user',
			content: newMessage.trim(),
			timestamp: 'now',
			type: 'text',
			isRead: true,
		};

		setMessages((prev) => [...prev, message]);
		setNewMessage('');
	};

	const handleKeyPress = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSendMessage();
		}
	};

	const handleChatSelect = (chat: Chat) => {
		setSelectedChat(chat);
		setMessages(SAMPLE_MESSAGES[chat.id] || []);
	};

	const formatTime = (timestamp: string) => {
		if (timestamp === 'now') return 'Just now';
		return timestamp;
	};

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex justify-between items-center">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">Messages</h1>
					<p className="text-muted-foreground">Stay connected with your team</p>
				</div>
				<Button>
					<UserPlus className="mr-2 h-4 w-4" /> New Chat
				</Button>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
				{/* Chat List */}
				<Card className="lg:col-span-1">
					<CardHeader className="pb-3">
						<div className="flex items-center justify-between">
							<CardTitle className="text-lg">Chats</CardTitle>
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button variant="ghost" size="sm">
										<MoreHorizontal className="h-4 w-4" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									<DropdownMenuItem>
										<Archive className="mr-2 h-4 w-4" />
										Archived Chats
									</DropdownMenuItem>
									<DropdownMenuItem>
										<Star className="mr-2 h-4 w-4" />
										Starred Messages
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</div>

						<div className="relative">
							<Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
							<Input
								placeholder="Search..."
								className="pl-8"
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
							/>
						</div>
					</CardHeader>

					<CardContent className="p-0">
						<div className="space-y-1">
							{filteredChats.map((chat) => {
								const participant = chat.participants[0];
								const isSelected = selectedChat?.id === chat.id;

								return (
									<div
										key={chat.id}
										className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors ${
											isSelected ? 'bg-muted' : ''
										}`}
										onClick={() => handleChatSelect(chat)}
									>
										<div className="relative">
											<Avatar>
												<AvatarFallback>
													{participant.name
														.split(' ')
														.map((n) => n[0])
														.join('')}
												</AvatarFallback>
											</Avatar>
											{participant.isOnline && (
												<div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-900"></div>
											)}
										</div>

										<div className="flex-1 min-w-0">
											<div className="flex items-center justify-between">
												<p className="font-medium truncate">
													{participant.name}
												</p>
												<span className="text-xs text-muted-foreground">
													{chat.lastMessage.timestamp}
												</span>
											</div>
											<p className="text-sm text-muted-foreground truncate">
												{participant.role}
											</p>
											<p className="text-sm text-muted-foreground truncate">
												{chat.lastMessage.content}
											</p>
										</div>

										<div className="flex flex-col items-end gap-1">
											{chat.unreadCount > 0 && (
												<Badge className="bg-blue-500 text-white text-xs px-2 py-0.5 min-w-[20px] h-5">
													{chat.unreadCount}
												</Badge>
											)}
											{chat.isPinned && (
												<Star className="h-3 w-3 text-yellow-500 fill-current" />
											)}
										</div>
									</div>
								);
							})}
						</div>
					</CardContent>
				</Card>

				{/* Chat Window */}
				<Card className="lg:col-span-2 flex flex-col">
					{selectedChat ? (
						<>
							{/* Chat Header */}
							<CardHeader className="pb-3 border-b">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-3">
										<div className="relative">
											<Avatar>
												<AvatarFallback>
													{selectedChat.participants[0].name
														.split(' ')
														.map((n) => n[0])
														.join('')}
												</AvatarFallback>
											</Avatar>
											{selectedChat.participants[0].isOnline && (
												<div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-900"></div>
											)}
										</div>
										<div>
											<h3 className="font-semibold">
												{selectedChat.participants[0].name}
											</h3>
											<p className="text-sm text-muted-foreground">
												{selectedChat.participants[0].isOnline
													? 'Online'
													: selectedChat.participants[0].lastSeen}
											</p>
										</div>
									</div>

									<div className="flex items-center gap-2">
										<Button variant="ghost" size="sm">
											<Phone className="h-4 w-4" />
										</Button>
										<Button variant="ghost" size="sm">
											<Video className="h-4 w-4" />
										</Button>
										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<Button variant="ghost" size="sm">
													<MoreHorizontal className="h-4 w-4" />
												</Button>
											</DropdownMenuTrigger>
											<DropdownMenuContent align="end">
												<DropdownMenuItem>
													<Info className="mr-2 h-4 w-4" />
													View Profile
												</DropdownMenuItem>
												<DropdownMenuItem>
													<Calendar className="mr-2 h-4 w-4" />
													Schedule Meeting
												</DropdownMenuItem>
												<DropdownMenuSeparator />
												<DropdownMenuItem>
													<Archive className="mr-2 h-4 w-4" />
													Archive Chat
												</DropdownMenuItem>
												<DropdownMenuItem className="text-red-600">
													<Trash2 className="mr-2 h-4 w-4" />
													Delete Chat
												</DropdownMenuItem>
											</DropdownMenuContent>
										</DropdownMenu>
									</div>
								</div>
							</CardHeader>

							{/* Messages */}
							<CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
								{messages.map((message) => {
									const isCurrentUser = message.senderId === 'current-user';
									const sender = isCurrentUser
										? null
										: selectedChat.participants[0];

									return (
										<div
											key={message.id}
											className={`flex gap-3 ${
												isCurrentUser ? 'justify-end' : 'justify-start'
											}`}
										>
											{!isCurrentUser && (
												<Avatar className="w-8 h-8">
													<AvatarFallback className="text-xs">
														{sender?.name
															.split(' ')
															.map((n) => n[0])
															.join('')}
													</AvatarFallback>
												</Avatar>
											)}

											<div
												className={`max-w-[70%] ${
													isCurrentUser ? 'order-first' : ''
												}`}
											>
												<div
													className={`px-4 py-2 rounded-2xl ${
														isCurrentUser
															? 'bg-blue-500 text-white ml-auto'
															: 'bg-muted'
													}`}
												>
													<p className="text-sm">{message.content}</p>
												</div>
												<p
													className={`text-xs text-muted-foreground mt-1 ${
														isCurrentUser ? 'text-right' : 'text-left'
													}`}
												>
													{!isCurrentUser && `${sender?.name}, `}
													{formatTime(message.timestamp)}
												</p>
											</div>
										</div>
									);
								})}
								<div ref={messagesEndRef} />
							</CardContent>

							{/* Message Input */}
							<div className="border-t p-4">
								<div className="flex items-end gap-2">
									<Button variant="ghost" size="sm">
										<Paperclip className="h-4 w-4" />
									</Button>

									<div className="flex-1 relative">
										<Input
											placeholder="Type a message..."
											className="pr-10 resize-none"
											value={newMessage}
											onChange={(e) => setNewMessage(e.target.value)}
											onKeyPress={handleKeyPress}
										/>
										<Button
											variant="ghost"
											size="sm"
											className="absolute right-1 top-1/2 -translate-y-1/2"
										>
											<Smile className="h-4 w-4" />
										</Button>
									</div>

									<Button
										onClick={handleSendMessage}
										disabled={!newMessage.trim()}
										className="bg-blue-500 hover:bg-blue-600"
									>
										<Send className="h-4 w-4" />
									</Button>
								</div>
							</div>
						</>
					) : (
						<CardContent className="flex-1 flex items-center justify-center">
							<div className="text-center">
								<MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
								<h3 className="text-lg font-semibold mb-2">
									Select a chat to start messaging
								</h3>
								<p className="text-muted-foreground">
									Choose from your existing conversations or start a new one
								</p>
							</div>
						</CardContent>
					)}
				</Card>
			</div>
		</div>
	);
}

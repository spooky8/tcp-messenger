"use client";

import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import {
	ArrowLeft,
	MoreVertical,
	Paperclip,
	Phone,
	Send,
	Smile,
	Video,
} from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Message, ServerResponse } from "~/types/types";
import { ChatMessage } from "../components/chat-message";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { ScrollArea } from "../components/ui/scroll-area";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "../components/ui/tooltip";

export default function Chat() {
	const [messages, setMessages] = useState<Message[]>([]);
	const [newMessage, setNewMessage] = useState("");
	const [error, setError] = useState("");
	const scrollAreaRef = useRef<HTMLDivElement>(null);
	const location = useLocation();
	const addr = new URLSearchParams(location.search).get("addr") || "Unknown";

	useEffect(() => {
		const unsubscribe = listen<Message>("new-message", (event) => {
			setMessages((prev) => [...prev, event.payload]);
		});

		return () => {
			unsubscribe.then((unsub) => unsub());
		};
	}, []);

	useEffect(() => {
		if (scrollAreaRef.current) {
			const scrollContainer = scrollAreaRef.current.querySelector(
				"[data-radix-scroll-area-viewport]"
			);
			if (scrollContainer) {
				scrollContainer.scrollTop = scrollContainer.scrollHeight;
			}
		}
	}, [messages]);

	const handleSendMessage = async () => {
		if (newMessage.trim()) {
			try {
				const response: ServerResponse = await invoke("send_message", {
					msg: newMessage,
				});
				if (response.type === "ok") {
					const message: Message = {
						id: Date.now().toString(),
						content: newMessage,
						sender: "me",
						timestamp: new Date().toISOString(),
					};
					setMessages([...messages, message]);
					setNewMessage("");
				} else {
					setError("Failed to send message");
				}
			} catch (e) {
				setError("Error sending message: " + e);
			}
		}
	};

	const handleDisconnect = async () => {
		try {
			const response: ServerResponse = await invoke("disconnect_room", {});
			if (response.type === "ok") {
				window.location.href = "/";
			} else {
				setError("Failed to disconnect");
			}
		} catch (e) {
			setError("Error disconnecting: " + e);
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSendMessage();
		}
	};

	return (
		<div className="fixed inset-0 bg-gradient-to-b from-slate-50 to-slate-100 flex flex-col">
			<Card className="flex flex-col h-full w-full max-w-full rounded-none border-0 shadow-none overflow-hidden">
				{/* Шапка чата */}
				<CardHeader className="flex flex-row items-center gap-2 sm:gap-4 border-b px-3 sm:px-4 py-2 sm:py-3 bg-white flex-none">
					<Button
						variant="ghost"
						size="icon"
						className="md:hidden"
						onClick={handleDisconnect}
					>
						<ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
						<span className="sr-only">Назад</span>
					</Button>

					<Avatar className="h-8 w-8 sm:h-10 sm:w-10 border-2 border-green-500">
						<AvatarImage src="/placeholder.svg?height=40&width=40" alt="Аватар" />
						<AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs sm:text-sm">
							TCP
						</AvatarFallback>
					</Avatar>

					<div className="flex-1 min-w-0">
						<div className="flex items-center gap-2">
							<h2 className="text-sm sm:text-base font-semibold truncate">
								Комната - {addr}
							</h2>
							<Badge
								variant="secondary"
								className="bg-green-100 text-green-700 hover:bg-green-200 text-xs"
							>
								Онлайн
							</Badge>
						</div>
						<p className="text-xs text-muted-foreground truncate">
							{addr} • Последняя активность: только что
						</p>
					</div>

					<div className="hidden md:flex text-sm">
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button variant="ghost" size="icon" className="rounded-full">
										<Phone className="h-5 w-5 text-slate-600" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>Аудио звонок</TooltipContent>
							</Tooltip>
						</TooltipProvider>

						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button variant="ghost" size="icon" className="rounded-full">
										<Video className="h-5 w-5 text-slate-600" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>Видео звонок</TooltipContent>
							</Tooltip>
						</TooltipProvider>

						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button variant="ghost" size="icon" className="rounded-full">
										<MoreVertical className="h-5 w-5 text-slate-600" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>Дополнительные опции</TooltipContent>
							</Tooltip>
						</TooltipProvider>

						<Button
							variant="outline"
							size="icon"
							className="ml-2 hidden md:flex"
							onClick={handleDisconnect}
						>
							<ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
							<span className="sr-only">Назад</span>
						</Button>
					</div>
				</CardHeader>

				{/* Область сообщений */}
				<CardContent
					className="flex-1 p-0 bg-slate-50 overflow-hidden"
					ref={scrollAreaRef}
				>
					<ScrollArea className="h-full w-full">
						<div className="flex flex-col gap-3 p-3 sm:p-4">
							<div className="text-center my-2">
								<span className="text-xs bg-slate-200 text-slate-600 px-3 py-1 rounded-full">
									Сегодня
								</span>
							</div>
							{messages.map((message) => (
								<ChatMessage key={message.id} message={message} />
							))}
						</div>
					</ScrollArea>
				</CardContent>

				{/* Панель ввода сообщения */}
				<div className="border-t p-2 sm:p-3 bg-white flex-none">
					{error && <div className="text-red-500 text-sm mb-2">{error}</div>}
					<div className="flex items-center gap-2 w-full">
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										variant="ghost"
										size="icon"
										className="rounded-full h-10 w-10 flex-shrink-0"
									>
										<Paperclip className="h-5 w-5 text-slate-600" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>Прикрепить файл</TooltipContent>
							</Tooltip>
						</TooltipProvider>

						<Input
							placeholder="Введите сообщение..."
							value={newMessage}
							onChange={(e) => setNewMessage(e.target.value)}
							onKeyDown={handleKeyDown}
							className="flex-1 min-w-[50px] rounded-full border-slate-300 focus-visible:ring-emerald-500"
						/>

						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										variant="ghost"
										size="icon"
										className="rounded-full h-10 w-10 flex-shrink-0"
									>
										<Smile className="h-5 w-5 text-slate-600" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>Эмодзи</TooltipContent>
							</Tooltip>
						</TooltipProvider>

						<Button
							size="icon"
							onClick={handleSendMessage}
							disabled={!newMessage.trim()}
							className="rounded-full bg-emerald-600 hover:bg-emerald-700 h-10 w-10 flex-shrink-0"
						>
							<Send className="h-5 w-5" />
							<span className="sr-only">Отправить</span>
						</Button>
					</div>
				</div>
			</Card>
		</div>
	);
}
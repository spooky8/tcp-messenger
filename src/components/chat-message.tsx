import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { cn } from "~/lib/utils";
import { Message } from "~/types/types";

interface ChatMessageProps {
	message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
	const isMe = message.sender === "me";

	return (
		<div className={cn("flex", isMe ? "justify-end" : "justify-start")}>
			<div
				className={cn(
					"max-w-[80%] rounded-lg px-4 py-2 text-sm",
					isMe ? "bg-primary text-primary-foreground" : "bg-muted"
				)}
			>
				<div>{message.content}</div>
				<div
					className={cn(
						"mt-1 text-xs",
						isMe ? "text-primary-foreground/70" : "text-muted-foreground"
					)}
				>
					{format(parseISO(message.timestamp), "HH:mm", { locale: ru })}
				</div>
			</div>
		</div>
	);
}
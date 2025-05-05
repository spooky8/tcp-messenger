import { invoke } from "@tauri-apps/api/core";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { cn } from "~/lib/utils";
import { ServerResponse } from "~/types/types";

export function MainForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [ip, setIp] = useState("");
  const [port, setPort] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleCreateRoom = async () => {
    try {
      const response: ServerResponse = await invoke("create_room", {});
      if (response.type === "create" && response.status === "ok" && response.addr) {
        const addr = response.addr;
        await invoke("connect_room", { addr });
        navigate(`/chat?addr=${addr}`);
      } else {
        setError("Failed to create room");
      }
    } catch (e) {
      setError("Error creating room: " + e);
    }
  };

  const handleConnectRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ip || !port) {
      setError("Please enter IP and port");
      return;
    }
    const addr = `${ip}:${port}`;
    try {
      const response: ServerResponse = await invoke("connect_room", { addr });
      if (response.type === "ok") {
        navigate(`/chat?addr=${addr}`);
      } else {
        setError("Failed to connect to room");
      }
    } catch (e) {
      setError("Error connecting to room: " + e);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form className="p-6 md:p-8" onSubmit={handleConnectRoom}>
            <div className="flex flex-col gap-6">
              <div className="flex flex-col items-center text-center">
                <h1 className="text-2xl font-bold">TCP/IP MESSENGER</h1>
              </div>
              <div className="grid gap-3">
                <Label htmlFor="ip">IP-адрес</Label>
                <Input
                  id="ip"
                  type="text"
                  placeholder="192.168.1.1"
                  value={ip}
                  onChange={(e) => setIp(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="port">Порт</Label>
                <Input
                  id="port"
                  placeholder="8080"
                  type="number"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  required
                />
              </div>
              {error && (
                <div className="text-red-500 text-sm">{error}</div>
              )}
              <Button type="submit" className="w-full">
                Присоединиться к комнате
              </Button>
              <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
                <span className="bg-card text-muted-foreground relative z-10 px-2">
                  Нет комнаты или хотите создать новую?
                </span>
              </div>
              <div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleCreateRoom}
                >
                  Создать комнату
                </Button>
              </div>
            </div>
          </form>
          <div className="bg-muted relative hidden md:block">
            <img
              src="../../src/assets/login-bg.jpg"
              alt="Image"
              className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
            />
          </div>
        </CardContent>
      </Card>
      <div className="text-muted-foreground *:[a]:hover:text-primary text-center text-xs text-balance *:[a]:underline *:[a]:underline-offset-4">
        Нажимая продолжить, вы соглашаетесь с нашими{" "}
        <a href="#">Условиями использования</a> и{" "}
        <a href="#">Политикой конфиденциальности</a>.
      </div>
    </div>
  );
}
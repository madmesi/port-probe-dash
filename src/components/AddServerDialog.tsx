import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { apiClient } from "@/lib/api";
import { toast } from "sonner";
import { z } from "zod";
import { getSafeErrorMessage } from "@/lib/errorUtils";

const SERVER_TAGS = ["Java", "MQ", "Apex", "Other"] as const;

const serverSchema = z.object({
  hostname: z.string().trim().min(1, "Hostname is required").max(255, "Hostname must be less than 255 characters"),
  ip_address: z.string().trim().regex(/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/, "Invalid IP address format"),
  ssh_port: z.number().int().min(1, "Port must be at least 1").max(65535, "Port must be at most 65535"),
  ssh_username: z.string().trim().max(32, "Username must be less than 32 characters").optional(),
  prometheus_url: z.string().trim().url("Invalid URL format").or(z.literal("")).optional(),
  group_id: z.string().uuid().or(z.literal("")).optional(),
});

interface AddServerDialogProps {
  onServerAdded?: () => void;
  groups: Array<{ id: string; name: string }>;
}

export function AddServerDialog({ onServerAdded, groups }: AddServerDialogProps) {
  const [open, setOpen] = useState(false);
  const [serverData, setServerData] = useState({
    hostname: "",
    ip_address: "",
    ssh_port: "22",
    ssh_username: "",
    prometheus_url: "",
    group_id: "",
    tags: [] as string[],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const validatedData = serverSchema.parse({
        hostname: serverData.hostname,
        ip_address: serverData.ip_address,
        ssh_port: parseInt(serverData.ssh_port) || 22,
        ssh_username: serverData.ssh_username || undefined,
        prometheus_url: serverData.prometheus_url || undefined,
        group_id: serverData.group_id || undefined,
      });

      await apiClient.createServer({
        hostname: validatedData.hostname,
        ip_address: validatedData.ip_address,
        ssh_port: validatedData.ssh_port,
        ssh_username: validatedData.ssh_username || null,
        prometheus_url: validatedData.prometheus_url || null,
        group_id: validatedData.group_id || null,
        tags: serverData.tags,
        status: "unknown",
      });

      toast.success("Server added successfully");
      setOpen(false);
      setServerData({
        hostname: "",
        ip_address: "",
        ssh_port: "22",
        ssh_username: "",
        prometheus_url: "",
        group_id: "",
        tags: [],
      });
      if (onServerAdded) onServerAdded();
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error(getSafeErrorMessage(error));
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Server
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add New Server</DialogTitle>
            <DialogDescription>
              Enter the server details and connection information.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="hostname">Hostname *</Label>
              <Input
                id="hostname"
                placeholder="web-server-01"
                value={serverData.hostname}
                onChange={(e) =>
                  setServerData({ ...serverData, hostname: e.target.value })
                }
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ip_address">IP Address *</Label>
              <Input
                id="ip_address"
                placeholder="192.168.1.100"
                value={serverData.ip_address}
                onChange={(e) =>
                  setServerData({ ...serverData, ip_address: e.target.value })
                }
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="ssh_port">SSH Port</Label>
                <Input
                  id="ssh_port"
                  type="number"
                  placeholder="22"
                  value={serverData.ssh_port}
                  onChange={(e) =>
                    setServerData({ ...serverData, ssh_port: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ssh_username">SSH Username</Label>
                <Input
                  id="ssh_username"
                  placeholder="root"
                  value={serverData.ssh_username}
                  onChange={(e) =>
                    setServerData({ ...serverData, ssh_username: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="prometheus_url">Prometheus URL</Label>
              <Input
                id="prometheus_url"
                placeholder="http://prometheus:9090"
                value={serverData.prometheus_url}
                onChange={(e) =>
                  setServerData({ ...serverData, prometheus_url: e.target.value })
                }
              />
            </div>
            {groups.length > 0 && (
              <div className="grid gap-2">
                <Label htmlFor="group">Server Group</Label>
                <Select
                  value={serverData.group_id}
                  onValueChange={(value) =>
                    setServerData({ ...serverData, group_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a group (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid gap-3">
              <Label>Tags</Label>
              <div className="grid grid-cols-2 gap-3">
                {SERVER_TAGS.map((tag) => (
                  <div key={tag} className="flex items-center space-x-2">
                    <Checkbox
                      id={`tag-${tag}`}
                      checked={serverData.tags.includes(tag)}
                      onCheckedChange={(checked) => {
                        setServerData({
                          ...serverData,
                          tags: checked
                            ? [...serverData.tags, tag]
                            : serverData.tags.filter((t) => t !== tag),
                        });
                      }}
                    />
                    <Label
                      htmlFor={`tag-${tag}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {tag}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit">Add Server</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

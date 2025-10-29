import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useNavigate } from "react-router-dom";
import { apiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, FolderTree, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { getSafeErrorMessage } from "@/lib/errorUtils";

const groupSchema = z.object({
  name: z.string().trim().min(1, "Group name is required").max(255, "Group name must be less than 255 characters"),
  description: z.string().max(1000, "Description must be less than 1000 characters"),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color format"),
});

interface ServerGroup {
  id: string;
  name: string;
  description: string | null;
  color: string;
}

const AdminGroups = () => {
  const { isAdmin, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<ServerGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newGroup, setNewGroup] = useState({
    name: "",
    description: "",
    color: "#06b6d4",
  });

  // Early return for non-admins - don't render page at all
  if (!authLoading && !isAdmin) {
    return null;
  }

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const data = await apiClient.getGroups();
      setGroups(data || []);
    } catch (error: any) {
      toast.error(getSafeErrorMessage(error));
    }
    setIsLoading(false);
  };

  const createGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const validatedData = groupSchema.parse(newGroup);
      await apiClient.createGroup({
        name: validatedData.name,
        description: validatedData.description || null,
        color: validatedData.color,
      });
      toast.success("Server group created");
      setIsDialogOpen(false);
      setNewGroup({ name: "", description: "", color: "#06b6d4" });
      fetchGroups();
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error(getSafeErrorMessage(error));
      }
    }
  };

  const deleteGroup = async (id: string) => {
    try {
      await apiClient.deleteGroup(id);
      toast.success("Server group deleted");
      fetchGroups();
    } catch (error: any) {
      toast.error(getSafeErrorMessage(error));
    }
  };

  if (authLoading || !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/")} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Group
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Server Group</DialogTitle>
              </DialogHeader>
              <form onSubmit={createGroup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Group Name</Label>
                  <Input
                    id="name"
                    value={newGroup.name}
                    onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newGroup.description}
                    onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="color">Color</Label>
                  <Input
                    id="color"
                    type="color"
                    value={newGroup.color}
                    onChange={(e) => setNewGroup({ ...newGroup, color: e.target.value })}
                  />
                </div>
                <Button type="submit" className="w-full">Create Group</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex items-center gap-4">
          <div className="p-3 rounded-lg bg-code-bg">
            <FolderTree className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Server Groups</h1>
            <p className="text-muted-foreground">Organize servers into groups</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            <p className="text-muted-foreground col-span-full">Loading groups...</p>
          ) : groups.length > 0 ? (
            groups.map((group) => (
              <Card key={group.id} className="border-border">
                <CardHeader className="flex flex-row items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-4 w-4 rounded-full"
                      style={{ backgroundColor: group.color }}
                    />
                    <CardTitle className="text-lg">{group.name}</CardTitle>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteGroup(group.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {group.description || "No description"}
                  </p>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              <FolderTree className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p>No server groups yet. Create one to get started.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminGroups;

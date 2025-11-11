import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";
import { toast } from "sonner";
import { getSafeErrorMessage } from "@/lib/errorUtils";

interface UserWithRole {
  id: string;
  username: string;
  display_name: string | null;
  roles: string[];
  approved: boolean;
}

export const AdminUsersTab = () => {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const rawData = await apiClient.getUsers();
      // Ensure rawData is an array before mapping
      const data = Array.isArray(rawData) ? rawData : [];
      setUsers(data.map((user: any) => ({
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        roles: user.roles || [],
        approved: user.approved,
      })));
    } catch (error: any) {
      toast.error(getSafeErrorMessage(error));
    }
    setIsLoading(false);
  };

  const toggleAdminRole = async (userId: string, currentRoles: string[]) => {
    try {
      const hasAdmin = currentRoles.includes("admin");
      const newRoles = hasAdmin 
        ? currentRoles.filter(r => r !== "admin")
        : [...currentRoles, "admin"];
      
      await apiClient.updateUserRoles(userId, newRoles);
      toast.success(hasAdmin ? "Admin role removed" : "Admin role granted");
      fetchUsers();
    } catch (error: any) {
      toast.error(getSafeErrorMessage(error));
    }
  };

  const toggleApproval = async (userId: string, currentApproval: boolean) => {
    try {
      await apiClient.updateUser(userId, { approved: !currentApproval });
      toast.success(currentApproval ? "User access revoked" : "User approved");
      fetchUsers();
    } catch (error: any) {
      toast.error(getSafeErrorMessage(error));
    }
  };

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          System Users
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground">Loading users...</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Display Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-mono">{user.username}</TableCell>
                  <TableCell>{user.display_name || "-"}</TableCell>
                  <TableCell>
                    {user.approved ? (
                      <Badge variant="default">Approved</Badge>
                    ) : (
                      <Badge variant="destructive">Pending</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.roles.includes("admin") ? (
                      <Badge variant="default">Admin</Badge>
                    ) : (
                      <Badge variant="secondary">User</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={user.approved ? "destructive" : "default"}
                        onClick={() => toggleApproval(user.id, user.approved)}
                      >
                        {user.approved ? "Revoke Access" : "Approve"}
                      </Button>
                      <Button
                        size="sm"
                        variant={user.roles.includes("admin") ? "destructive" : "default"}
                        onClick={() => toggleAdminRole(user.id, user.roles)}
                        disabled={!user.approved}
                      >
                        {user.roles.includes("admin") ? "Remove Admin" : "Make Admin"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
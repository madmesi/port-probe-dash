import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useNavigate } from "react-router-dom";
import { apiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Users, Shield } from "lucide-react";
import { toast } from "sonner";
import { getSafeErrorMessage } from "@/lib/errorUtils";

interface UserWithRole {
  id: string;
  username: string;
  display_name: string | null;
  roles: string[];
  approved: boolean;
}

const AdminUsers = () => {
  const { isAdmin, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Early return for non-admins - don't render page at all
  if (!authLoading && !isAdmin) {
    return null;
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const data = await apiClient.getUsers();
      // Defensively handle non-array responses to avoid "Cannot read properties of null (reading 'map')"
      const usersData = Array.isArray(data) ? data : [];
      setUsers(usersData.map((user: any) => ({
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
        </div>

        <div className="flex items-center gap-4">
          <div className="p-3 rounded-lg bg-code-bg">
            <Users className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">User Management</h1>
            <p className="text-muted-foreground">Manage user roles and permissions</p>
          </div>
        </div>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
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
      </div>
    </div>
  );
};

export default AdminUsers;

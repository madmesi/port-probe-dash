import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User, Users, FolderTree, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function Header() {
  const { user, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-4xl font-bold mb-2">
          <span className="text-gradient">CMDB</span> Dashboard
        </h1>
        <p className="text-muted-foreground">Configuration Management Database</p>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2">
            <User className="h-4 w-4" />
            Account
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {isAdmin && (
            <>
              <DropdownMenuItem onClick={() => navigate("/admin")}>
                <Shield className="h-4 w-4 mr-2" />
                Admin Area
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/admin/groups")}>
                <FolderTree className="h-4 w-4 mr-2" />
                Server Groups
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

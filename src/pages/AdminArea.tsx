import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Shield, Key } from "lucide-react";
import { AdminUsersTab } from "@/components/admin/AdminUsersTab";
import { AdminAPIKeysTab } from "@/components/admin/AdminAPIKeysTab";

const AdminArea = () => {
  const { isAdmin, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Early return for non-admins
  if (!authLoading && !isAdmin) {
    navigate("/");
    return null;
  }

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
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Admin Area</h1>
            <p className="text-muted-foreground">Manage users, permissions, and API keys</p>
          </div>
        </div>

        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="users" className="gap-2">
              <Shield className="h-4 w-4" />
              User Management
            </TabsTrigger>
            <TabsTrigger value="api-keys" className="gap-2">
              <Key className="h-4 w-4" />
              API Keys
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-6">
            <AdminUsersTab />
          </TabsContent>

          <TabsContent value="api-keys" className="mt-6">
            <AdminAPIKeysTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminArea;

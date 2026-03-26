import React, { useState, useEffect } from "react";
import { Card, Badge, Button, Avatar, AvatarFallback } from "../components/ui/Primitives";
import { MoreVertical } from "lucide-react";
import api from "../services/api";

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/admin/users');
      setUsers(response.data.users || []);
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId, newRole) => {
    try {
      await api.put(`/admin/users/${userId}/role`, { role: newRole });
      fetchUsers(); // Refresh list
    } catch (error) {
      console.error("Failed to update role:", error);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">User Management</h1>
          <p className="text-slate-400">Manage access and permissions.</p>
        </div>
        <Button>Invite User</Button>
      </div>

      <Card className="p-0 overflow-hidden border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-900/50 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-medium">
            <tr>
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Role</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-slate-900/40 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        {user.email ? user.email.charAt(0).toUpperCase() : '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium text-white">{user.email.split('@')[0]}</div>
                      <div className="text-slate-500 text-xs">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <Badge variant={user.role === "ADMIN" ? "default" : "neutral"}>{user.role}</Badge>
                </td>
                <td className="px-6 py-4">
                  <Badge variant={user.status === "Suspended" ? "danger" : "success"} className="rounded-full">
                    {user.status || 'Active'}
                  </Badge>
                </td>
                <td className="px-6 py-4 text-right flex justify-end gap-2">
                  {user.role === 'USER' ? (
                    <Button variant="ghost" size="sm" onClick={() => handleRoleChange(user.id, 'ADMIN')}>Make Admin</Button>
                  ) : (
                    <Button variant="ghost" size="sm" onClick={() => handleRoleChange(user.id, 'USER')}>Make User</Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

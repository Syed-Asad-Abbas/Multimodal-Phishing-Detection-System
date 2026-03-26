import React, { useState, useEffect } from "react";
import { Card, Button, Input, Avatar, AvatarFallback, AvatarImage } from "../components/ui/Primitives";
import api from "../services/api";

export default function Profile() {
  const [user, setUser] = useState(null);
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [editName, setEditName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      setUser(parsed);
      setEditName(parsed.name || "");
      setIs2FAEnabled(parsed.is_2fa_enabled || false);
    }
  }, []);

  const handleToggle2FA = async () => {
    try {
      const newStatus = !is2FAEnabled;
      const res = await api.post('/auth/2fa/toggle', { is_2fa_enabled: newStatus });
      setIs2FAEnabled(res.data.is_2fa_enabled);
      if (user) {
        const updatedUser = { ...user, is_2fa_enabled: res.data.is_2fa_enabled };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
    } catch (err) {
      alert("Failed to toggle 2FA");
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    // Simulate finding an endpoint for updating user or just saving locally for now
    // As there is no backend route for user update yet!
    setTimeout(() => {
      if (user) {
        const updatedUser = { ...user, name: editName };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
      setIsSaving(false);
    }, 600);
  };

  const isModified = user && editName !== user.name;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Profile Settings</h1>
        {isModified && (
          <Button onClick={handleSaveProfile} loading={isSaving}>
            Save Changes
          </Button>
        )}
      </div>

      <div className="space-y-6">
        <Card className="p-6 border-slate-800">
          <h3 className="text-lg font-semibold mb-4">Personal Information</h3>
          <div className="flex items-center gap-6 mb-6">
            <Avatar className="h-20 w-20">
              <AvatarImage src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user?.email || "User")}&background=0D8ABC&color=fff&size=128`} />
              <AvatarFallback className="bg-cyan-500/10 text-cyan-400 text-xl border border-cyan-500/20">{user?.name ? user.name.substring(0, 2).toUpperCase() : "US"}</AvatarFallback>
            </Avatar>
            <div>
              <Button variant="outline" size="sm" className="mb-2">Change Avatar</Button>
              <p className="text-xs text-slate-500">JPG, GIF or PNG. 1MB max.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400">Full Name</label>
              <Input value={editName} onChange={e => setEditName(e.target.value)} className="bg-slate-950/50 border-slate-800" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400">Email Address</label>
              <Input value={user?.email || ""} readOnly className="bg-slate-950/50 border-slate-800 opacity-70 cursor-not-allowed" />
            </div>
          </div>
        </Card>

        <Card className="p-6 border-slate-800">
          <h3 className="text-lg font-semibold mb-4">Security</h3>
          <div className="flex items-center justify-between py-4 border-b border-white/5">
            <div>
              <div className="font-medium">Two-Factor Authentication</div>
              <div className="text-sm text-slate-500">Add an extra layer of security to your account.</div>
            </div>
            <Button variant={is2FAEnabled ? "danger" : "outline"} onClick={handleToggle2FA}>
              {is2FAEnabled ? "Disable" : "Enable"}
            </Button>
          </div>
          <div className="flex items-center justify-between py-4">
            <div>
              <div className="font-medium">API Keys</div>
              <div className="text-sm text-slate-500">Manage your API keys for external integration.</div>
            </div>
            <Button variant="outline">Manage Keys</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

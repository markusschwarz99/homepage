import { useState, useRef, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Button } from '../components/Button';
import { Avatar } from '../components/Avatar';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api';

const API_URL = import.meta.env.VITE_API_URL;

export function Account() {
  const { user, logout, refetch } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(user?.name || '');
  const [nameSuccess, setNameSuccess] = useState('');
  const [nameError, setNameError] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwError, setPwError] = useState('');

  const [avatarError, setAvatarError] = useState('');

  if (!user) {
    navigate('/login');
    return null;
  }

  async function handleNameUpdate(e: FormEvent) {
    e.preventDefault();
    setNameSuccess('');
    setNameError('');
    try {
      await api('/auth/me', {
        method: 'PATCH',
        body: JSON.stringify({ name }),
      });
      await refetch();
      setNameSuccess('Name erfolgreich geändert!');
    } catch (err) {
      setNameError(err instanceof Error ? err.message : 'Fehler');
    }
  }

  async function handlePasswordUpdate(e: FormEvent) {
    e.preventDefault();
    setPwSuccess('');
    setPwError('');

    if (newPassword !== confirmPassword) {
      setPwError('Neue Passwörter stimmen nicht überein');
      return;
    }
    if (newPassword.length < 12) {
      setPwError('Passwort muss mindestens 12 Zeichen haben');
      return;
    }

    try {
      await api('/auth/me/password', {
        method: 'POST',
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
          confirm_password: confirmPassword,
        }),
      });
      setPwSuccess('Passwort erfolgreich geändert!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPwError(err instanceof Error ? err.message : 'Fehler');
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarError('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/auth/me/avatar`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      if (!response.ok) throw new Error('Upload fehlgeschlagen');
      await refetch();
    } catch (err) {
      setAvatarError('Bild konnte nicht hochgeladen werden');
    }
  }

  return (
    <Layout>
      <div className="max-w-xl mx-auto px-8 py-12">
        <h1 className="text-2xl sm:text-3xl font-medium mb-10">Mein Account</h1>

        {/* Profilbild */}
        <div className="bg-bg-primary rounded-lg border border-border p-6 mb-6">
          <h2 className="text-sm font-medium text-text-muted uppercase tracking-wider mb-6">Profilbild</h2>
          <div className="flex items-center gap-6">
            <Avatar name={user.name} avatarUrl={user.avatar_url} size="lg" />
            <div>
              <Button
                variant="secondary"
                onClick={() => fileInputRef.current?.click()}
              >
                Bild ändern
              </Button>
              <p className="text-xs text-text-hint mt-2">JPG, PNG – max. 5 MB</p>
              {avatarError && <p className="text-xs text-red-600 mt-1">{avatarError}</p>}
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>

        {/* Name ändern */}
        <div className="bg-bg-primary rounded-lg border border-border p-6 mb-6">
          <h2 className="text-sm font-medium text-text-muted uppercase tracking-wider mb-6">Name</h2>
          <form onSubmit={handleNameUpdate} className="space-y-4">
            <div>
              <label className="block text-xs text-text-muted mb-2">Anzeigename</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-bg-primary focus:outline-none focus:border-text-muted"
              />
            </div>
            <Button type="submit">Name speichern</Button>
            {nameSuccess && <p className="text-xs text-green-700">{nameSuccess}</p>}
            {nameError && <p className="text-xs text-red-600">{nameError}</p>}
          </form>
        </div>

        {/* Passwort ändern */}
        <div className="bg-bg-primary rounded-lg border border-border p-6 mb-6">
          <h2 className="text-sm font-medium text-text-muted uppercase tracking-wider mb-6">Passwort ändern</h2>
          <form onSubmit={handlePasswordUpdate} className="space-y-4">
            <div>
              <label className="block text-xs text-text-muted mb-2">Aktuelles Passwort</label>
              <input
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                required
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-bg-primary focus:outline-none focus:border-text-muted"
              />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-2">Neues Passwort</label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-bg-primary focus:outline-none focus:border-text-muted"
              />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-2">Neues Passwort bestätigen</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-bg-primary focus:outline-none focus:border-text-muted"
              />
            </div>
            <Button type="submit">Passwort ändern</Button>
            {pwSuccess && <p className="text-xs text-green-700">{pwSuccess}</p>}
            {pwError && <p className="text-xs text-red-600">{pwError}</p>}
          </form>
        </div>

        {/* Logout */}
        <div className="bg-bg-primary rounded-lg border border-border p-6">
          <h2 className="text-sm font-medium text-text-muted uppercase tracking-wider mb-4">Session</h2>
          <p className="text-xs text-text-hint mb-4">Angemeldet als {user.email}</p>
          <Button variant="danger" onClick={logout}>Abmelden</Button>
        </div>
      </div>
    </Layout>
  );
}

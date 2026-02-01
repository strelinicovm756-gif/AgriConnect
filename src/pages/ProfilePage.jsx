import { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import toast from 'react-hot-toast';

export default function ProfilePage({ session, onNavigate }) {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [formData, setFormData] = useState({
        full_name: '',
        phone: '',
        location: '',
        bio: ''
    });

    useEffect(() => {
        if (session) {
            loadProfile();
        }
    }, [session]);

    const loadProfile = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();

            if (error && error.code === 'PGRST116') {
                // Profil nu exista////crearea nou ??????????
                await createProfile();
            } else if (error) {
                throw error;
            } else {
                setProfile(data);
                setFormData({
                    full_name: data.full_name || '',
                    phone: data.phone || '',
                    location: data.location || '',
                    bio: data.bio || ''
                });
            }
        } catch (error) {
            toast.error('Eroare la încărcarea profilului: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const createProfile = async () => {
        const { data, error } = await supabase
            .from('profiles')
            .insert({
                id: session.user.id,
                full_name: session.user.user_metadata?.full_name || '',
                avatar_url: session.user.user_metadata?.avatar_url || ''
            })
            .select()
            .single();

        if (!error) {
            setProfile(data);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            setLoading(true);
            const { error } = await supabase
                .from('profiles')
                .update({
                    full_name: formData.full_name,
                    phone: formData.phone,
                    location: formData.location,
                    bio: formData.bio
                })
                .eq('id', session.user.id);

            if (error) throw error;

            toast.success('Profil actualizat cu succes!');
            setEditing(false);
            loadProfile();
        } catch (error) {
            toast.error('Eroare la actualizare: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <div className="text-emerald-400">Se încarcă...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 text-white">
            {/* Navbar */}
            <nav className="p-6 border-b border-slate-800 flex justify-between items-center">
                <Button variant="ghost" onClick={() => onNavigate('home')}>
                    Înapoi
                </Button>
                <h1 className="text-xl font-bold text-emerald-400">Profilul Meu</h1>
                <div className="w-20"></div>
            </nav>

            <main className="max-w-4xl mx-auto p-8">
                <div className="grid md:grid-cols-3 gap-8">
                    {/* Sidebar - Avatar/Info Basic */}
                    <div className="md:col-span-1">
                        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 text-center">
                            {/* Avatar */}
                            <div className="w-32 h-32 mx-auto mb-4 rounded-full overflow-hidden border-4 border-emerald-500/20">
                                {session.user.user_metadata?.avatar_url ? (
                                    <img
                                        src={session.user.user_metadata.avatar_url}
                                        alt="Avatar"
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-slate-700 flex items-center justify-center text-4xl">
                                        👤
                                    </div>
                                )}
                            </div>

                            {/* Email */}
                            <p className="text-slate-300 font-medium mb-1">
                                {profile?.full_name || 'Nume necunoscut'}
                            </p>
                            <p className="text-slate-500 text-sm mb-4">
                                {session.user.email}
                            </p>

                            {/* Badge verificat */}
                            {profile?.is_verified && (
                                <Badge variant="success">✓ VERIFICAT</Badge>
                            )}

                            {/* Statistici */}
                            <div className="mt-6 pt-6 border-t border-slate-700">
                                <div className="grid grid-cols-2 gap-4 text-center">
                                    <div>
                                        <p className="text-2xl font-bold text-emerald-400">0</p>
                                        <p className="text-slate-500 text-xs">Produse</p>
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-emerald-400">0</p>
                                        <p className="text-slate-500 text-xs">Recenzii</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Main Content - Formular */}
                    <div className="md:col-span-2">
                        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold">Informații Profil</h2>
                                {!editing && (
                                    <Button onClick={() => setEditing(true)} size="sm">
                                        Editează Profil
                                    </Button>
                                )}
                            </div>

                            {editing ? (

                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <Input
                                        label="Nume Complet"
                                        value={formData.full_name}
                                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                        placeholder="Ion Popescu"
                                    />

                                    <Input
                                        label="Telefon"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        placeholder="0722 123 456"
                                    />

                                    <Input
                                        label="Locație"
                                        value={formData.location}
                                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                        placeholder="Iași, România"
                                    />

                                    <div>
                                        <label className="block text-slate-300 text-sm font-medium mb-2">
                                            Descriere
                                        </label>
                                        <textarea
                                            value={formData.bio}
                                            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                            placeholder="Scrie câteva cuvinte despre tine..."
                                            rows={4}
                                            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-slate-500"
                                        />
                                    </div>

                                    <div className="flex gap-3">
                                        <Button type="submit" disabled={loading}>
                                            {loading ? 'Se salvează...' : 'Salvează'}
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            onClick={() => setEditing(false)}
                                            type="button"
                                        >
                                            Anulează
                                        </Button>
                                    </div>
                                </form>
                            ) : (
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-slate-500 text-sm mb-1">Nume Complet</p>
                                        <p className="text-white">{profile?.full_name || 'Nu e setat'}</p>
                                    </div>

                                    <div>
                                        <p className="text-slate-500 text-sm mb-1">Telefon</p>
                                        <p className="text-white">{profile?.phone || 'Nu e setat'}</p>
                                    </div>

                                    <div>
                                        <p className="text-slate-500 text-sm mb-1">Locație</p>
                                        <p className="text-white">{profile?.location || 'Nu e setată'}</p>
                                    </div>

                                    <div>
                                        <p className="text-slate-500 text-sm mb-1">Descriere</p>
                                        <p className="text-white">{profile?.bio || 'Nu există descriere'}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
import React, { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../contexts/AuthContext';

export const Profile: React.FC = () => {
    const { user, logout, login } = useAuth();
    const [twoFaSetup, setTwoFaSetup] = useState<{ secret: string; qrCodeUrl: string } | null>(null);
    const [twoFaCode, setTwoFaCode] = useState('');
    const [message, setMessage] = useState('');
    const [scores, setScores] = useState<any[]>([]);
    const [isEditingUsername, setIsEditingUsername] = useState(false);
    const [newUsername, setNewUsername] = useState('');

    useEffect(() => {
        fetchScores();
    }, []);

    const fetchScores = async () => {
        try {
            const res = await api.get('/scores/me');
            setScores(res.data);
        } catch (e) {
            console.error(e);
        }
    };

    const start2FASetup = async () => {
        try {
            const res = await api.post('/2fa/setup');
            setTwoFaSetup(res.data);
            setMessage('');
        } catch (e) {
            console.error(e);
        }
    };

    const verify2FA = async () => {
        if (!twoFaSetup) return;
        try {
            await api.post('/2fa/enable', {
                secret: twoFaSetup.secret,
                token: twoFaCode
            });
            setMessage('2FA Enabled Successfully!');
            setTwoFaSetup(null);
        } catch (e) {
            setMessage('Invalid Code');
        }
    };

    const handleUsernameChange = async () => {
        if (!newUsername || newUsername === user?.username) {
            setIsEditingUsername(false);
            return;
        }

        try {
            const res = await api.patch('/auth/username', { username: newUsername });
            login(res.data.user); // Update user in context
            setIsEditingUsername(false);
            setMessage('Username updated successfully!');
            setTimeout(() => setMessage(''), 3000);
        } catch (e: any) {
            setMessage(e.response?.data?.error || 'Failed to update username');
        }
    };

    if (!user) return <div>Please login</div>;

    return (
        <div className="card fade-enter-active">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div style={{ flex: 1 }}>
                    <h2 className="title">Profile</h2>
                    <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {isEditingUsername ? (
                            <>
                                <input
                                    className="input"
                                    type="text"
                                    placeholder="New username"
                                    value={newUsername}
                                    onChange={e => setNewUsername(e.target.value)}
                                    pattern="[a-zA-Z0-9_]{3,20}"
                                    style={{ width: '200px' }}
                                    autoFocus
                                />
                                <button className="btn btn-primary" onClick={handleUsernameChange}>Save</button>
                                <button className="btn btn-ghost" onClick={() => setIsEditingUsername(false)}>Cancel</button>
                            </>
                        ) : (
                            <>
                                <span style={{ fontWeight: 600 }}>@{user.username}</span>
                                <button
                                    className="btn btn-ghost"
                                    onClick={() => { setNewUsername(user.username); setIsEditingUsername(true); }}
                                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}
                                >
                                    Change Username
                                </button>
                            </>
                        )}
                    </div>
                </div>
                <button className="btn btn-outline" onClick={logout}>Logout</button>
            </div>

            <div style={{ marginBottom: '2rem', padding: '1.5rem', background: 'rgba(0,0,0,0.03)', borderRadius: 'var(--radius)' }}>
                <h3 style={{ fontWeight: 600, marginBottom: '1rem' }}>Two-Factor Authentication</h3>

                {!twoFaSetup && (
                    <button className="btn btn-primary" onClick={start2FASetup}>Setup 2FA</button>
                )}

                {twoFaSetup && (
                    <div style={{ marginTop: '1rem' }}>
                        <p style={{ marginBottom: '1rem' }}>Scan this QR Code with your Authenticator App:</p>
                        <img src={twoFaSetup.qrCodeUrl} alt="2FA QR" style={{ borderRadius: '8px', border: '1px solid #ddd' }} />
                        <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                            <input
                                className="input"
                                placeholder="Enter 6-digit code"
                                value={twoFaCode}
                                onChange={e => setTwoFaCode(e.target.value)}
                                style={{ width: '150px' }}
                            />
                            <button className="btn btn-primary" onClick={verify2FA}>Verify & Enable</button>
                        </div>
                    </div>
                )}
                {message && <p style={{ marginTop: '0.5rem', color: message.includes('Success') ? 'var(--color-correct)' : 'var(--color-incorrect)' }}>{message}</p>}
            </div>

            <h3 className="title" style={{ fontSize: '1.25rem' }}>Recent Scores</h3>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
                {scores.map((score: any) => (
                    <div key={score.id} style={{
                        display: 'flex', justifyContent: 'space-between',
                        padding: '1rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)'
                    }}>
                        <span>{score.mode}</span>
                        <span style={{ fontWeight: 600 }}>{(score.timeMs / 1000).toFixed(2)}s</span>
                        <span style={{ opacity: 0.5 }}>{new Date(score.date).toLocaleDateString()}</span>
                    </div>
                ))}
                {scores.length === 0 && <p style={{ opacity: 0.5 }}>No scores yet. Try Sprint Mode!</p>}
            </div>
        </div>
    );
};

import PropTypes from 'prop-types';
import { useEffect, useMemo, useState } from 'react';
import { useApi } from '../hooks/useApi';

export default function ProfileModal({ open, onClose, user, onUpdated }) {
  const { request } = useApi();
  const [nickname, setNickname] = useState(user?.nickname || user?.profile?.nickname || '');
  const [status, setStatus] = useState(user?.status || '');
  const [avatarFile, setAvatarFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Source nickname from top-level profile response; fallback to nested if provided
    setNickname((user && (user.nickname || user.profile?.nickname)) || '');
    setStatus(user?.status || '');
    setAvatarFile(null);
    setPreviewUrl(null);
    setError(null);
  }, [user, open]);

  const onFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    setAvatarFile(file);
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('nickname', nickname || '');
      form.append('status', status || '');
      if (avatarFile) {
        form.append('avatar', avatarFile);
      }
      const updated = await request('/api/profiles/me/', {
        method: 'PATCH',
        body: form,
        headers: {},
      });
      onUpdated?.(updated);
      onClose?.();
    } catch (err) {
      setError(err?.message || 'Failed to update profile');
    } finally {
      setPending(false);
    }
  };

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 style={{ marginTop: 0 }}>Edit Profile</h2>
        {error ? <div className="error" style={{ color: '#d32f2f' }}>{error}</div> : null}
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {previewUrl ? (
              <img src={previewUrl} alt="preview" className="avatar" />
            ) : (
              <div className="avatar" style={{ background: '#ccc' }} />
            )}
            <input type="file" accept="image/*" onChange={onFileChange} disabled={pending} />
          </div>
          <label style={{ fontSize: '0.9rem' }}>
            Nickname
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              disabled={pending}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--panel)', color: 'var(--text)' }}
            />
          </label>
          <label style={{ fontSize: '0.9rem' }}>
            Status
            <input
              type="text"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              disabled={pending}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--panel)', color: 'var(--text)' }}
            />
          </label>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} disabled={pending} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--panel)', color: 'var(--text)', cursor: 'pointer' }}>
              Cancel
            </button>
            <button type="submit" disabled={pending} style={{ padding: '8px 12px', borderRadius: '8px', border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer' }}>
              {pending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

ProfileModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  user: PropTypes.object.isRequired,
  onUpdated: PropTypes.func,
};

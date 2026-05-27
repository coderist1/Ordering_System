import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './Profile.css';

const Profile = () => {
  const { user, updateUser, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [confirmSave, setConfirmSave] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    profile: {
      address: '',
      age: '',
      birthday: '',
    },
    profile_image: null,
  });
  const [imagePreview, setImagePreview] = useState('');

  useEffect(() => {
    if (user) {
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        profile: {
          address: user.profile?.address || '',
          age: user.profile?.age || '',
          birthday: user.profile?.birthday || '',
        },
        profile_image: null,
      });
      setImagePreview(user.profile?.profile_image || '');
    }
  }, [user]);

  useEffect(() => {
    // Fetch latest user data from API on component mount
    refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    if (!formData.profile_image) return;

    const preview = URL.createObjectURL(formData.profile_image);
    setImagePreview(preview);
    return () => URL.revokeObjectURL(preview);
  }, [formData.profile_image]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name in formData.profile) {
      setFormData((prev) => ({
        ...prev,
        profile: { ...prev.profile, [name]: value },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e && e.preventDefault && e.preventDefault()
    try {
      const payload = new FormData();
      payload.append('first_name', formData.first_name);
      payload.append('last_name', formData.last_name);
      payload.append('email', formData.email);
      payload.append('address', formData.profile.address);
      payload.append('age', formData.profile.age);
      payload.append('birthday', formData.profile.birthday);
      if (formData.profile_image) {
        payload.append('profile_image', formData.profile_image);
      }

      await updateUser(payload);
      setIsEditing(false);
      setConfirmSave(false);
    } catch (error) {
      console.error('Failed to update profile', error)
    }
  };

  const renderField = (label, name, value, type = 'text', autoComplete) => (
    <div className="form-group">
      <label htmlFor={name}>{label}</label>
      {isEditing ? (
        <input
          type={type}
          id={name}
          name={name}
          value={value}
          onChange={handleChange}
          autoComplete={autoComplete}
        />
      ) : (
        <p>{value || 'Not set'}</p>
      )}
    </div>
  );

  const handleImageChange = (e) => {
    const file = e.target.files?.[0] || null;
    setFormData((prev) => ({ ...prev, profile_image: file }));
  };

  return (
    <div className="profile-page">
      <div className="profile-header">
        <div className="profile-title-wrap">
          <div className="profile-avatar">
            {imagePreview ? (
              <img src={imagePreview} alt="Profile" />
            ) : (
              <span>{(user?.first_name || user?.username || 'U').charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div>
            <h2>User Profile</h2>
            <p>{user?.is_active ? 'Account activated' : 'Account pending activation'}</p>
          </div>
        </div>
        {!isEditing && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-primary" onClick={() => setIsEditing(true)}>
              Edit Profile
            </button>
            {(user?.role === 'customer' || user?.role === 'user') && (
              <button
                className="btn btn-secondary"
                onClick={() => navigate('/apply-owner')}
                style={{ backgroundColor: '#f59e0b', color: 'white', border: 'none' }}
              >
                Apply for Owner
              </button>
            )}
          </div>
        )}
      </div>

      <form className="profile-form" onSubmit={handleSubmit}>
        <div className="form-grid">
          {renderField('First Name', 'first_name', formData.first_name, 'text', 'given-name')}
          {renderField('Last Name', 'last_name', formData.last_name, 'text', 'family-name')}
          {renderField('Email', 'email', formData.email, 'email', 'email')}
          {renderField('Address', 'address', formData.profile.address)}
          {renderField('Age', 'age', formData.profile.age, 'number')}
          {renderField('Birthday', 'birthday', formData.profile.birthday, 'date')}
        </div>

        {isEditing && (
          <div className="form-group" style={{ marginTop: '1.5rem' }}>
            <label htmlFor="profile_image">Profile picture</label>
            <input
              id="profile_image"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
            />
            {imagePreview && (
              <div style={{ marginTop: '1rem' }}>
                <img
                  src={imagePreview}
                  alt="Profile preview"
                  style={{ width: '140px', height: '140px', borderRadius: '18px', objectFit: 'cover', boxShadow: '0 12px 28px rgba(15, 23, 42, 0.12)' }}
                />
              </div>
            )}
          </div>
        )}

        {isEditing && (
          <div className="profile-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => { setIsEditing(false); setConfirmSave(false); }}
            >
              Cancel
            </button>

            {!confirmSave ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setConfirmSave(true)}
              >
                Save Changes
              </button>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 13, color: '#111827', fontWeight: 600 }}>
                  Save changes now?
                </span>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSubmit}
                >
                  Yes
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setConfirmSave(false)}
                >
                  No
                </button>
              </div>
            )}
          </div>
        )}
      </form>
    </div>
  );
};

export default Profile;

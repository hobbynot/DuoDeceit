import React, { useState, useRef, useEffect } from 'react';
import { useGameSocket } from '../../context/GameSocketContext.js';
import { DifficultyLevel, GameSettings, WordPair } from '@duodeceit/shared';
import {
  parseWordPairsFile,
  downloadSampleJsonTemplate,
  downloadSampleCsvTemplate,
} from '../../utils/fileParser.js';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { roomState, updateSettings, isHost } = useGameSocket();

  const [category, setCategory] = useState<string>('ALL');
  const [difficulty, setDifficulty] = useState<DifficultyLevel | 'ALL' | 'all'>('ALL');
  const [discussionDuration, setDiscussionDuration] = useState<number>(120);

  // File upload state
  const [customPairs, setCustomPairs] = useState<WordPair[] | null>(null);
  const [uploadStats, setUploadStats] = useState<{
    filename: string;
    count: number;
    categories: string[];
  } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync with current roomState settings when modal opens
  useEffect(() => {
    if (roomState?.settings) {
      setCategory(roomState.settings.category || 'ALL');
      setDifficulty(roomState.settings.difficulty || 'ALL');
      setDiscussionDuration(roomState.settings.discussionDuration || 120);

      if (roomState.settings.isCustomWordPack && roomState.settings.customPackName) {
        setUploadStats({
          filename: roomState.settings.customPackName,
          count: roomState.settings.totalAvailablePairs,
          categories: roomState.availableCategories || [],
        });
      }
    }
  }, [isOpen, roomState?.settings]);

  if (!isOpen) return null;

  const availableCategories = roomState?.availableCategories || [];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    const reader = new FileReader();

    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) {
        setUploadError('The selected file appears to be empty.');
        return;
      }

      const result = parseWordPairsFile(text, file.name);
      if (!result.success) {
        setUploadError(result.error || 'Failed to parse file.');
        return;
      }

      setCustomPairs(result.pairs);
      setUploadStats({
        filename: file.name,
        count: result.totalParsed,
        categories: result.categoriesFound,
      });
      // Reset category filter to ALL when a new file is uploaded
      setCategory('ALL');
    };

    reader.onerror = () => {
      setUploadError('Failed to read file from disk.');
    };

    reader.readAsText(file);
    // Clear input so selecting the same file again triggers change
    e.target.value = '';
  };

  const handleRemoveCustomPack = () => {
    setCustomPairs(null);
    setUploadStats(null);
    setUploadError(null);
    setCategory('ALL');
  };

  const handleSave = async () => {
    if (!isHost) return;
    setIsSaving(true);
    const payload: Partial<GameSettings> = {
      category,
      difficulty,
      discussionDuration,
    };

    if (customPairs) {
      payload.isCustomWordPack = true;
      payload.customPackName = uploadStats?.filename || 'Custom File';
    } else if (uploadStats === null && roomState?.settings?.isCustomWordPack) {
      // User removed the custom file
      payload.isCustomWordPack = false;
      payload.customPackName = undefined;
    }

    const res = await updateSettings(payload, customPairs || undefined);
    setIsSaving(false);
    if (res.success) {
      onClose();
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 7, 15, 0.85)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        animation: 'fadeIn 0.2s ease',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="glass card"
        style={{
          width: '100%',
          maxWidth: '580px',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '1.75rem',
          borderRadius: '16px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(99, 102, 241, 0.2)',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-bright)' }}>
              ⚙️ Game Settings
            </h2>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {isHost ? 'Configure word pool, difficulty, and timers for your room' : 'View active room settings'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="btn btn-secondary"
            style={{
              padding: '0.4rem 0.75rem',
              fontSize: '1rem',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Categories Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            📂 Word Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            disabled={!isHost}
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              backgroundColor: 'rgba(15, 23, 42, 0.8)',
              color: 'var(--text-bright)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '8px',
              fontSize: '0.95rem',
              outline: 'none',
              cursor: isHost ? 'pointer' : 'default',
            }}
          >
            <option value="ALL">🌐 All Categories ({roomState?.settings?.totalAvailablePairs || 0} pairs)</option>
            {availableCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Difficulty Level Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            🎯 Difficulty Level
          </label>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '0.5rem',
            }}
          >
            {(
              [
                { id: 'ALL', label: 'All', desc: 'Mixed' },
                { id: 'easy', label: 'Easy', desc: 'Clear' },
                { id: 'medium', label: 'Medium', desc: 'Nuanced' },
                { id: 'hard', label: 'Hard', desc: 'Subtle' },
              ] as const
            ).map((d) => {
              const isSelected = difficulty === d.id;
              return (
                <button
                  key={d.id}
                  type="button"
                  disabled={!isHost}
                  onClick={() => setDifficulty(d.id)}
                  style={{
                    padding: '0.6rem 0.25rem',
                    borderRadius: '8px',
                    border: isSelected
                      ? '2px solid var(--accent-primary, #6366f1)'
                      : '1px solid rgba(255, 255, 255, 0.1)',
                    backgroundColor: isSelected
                      ? 'rgba(99, 102, 241, 0.25)'
                      : 'rgba(15, 23, 42, 0.5)',
                    color: isSelected ? 'var(--accent-primary, #818cf8)' : 'var(--text-secondary)',
                    fontWeight: isSelected ? 700 : 500,
                    cursor: isHost ? 'pointer' : 'default',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span style={{ fontSize: '0.9rem' }}>{d.label}</span>
                  <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>{d.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Discussion Timer Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              ⏱️ Discussion Timer
            </label>
            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--accent-primary, #818cf8)' }}>
              {discussionDuration} seconds ({Math.floor(discussionDuration / 60)}m {discussionDuration % 60 ? `${discussionDuration % 60}s` : ''})
            </span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {[60, 90, 120, 180, 240].map((secs) => (
              <button
                key={secs}
                type="button"
                disabled={!isHost}
                onClick={() => setDiscussionDuration(secs)}
                className={`btn ${discussionDuration === secs ? 'btn-primary' : 'btn-secondary'}`}
                style={{
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.8rem',
                  borderRadius: '6px',
                  flex: 1,
                  minWidth: '60px',
                }}
              >
                {secs}s
              </button>
            ))}
          </div>
        </div>

        {/* Custom Word Pairs File Upload Section */}
        <div
          style={{
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            paddingTop: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              📁 Custom Word Pairs File (100s to 1000s)
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={downloadSampleJsonTemplate}
                style={{
                  fontSize: '0.75rem',
                  padding: '0.25rem 0.5rem',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '4px',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
                title="Download formatted JSON sample"
              >
                📥 JSON Sample
              </button>
              <button
                type="button"
                onClick={downloadSampleCsvTemplate}
                style={{
                  fontSize: '0.75rem',
                  padding: '0.25rem 0.5rem',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '4px',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
                title="Download formatted CSV sample"
              >
                📥 CSV Sample
              </button>
            </div>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            accept=".json,.csv,.txt"
            style={{ display: 'none' }}
            onChange={handleFileUpload}
          />

          {uploadStats ? (
            <div
              style={{
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontWeight: 700, color: '#4ade80', fontSize: '0.9rem' }}>
                  ✓ {uploadStats.filename}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Loaded {uploadStats.count} word pairs • {uploadStats.categories.length} categories
                </div>
              </div>
              {isHost && (
                <button
                  type="button"
                  onClick={handleRemoveCustomPack}
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.2)',
                    color: '#f87171',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    borderRadius: '6px',
                    padding: '0.35rem 0.6rem',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                  }}
                >
                  Reset to Default
                </button>
              )}
            </div>
          ) : (
            isHost && (
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: '2px dashed rgba(255, 255, 255, 0.2)',
                  borderRadius: '10px',
                  padding: '1.25rem',
                  textAlign: 'center',
                  cursor: 'pointer',
                  backgroundColor: 'rgba(15, 23, 42, 0.4)',
                  transition: 'border-color 0.2s',
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const file = e.dataTransfer.files?.[0];
                  if (file && fileInputRef.current) {
                    const dt = new DataTransfer();
                    dt.items.add(file);
                    fileInputRef.current.files = dt.files;
                    handleFileUpload({ target: fileInputRef.current } as any);
                  }
                }}
              >
                <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>📄</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Upload Word Pairs (.json, .csv, .txt)
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                  Supports up to thousands of custom word pairs with categories & difficulties
                </div>
              </div>
            )
          )}

          {uploadError && (
            <div
              style={{
                color: '#f87171',
                fontSize: '0.8rem',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                padding: '0.5rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid rgba(239, 68, 68, 0.2)',
              }}
            >
              ⚠️ {uploadError}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.75rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            paddingTop: '1rem',
            marginTop: '0.5rem',
          }}
        >
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            style={{ padding: '0.6rem 1.2rem' }}
          >
            {isHost ? 'Cancel' : 'Close'}
          </button>
          {isHost && (
            <button
              type="button"
              className="btn btn-primary"
              disabled={isSaving}
              onClick={handleSave}
              style={{
                padding: '0.6rem 1.4rem',
                minWidth: '120px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
              }}
            >
              {isSaving ? 'Saving...' : 'Apply Settings'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

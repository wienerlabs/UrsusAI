import { useEffect, useState } from 'react';
import { Edit3, X, Check } from 'lucide-react';

interface ProfileBioProps {
  bio: string;
  editable: boolean;
  saving?: boolean;
  onSave: (nextBio: string) => Promise<void> | void;
}

const MAX_BIO = 500;

export function ProfileBio({ bio, editable, saving, onSave }: ProfileBioProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(bio);

  useEffect(() => {
    if (!editing) setDraft(bio);
  }, [bio, editing]);

  const handleCancel = () => {
    setDraft(bio);
    setEditing(false);
  };

  const handleSave = async () => {
    const trimmed = draft.trim();
    if (trimmed === (bio || '').trim()) {
      setEditing(false);
      return;
    }
    await onSave(trimmed);
    setEditing(false);
  };

  return (
    <section aria-labelledby="profile-bio-heading" className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 id="profile-bio-heading" className="text-white font-medium">
          Bio
        </h3>
        {editable && !editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-[#d8e9ea] hover:text-[#b8d4d6] transition-colors"
            aria-label="Edit bio"
          >
            <Edit3 size={16} />
          </button>
        )}
      </div>

      {editing ? (
        <div>
          <textarea
            value={draft}
            maxLength={MAX_BIO}
            onChange={(e) => setDraft(e.target.value)}
            className="w-full bg-[#0a0a0a] border-2 border-[#2a2a2a] rounded-xl p-4 text-white placeholder-[#666] focus:outline-none focus:border-[#d8e9ea] transition-colors resize-none"
            rows={3}
            placeholder="Tell others about yourself"
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-[#a0a0a0]">
              {draft.length}/{MAX_BIO}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCancel}
                disabled={saving}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm text-[#a0a0a0] hover:text-white hover:bg-[#2a2a2a] transition-colors disabled:opacity-60"
              >
                <X size={14} />
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm bg-[#d8e9ea] text-black hover:bg-[#b8d4d6] transition-colors disabled:opacity-60"
              >
                <Check size={14} />
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-[#e5e5e5] leading-relaxed whitespace-pre-wrap min-h-[1.5rem]">
          {bio?.trim() || (
            <span className="text-[#666] italic">No bio yet.</span>
          )}
        </p>
      )}
    </section>
  );
}

export default ProfileBio;

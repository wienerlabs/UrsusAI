import { useState } from 'react';
import { ArrowLeft, Calendar, Check, Copy, Share2, Shield } from 'lucide-react';
import { copyToClipboard, formatJoinDate, truncateWallet } from '../../utils/profile';
import { UserProfileData } from '../../services/api';
import { AvatarUpload } from './AvatarUpload';

interface ProfileHeaderProps {
  profile: UserProfileData;
  displayWallet: string;
  isOwner: boolean;
  onBack: () => void;
  onAvatarChange: (absoluteUrl: string) => Promise<void> | void;
}

export function ProfileHeader({
  profile,
  displayWallet,
  isOwner,
  onBack,
  onAvatarChange,
}: ProfileHeaderProps) {
  const [copiedWallet, setCopiedWallet] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  const displayName =
    profile.profileExtended?.displayName ||
    profile.username ||
    truncateWallet(displayWallet);

  const handleCopyWallet = async () => {
    const ok = await copyToClipboard(displayWallet);
    if (ok) {
      setCopiedWallet(true);
      window.setTimeout(() => setCopiedWallet(false), 1500);
    }
  };

  const handleShareProfile = async () => {
    const url = `${window.location.origin}/profile?wallet=${displayWallet}`;
    const ok = await copyToClipboard(url);
    if (ok) {
      setCopiedShare(true);
      window.setTimeout(() => setCopiedShare(false), 1500);
    }
  };

  return (
    <div className="relative bg-gradient-to-b from-[#0a0a0a] to-[#1a1a1a] pt-10 pb-8">
      <button
        onClick={onBack}
        className="absolute top-6 left-6 flex items-center gap-2 text-[#a0a0a0] hover:text-white transition-colors"
      >
        <ArrowLeft size={16} />
        <span className="text-sm">Back</span>
      </button>

      <div className="flex flex-col items-center text-center px-4">
        <AvatarUpload
          currentAvatar={profile.avatar}
          username={profile.username || displayName}
          editable={isOwner}
          onUploaded={onAvatarChange}
        />

        <div className="flex items-center justify-center gap-2 mt-4 mb-1">
          <h1 className="text-white text-3xl font-bold">{displayName}</h1>
          {profile.isVerified && (
            <div
              className="p-1 bg-[#d8e9ea] rounded-full"
              title={`Verified (${profile.verificationLevel})`}
            >
              <Shield size={16} className="text-black" />
            </div>
          )}
        </div>

        {profile.username && profile.profileExtended?.displayName && (
          <p className="text-[#a0a0a0] text-sm mb-2">@{profile.username}</p>
        )}

        <div className="flex flex-wrap items-center justify-center gap-3 text-[#a0a0a0] text-sm">
          <span className="flex items-center gap-1">
            <Calendar size={14} />
            Joined {formatJoinDate(profile.createdAt)}
          </span>

          <button
            type="button"
            onClick={handleCopyWallet}
            className="flex items-center gap-1 hover:text-white transition-colors"
            aria-label="Copy wallet address"
          >
            {copiedWallet ? <Check size={14} /> : <Copy size={14} />}
            <span>{truncateWallet(displayWallet)}</span>
          </button>

          <button
            type="button"
            onClick={handleShareProfile}
            className="flex items-center gap-1 hover:text-white transition-colors"
            aria-label="Copy shareable profile link"
          >
            {copiedShare ? <Check size={14} /> : <Share2 size={14} />}
            <span>{copiedShare ? 'Link copied' : 'Share'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProfileHeader;

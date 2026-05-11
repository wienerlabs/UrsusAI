import { Globe, Send, Twitter } from 'lucide-react';
import { UserProfileData } from '../../services/api';

interface ProfileSocialLinksProps {
  socialLinks: UserProfileData['socialLinks'];
}

interface LinkEntry {
  key: keyof UserProfileData['socialLinks'];
  label: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
  url: string;
}

function DiscordGlyph({ size = 18, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M20.317 4.369A19.791 19.791 0 0016.558 3.1a.08.08 0 00-.082.038c-.357.63-.755 1.453-1.03 2.098a18.29 18.29 0 00-5.487 0c-.275-.66-.687-1.468-1.046-2.098a.083.083 0 00-.082-.038 19.736 19.736 0 00-3.76 1.269.08.08 0 00-.035.032C.533 9.046-.32 13.58.099 18.057a.084.084 0 00.031.057 19.9 19.9 0 005.993 3.03.08.08 0 00.087-.028c.462-.63.873-1.295 1.226-1.994a.08.08 0 00-.041-.111 13.21 13.21 0 01-1.872-.892.08.08 0 01-.008-.133c.126-.094.252-.192.371-.291a.08.08 0 01.084-.011c3.927 1.793 8.18 1.793 12.061 0a.08.08 0 01.085.01c.12.1.245.198.372.292a.08.08 0 01-.007.133c-.598.349-1.22.644-1.873.891a.08.08 0 00-.04.112c.36.698.771 1.363 1.225 1.993a.08.08 0 00.087.029 19.85 19.85 0 006.002-3.03.08.08 0 00.031-.056c.5-5.177-.838-9.674-3.548-13.66a.063.063 0 00-.033-.031zM8.02 15.331c-1.182 0-2.157-1.085-2.157-2.419 0-1.333.956-2.418 2.157-2.418 1.21 0 2.175 1.094 2.157 2.418 0 1.334-.957 2.419-2.157 2.419zm7.975 0c-1.182 0-2.157-1.085-2.157-2.419 0-1.333.955-2.418 2.157-2.418 1.21 0 2.175 1.094 2.157 2.418 0 1.334-.946 2.419-2.157 2.419z" />
    </svg>
  );
}

export function ProfileSocialLinks({ socialLinks }: ProfileSocialLinksProps) {
  const entries: LinkEntry[] = [
    {
      key: 'twitter',
      label: 'Twitter',
      Icon: Twitter,
      url: socialLinks.twitter,
    },
    {
      key: 'discord',
      label: 'Discord',
      Icon: DiscordGlyph,
      url: socialLinks.discord,
    },
    {
      key: 'telegram',
      label: 'Telegram',
      Icon: Send,
      url: socialLinks.telegram,
    },
    {
      key: 'website',
      label: 'Website',
      Icon: Globe,
      url: socialLinks.website,
    },
  ];

  const hasAny = entries.some((e) => !!e.url);

  return (
    <section aria-labelledby="profile-social-heading" className="mb-8">
      <h3 id="profile-social-heading" className="text-white font-medium mb-3">
        Social Links
      </h3>
      {hasAny ? (
        <div className="flex flex-wrap gap-4">
          {entries
            .filter((e) => !!e.url)
            .map(({ key, label, Icon, url }) => (
              <a
                key={key}
                href={url}
                target="_blank"
                rel="noreferrer noopener"
                className="flex items-center gap-2 text-[#a0a0a0] hover:text-[#d8e9ea] transition-colors"
              >
                <Icon size={18} />
                <span className="text-sm">{label}</span>
              </a>
            ))}
        </div>
      ) : (
        <p className="text-[#666] text-sm italic">No social links added yet.</p>
      )}
    </section>
  );
}

export default ProfileSocialLinks;

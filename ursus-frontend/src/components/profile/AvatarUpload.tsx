import { useCallback, useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import apiService from '../../services/api';

interface AvatarUploadProps {
  currentAvatar: string | null;
  username: string;
  editable: boolean;
  onUploaded: (url: string) => Promise<void> | void;
}

const MAX_FILE_BYTES = 5 * 1024 * 1024; // Matches backend multer limit
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// Normalize a backend-relative upload URL to an absolute URL the browser can fetch.
function resolveAvatarUrl(imageUrl: string): string {
  if (!imageUrl) return '';
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;
  const apiBase = (import.meta.env.VITE_API_URL || '/api').replace(/\/api$/, '');
  return `${apiBase}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
}

export function AvatarUpload({
  currentAvatar,
  username,
  editable,
  onUploaded,
}: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initial = (username || 'A').charAt(0).toUpperCase();
  const displayUrl = currentAvatar ? resolveAvatarUrl(currentAvatar) : '';

  const handlePick = useCallback(() => {
    if (!editable || uploading) return;
    inputRef.current?.click();
  }, [editable, uploading]);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);

      if (!ALLOWED_TYPES.includes(file.type)) {
        setError('Only JPG, PNG, WebP, or GIF images are allowed.');
        return;
      }
      if (file.size > MAX_FILE_BYTES) {
        setError('Image must be 5 MB or smaller.');
        return;
      }

      setUploading(true);
      try {
        const result = await apiService.uploadImage(file);
        if (!result?.imageUrl) {
          throw new Error('Upload did not return an image URL');
        }
        const absolute = resolveAvatarUrl(result.imageUrl);
        await onUploaded(absolute);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Upload failed';
        setError(message);
      } finally {
        setUploading(false);
      }
    },
    [onUploaded]
  );

  const onChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      await handleFile(file);
      // Reset input so selecting the same file twice still fires change.
      if (inputRef.current) inputRef.current.value = '';
    },
    [handleFile]
  );

  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        onClick={handlePick}
        disabled={!editable || uploading}
        aria-label={editable ? 'Change profile picture' : 'Profile picture'}
        className={`relative group w-[120px] h-[120px] rounded-full overflow-hidden flex items-center justify-center bg-gradient-to-br from-[#d8e9ea] to-[#b8d4d6] text-4xl font-bold text-black ${
          editable ? 'cursor-pointer' : 'cursor-default'
        }`}
      >
        {displayUrl ? (
          <img
            src={displayUrl}
            alt={`${username || 'user'} avatar`}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <span aria-hidden="true">{initial}</span>
        )}

        {editable && (
          <span className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            {uploading ? (
              <Loader2 className="text-white animate-spin" size={22} />
            ) : (
              <Camera className="text-white" size={22} />
            )}
          </span>
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_TYPES.join(',')}
        className="hidden"
        onChange={onChange}
      />

      {error && (
        <p role="alert" className="mt-2 text-xs text-[#ef4444] text-center max-w-[200px]">
          {error}
        </p>
      )}
    </div>
  );
}

export default AvatarUpload;

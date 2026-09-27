import { Link } from 'react-router-dom';
import { avatarColor, avatarInitial } from '../lib/logic';
import { avatarUrl } from '../lib/accounts';
import { DiverAvatar, normalizeAvatarStyle } from './DiverAvatar';

export function Avatar({
  id,
  name,
  path,
  style,
  link = false,
  small = false
}: {
  id?: string;
  name: string;
  path?: string | null;
  style?: unknown;
  link?: boolean;
  small?: boolean;
}) {
  const image = avatarUrl(path);
  const avatarStyle = normalizeAvatarStyle(style);
  const content = image ? (
    <img src={image} alt="" />
  ) : avatarStyle ? (
    <DiverAvatar style={avatarStyle} />
  ) : (
    <span style={{ backgroundColor: avatarColor(name) }}>{avatarInitial(name)}</span>
  );
  const className = `avatar${small ? ' avatar-small' : ''}`;
  return link && id ? (
    <Link className={className} to={`/members/${id}`} aria-label={`${name}のプロフィール`}>
      {content}
    </Link>
  ) : (
    <span className={className}>{content}</span>
  );
}

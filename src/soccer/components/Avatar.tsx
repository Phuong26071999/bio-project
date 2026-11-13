import React, { useEffect, useState } from 'react';
import { Member } from '../types';
import { avatarColor, initials } from '../utils';

interface Props {
  member: Pick<Member, 'id' | 'name' | 'avatar'>;
  size?: number;
}

/** Photo when an avatar URL is set (and loads), otherwise coloured initials. */
const Avatar = ({ member, size = 48 }: Props) => {
  const [broken, setBroken] = useState(false);
  // A new photo gets a fresh chance to load.
  useEffect(() => setBroken(false), [member.avatar]);
  const style = { width: size, height: size, fontSize: size * 0.38 };
  if (member.avatar && !broken) {
    return <img className="sc-avatar" src={member.avatar} alt="" style={style} loading="lazy" onError={() => setBroken(true)} />;
  }
  return (
    <span className="sc-avatar" style={{ ...style, background: avatarColor(member.id) }} aria-hidden="true">
      {initials(member.name)}
    </span>
  );
};

export default Avatar;

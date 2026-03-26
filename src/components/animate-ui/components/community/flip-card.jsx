import { Button } from '../../../ui/Button';
import * as React from 'react';
import { Github, Linkedin, Twitter } from 'lucide-react';

export function FlipCard({
  data
}) {
  const [isFlipped, setIsFlipped] = React.useState(false);

  const isTouchDevice =
    typeof window !== 'undefined' && 'ontouchstart' in window;

  const handleClick = () => {
    if (isTouchDevice) setIsFlipped(!isFlipped);
  };

  const handleMouseEnter = () => {
    if (!isTouchDevice) setIsFlipped(true);
  };

  const handleMouseLeave = () => {
    if (!isTouchDevice) setIsFlipped(false);
  };

  return (
    <div
      className="mt-2 w-40 h-60 md:w-60 md:h-80 [perspective:1000px] cursor-pointer mx-auto"
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}>
      <div
        className={`relative w-full h-full transition-transform duration-500 [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}
      >
        {/* FRONT: Profile */}
        <div className="absolute inset-0 [backface-visibility:hidden] rounded-md border-2 border-foreground/20 px-4 py-6 flex flex-col items-center justify-center bg-gradient-to-br from-muted via-background to-muted text-center">
          <img
            src={data.image}
            alt={data.name}
            className="size-20 md:size-24 rounded-full object-cover mb-4 border-2" />
          <h2 className="text-lg font-bold text-foreground">{data.name}</h2>
          <p className="text-sm text-muted-foreground">@{data.username}</p>
        </div>
        {/* BACK: Bio + Stats + Socials */}
        <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] rounded-md border-2 border-foreground/20 px-4 py-6 flex flex-col justify-between items-center gap-y-4 bg-gradient-to-tr from-muted via-background to-muted">
          <p className="text-xs md:text-sm text-muted-foreground text-center">
            {data.bio}
          </p>

          <div className="px-6 flex items-center justify-between w-full">
            <div>
              <p className="text-base font-bold">{data.stats.following}</p>
              <p className="text-xs text-muted-foreground">Following</p>
            </div>
            <div>
              <p className="text-base font-bold">{data.stats.followers}</p>
              <p className="text-xs text-muted-foreground">Followers</p>
            </div>
            {data.stats.posts && (
              <div>
                <p className="text-base font-bold">{data.stats.posts}</p>
                <p className="text-xs text-muted-foreground">Posts</p>
              </div>
            )}
          </div>

          {/* Social Media Icons */}
          <div className="flex items-center justify-center gap-4">
            {data.socialLinks?.linkedin && (
              <a
                href={data.socialLinks.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:scale-105 transition-transform">
                <Linkedin size={20} />
              </a>
            )}
            {data.socialLinks?.github && (
              <a
                href={data.socialLinks.github}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:scale-105 transition-transform">
                <Github size={20} />
              </a>
            )}
            {data.socialLinks?.twitter && (
              <a
                href={data.socialLinks.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:scale-105 transition-transform">
                <Twitter size={20} />
              </a>
            )}
          </div>

          <Button>Follow</Button>
        </div>
      </div>
    </div>
  );
}

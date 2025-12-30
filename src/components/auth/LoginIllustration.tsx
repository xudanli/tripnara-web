import { useTranslation } from 'react-i18next';

export default function LoginIllustration() {
  const { t } = useTranslation();

  return (
    <div className="relative w-full h-full flex flex-col justify-center items-center p-12 bg-gray-50">
      <div className="max-w-md space-y-6">
        <h1 className="text-4xl md:text-5xl font-bold text-black leading-tight">
          {t('login.heroTitle')}
        </h1>
        <p className="text-lg text-gray-600">
          {t('login.heroSubtitle')}
        </p>
      </div>

      {/* Decorative illustrations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Moon */}
        <svg
          className="absolute top-10 left-10 w-12 h-12 text-black"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
          />
        </svg>

        {/* Star */}
        <svg
          className="absolute top-16 right-20 w-8 h-8 text-black"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>

        {/* Dandelion-like flower */}
        <div className="absolute top-1/3 right-16">
          <svg width="40" height="80" viewBox="0 0 40 80" fill="none" stroke="black" strokeWidth="1.5">
            <circle cx="20" cy="10" r="8" fill="black" />
            <circle cx="16" cy="12" r="1.5" fill="black" />
            <circle cx="24" cy="12" r="1.5" fill="black" />
            <circle cx="18" cy="8" r="1.5" fill="black" />
            <circle cx="22" cy="8" r="1.5" fill="black" />
            <line x1="20" y1="18" x2="20" y2="80" strokeLinecap="round" />
          </svg>
        </div>

        {/* Person figure */}
        <div className="absolute bottom-32 right-32">
          <svg width="60" height="80" viewBox="0 0 60 80" fill="none" stroke="black" strokeWidth="2">
            {/* Head */}
            <circle cx="30" cy="15" r="8" />
            {/* Body */}
            <line x1="30" y1="23" x2="30" y2="50" />
            {/* Arms */}
            <line x1="30" y1="35" x2="20" y2="45" />
            <line x1="30" y1="35" x2="40" y2="45" />
            {/* Legs */}
            <line x1="30" y1="50" x2="25" y2="65" />
            <line x1="30" y1="50" x2="35" y2="65" />
            {/* Cushion/abstract shape */}
            <ellipse cx="35" cy="60" rx="15" ry="8" fill="black" opacity="0.2" />
          </svg>
          
          {/* Butterfly */}
          <svg
            className="absolute -top-4 -left-2 w-8 h-8 text-green-500"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 2C8.13 2 5 5.13 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.87-3.13-7-7-7zm0 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" />
          </svg>
        </div>

        {/* Another star */}
        <svg
          className="absolute bottom-40 left-1/4 w-6 h-6 text-black"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>

        {/* Swirling shape */}
        <svg
          className="absolute bottom-20 left-16 w-16 h-16 text-black"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6v6l4 2"
          />
        </svg>

        {/* Plant with leaves */}
        <div className="absolute bottom-16 left-10">
          <svg width="40" height="60" viewBox="0 0 40 60" fill="none" stroke="black" strokeWidth="1.5">
            <line x1="20" y1="0" x2="20" y2="60" strokeLinecap="round" />
            <path d="M20 10 Q15 15 15 20" />
            <path d="M20 15 Q25 20 25 25" />
            <path d="M20 25 Q15 30 15 35" />
            <path d="M20 30 Q25 35 25 40" />
          </svg>
        </div>
      </div>
    </div>
  );
}


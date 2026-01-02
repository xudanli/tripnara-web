import { useTranslation } from 'react-i18next';
import { Mountains } from '@/components/illustrations/SimpleIllustrations';

export default function DEMTopographySection() {
  const { t } = useTranslation();

  const features = [
    t('demTopography.slope', { defaultValue: '坡度' }),
    t('demTopography.ascent', { defaultValue: '累积爬升' }),
    t('demTopography.difficulty', { defaultValue: '难度强度' }),
    t('demTopography.fatigue', { defaultValue: '疲劳趋势' }),
  ];

  return (
    <section
      style={{
        padding: '6rem 2rem',
        backgroundColor: '#f8f9fa',
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '4rem',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <Mountains size={350} color="#000" />
          </div>

          <div>
            <h2
              style={{
                fontSize: 'clamp(2rem, 4vw, 2.5rem)',
                fontWeight: '700',
                marginBottom: '2rem',
                color: '#000',
              }}
            >
              {t('demTopography.title', {
                defaultValue: '地形，是旅行计划的真相层',
              })}
            </h2>

            <p
              style={{
                fontSize: '1.2rem',
                lineHeight: '1.8',
                color: '#666',
                marginBottom: '2rem',
              }}
            >
              {t('demTopography.description', {
                defaultValue: 'TripNARA 以地形为真相层。坡度、累计爬升、走行难度，不再凭感觉。',
              })}
            </p>

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.75rem',
              }}
            >
              {features.map((feature, idx) => (
                <span
                  key={idx}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#fff',
                    color: '#333',
                    fontSize: '0.95rem',
                    borderRadius: '8px',
                    border: '1px solid #e0e0e0',
                  }}
                >
                  {feature}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}


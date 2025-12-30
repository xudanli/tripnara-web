import { useTranslation } from 'react-i18next';
import { ContentCollection, BrowserExtension, MobileApp } from '@/components/illustrations/SceneIllustrations';

export default function ContentSaveSection() {
  const { t } = useTranslation();
  return (
    <section
      style={{
        padding: '6rem 2rem',
        backgroundColor: '#fff',
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
        }}
      >
        {/* Main illustration and text */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '4rem',
            alignItems: 'center',
            marginBottom: '6rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <ContentCollection size={450} color="#000" />
          </div>
          <div>
            <h2
              style={{
                fontSize: 'clamp(2rem, 4vw, 2.5rem)',
                fontWeight: '700',
                marginBottom: '1.5rem',
                color: '#000',
              }}
            >
              {t('contentSave.title', { defaultValue: '随时随地保存任何内容' })}
            </h2>
            <p
              style={{
                fontSize: '1.1rem',
                lineHeight: '1.8',
                color: '#333',
                marginBottom: '1.5rem',
              }}
            >
              {t('contentSave.description1', {
                defaultValue: '灵感无处不在。除了上传文件，TripNARA 还让你通过浏览器插件或移动应用捕捉想法、保存素材。',
              })}
            </p>
            <p
              style={{
                fontSize: '1.1rem',
                lineHeight: '1.8',
                color: '#333',
              }}
            >
              {t('contentSave.description2', {
                defaultValue: '支持 PDF、网页、地图、路线、地点、照片等等。',
              })}
            </p>
          </div>
        </div>

        {/* Browser extension and mobile app */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '3rem',
          }}
        >
          <div
            style={{
              textAlign: 'center',
              padding: '2rem',
            }}
          >
            <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'center' }}>
              <BrowserExtension size={280} color="#000" />
            </div>
            <h3
              style={{
                fontSize: '1.5rem',
                fontWeight: '600',
                marginBottom: '1rem',
                color: '#000',
              }}
            >
              {t('contentSave.browserExtension', { defaultValue: '浏览器插件' })}
            </h3>
            <p style={{ color: '#666', lineHeight: '1.6' }}>
              {t('contentSave.browserExtensionDesc', {
                defaultValue: '浏览时随手保存任何内容',
              })}
            </p>
          </div>

          <div
            style={{
              textAlign: 'center',
              padding: '2rem',
            }}
          >
            <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'center' }}>
              <MobileApp size={280} color="#000" />
            </div>
            <h3
              style={{
                fontSize: '1.5rem',
                fontWeight: '600',
                marginBottom: '1rem',
                color: '#000',
              }}
            >
              {t('contentSave.mobileApp', { defaultValue: '移动应用' })}
            </h3>
            <p style={{ color: '#666', lineHeight: '1.6' }}>
              {t('contentSave.mobileAppDesc', {
                defaultValue: '口袋里的路线规划助手',
              })}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}


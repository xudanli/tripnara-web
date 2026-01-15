import { useTranslation } from 'react-i18next';
import { ContentCollection, BrowserExtension, MobileApp } from '@/components/illustrations/SceneIllustrations';
import { WebsiteSection } from '@/components/website/WebsiteSection';
import { WebsiteHeading } from '@/components/website/WebsiteHeading';

export default function ContentSaveSection() {
  const { t } = useTranslation();
  return (
    <WebsiteSection variant="default" padding="xl" maxWidth="xl">
      {/* Main illustration and text */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center mb-24">
        <div className="flex justify-center">
          <ContentCollection size={450} className="text-foreground" />
        </div>
        <div>
          <WebsiteHeading level={2} className="mb-6">
            {t('contentSave.title', { defaultValue: '随时随地保存任何内容' })}
          </WebsiteHeading>
          <p className="text-lg leading-relaxed text-foreground mb-6">
            {t('contentSave.description1', {
              defaultValue: '灵感无处不在。除了上传文件，TripNARA 还让你通过浏览器插件或移动应用捕捉想法、保存素材。',
            })}
          </p>
          <p className="text-lg leading-relaxed text-foreground">
            {t('contentSave.description2', {
              defaultValue: '支持 PDF、网页、地图、路线、地点、照片等等。',
            })}
          </p>
        </div>
      </div>

      {/* Browser extension and mobile app */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div className="text-center p-8">
          <div className="mb-8 flex justify-center">
            <BrowserExtension size={280} className="text-foreground" />
          </div>
          <h3 className="text-2xl font-semibold mb-4 text-foreground">
            {t('contentSave.browserExtension', { defaultValue: '浏览器插件' })}
          </h3>
          <p className="text-muted-foreground leading-relaxed">
            {t('contentSave.browserExtensionDesc', {
              defaultValue: '浏览时随手保存任何内容',
            })}
          </p>
        </div>

        <div className="text-center p-8">
          <div className="mb-8 flex justify-center">
            <MobileApp size={280} className="text-foreground" />
          </div>
          <h3 className="text-2xl font-semibold mb-4 text-foreground">
            {t('contentSave.mobileApp', { defaultValue: '移动应用' })}
          </h3>
          <p className="text-muted-foreground leading-relaxed">
            {t('contentSave.mobileAppDesc', {
              defaultValue: '口袋里的路线规划助手',
            })}
          </p>
        </div>
      </div>
    </WebsiteSection>
  );
}

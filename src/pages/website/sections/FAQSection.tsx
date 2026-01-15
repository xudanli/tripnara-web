import { useTranslation } from 'react-i18next';
import { WebsiteSection } from '@/components/website/WebsiteSection';
import { WebsiteHeading } from '@/components/website/WebsiteHeading';
import { WebsiteCard, CardContent } from '@/components/website/WebsiteCard';

export default function FAQSection() {
  const { t } = useTranslation();

  const faqs = [
    {
      question: t('faq.question1', {
        defaultValue: 'TripNARA 会替我决定一切吗？',
      }),
      answer: t('faq.answer1', {
        defaultValue: '不会。我们会给你"建议 + 证据 + 备选"。',
      }),
    },
  ];

  return (
    <WebsiteSection variant="default" padding="xl" maxWidth="lg">
      <WebsiteHeading level={2} align="center" className="mb-16">
        {t('faq.title', { defaultValue: '常见问题' })}
      </WebsiteHeading>

      <div className="flex flex-col gap-8">
        {faqs.map((faq, idx) => (
          <WebsiteCard key={idx}>
            <CardContent className="p-8">
              <h3 className="text-xl font-semibold mb-4 text-foreground">
                {faq.question}
              </h3>
              <p className="text-base text-muted-foreground leading-relaxed">
                {faq.answer}
              </p>
            </CardContent>
          </WebsiteCard>
        ))}
      </div>
    </WebsiteSection>
  );
}

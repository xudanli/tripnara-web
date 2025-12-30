import { useTranslation } from 'react-i18next';

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
    <section
      style={{
        padding: '6rem 2rem',
        backgroundColor: '#fff',
      }}
    >
      <div
        style={{
          maxWidth: '800px',
          margin: '0 auto',
        }}
      >
        <h2
          style={{
            fontSize: 'clamp(2rem, 4vw, 2.5rem)',
            fontWeight: '700',
            textAlign: 'center',
            marginBottom: '4rem',
            color: '#000',
          }}
        >
          {t('faq.title', { defaultValue: '常见问题' })}
        </h2>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '2rem',
          }}
        >
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              style={{
                padding: '2rem',
                border: '1px solid #e0e0e0',
                borderRadius: '12px',
                backgroundColor: '#fff',
              }}
            >
              <h3
                style={{
                  fontSize: '1.2rem',
                  fontWeight: '600',
                  marginBottom: '1rem',
                  color: '#000',
                }}
              >
                {faq.question}
              </h3>
              <p
                style={{
                  fontSize: '1rem',
                  color: '#666',
                  lineHeight: '1.7',
                }}
              >
                {faq.answer}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}


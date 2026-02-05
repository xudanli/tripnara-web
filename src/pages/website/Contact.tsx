import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PersonSitting, PersonThinking, Route, Compass, Mountains } from '@/components/illustrations/SimpleIllustrations';

export default function ContactPage() {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  });
  const [expandedPosition, setExpandedPosition] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement form submission
    console.log('Form submitted:', formData);
  };

  const positions = [
    { key: 'product', icon: PersonThinking, title: t('about.recruiting.positions.product.title') },
    { key: 'data', icon: Route, title: t('about.recruiting.positions.data.title') },
    { key: 'geography', icon: Mountains, title: t('about.recruiting.positions.geography.title') },
    { key: 'ai', icon: Compass, title: t('about.recruiting.positions.ai.title') },
    { key: 'outdoor', icon: Mountains, title: t('about.recruiting.positions.outdoor.title') },
    { key: 'design', icon: PersonSitting, title: t('about.recruiting.positions.design.title') },
  ];

  return (
    <div style={{ backgroundColor: '#fff' }}>
      {/* SECTION 1 · Hero - 招聘标题 */}
      <section
        style={{
          padding: '6rem 2rem',
          textAlign: 'center',
          maxWidth: '1000px',
          margin: '0 auto',
        }}
      >
        <div style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'center' }}>
          <PersonSitting size={180} color="#000" />
        </div>
        <h1
          style={{
            fontSize: 'clamp(2.5rem, 5vw, 3.5rem)',
            fontWeight: '700',
            marginBottom: '1.5rem',
            color: '#000',
            lineHeight: '1.3',
          }}
        >
          {t('contact.recruiting.title')}
        </h1>
        <p
          style={{
            fontSize: 'clamp(1.2rem, 2.5vw, 1.5rem)',
            lineHeight: '1.8',
            color: '#666',
            marginBottom: '2rem',
            fontStyle: 'italic',
          }}
        >
          {t('contact.recruiting.subtitle')}
        </p>
      </section>

      {/* SECTION 2 · 引导文案 */}
      <section
        style={{
          padding: '4rem 2rem',
          backgroundColor: '#f8f9fa',
        }}
      >
        <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
          <p
            style={{
              fontSize: 'clamp(1.1rem, 2vw, 1.3rem)',
              lineHeight: '1.8',
              color: '#333',
              marginBottom: '1.5rem',
            }}
          >
            {t('contact.recruiting.intro')}
          </p>
          <p
            style={{
              fontSize: 'clamp(1.1rem, 2vw, 1.3rem)',
              lineHeight: '1.8',
              color: '#333',
              marginBottom: '1.5rem',
            }}
          >
            {t('contact.recruiting.intro2')}
          </p>
          <p
            style={{
              fontSize: 'clamp(1.1rem, 2vw, 1.3rem)',
              lineHeight: '1.8',
              color: '#333',
            }}
          >
            {t('contact.recruiting.intro3')}
          </p>
        </div>
      </section>

      {/* SECTION 3 · 投递方式 */}
      <section
        style={{
          padding: '6rem 2rem',
          backgroundColor: '#fff',
        }}
      >
        <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
          <h2
            style={{
              fontSize: 'clamp(2rem, 4vw, 2.5rem)',
              fontWeight: '700',
              marginBottom: '2rem',
              color: '#000',
            }}
          >
            {t('contact.recruiting.apply.title')}
          </h2>
          <p
            style={{
              fontSize: 'clamp(1.1rem, 2vw, 1.3rem)',
              lineHeight: '1.8',
              color: '#666',
              marginBottom: '2rem',
            }}
          >
            {t('contact.recruiting.apply.text')}
          </p>
          <div
            style={{
              padding: '2rem',
              backgroundColor: '#f8f9fa',
              border: '1px solid #e0e0e0',
              borderRadius: '12px',
              marginBottom: '1.5rem',
            }}
          >
            <p
              style={{
                fontSize: '1.1rem',
                fontWeight: '600',
                color: '#000',
                marginBottom: '0.5rem',
              }}
            >
              {t('contact.recruiting.apply.email')}
            </p>
          </div>
          <p
            style={{
              fontSize: '1rem',
              lineHeight: '1.8',
              color: '#666',
            }}
          >
            {t('contact.recruiting.apply.note')}
          </p>
        </div>
      </section>

      {/* SECTION 4 · 职位板块 */}
      <section
        style={{
          padding: '6rem 2rem',
          backgroundColor: '#f8f9fa',
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2
            style={{
              fontSize: 'clamp(2rem, 4vw, 2.5rem)',
              fontWeight: '700',
              marginBottom: '3rem',
              textAlign: 'center',
              color: '#000',
            }}
          >
            开放职位
          </h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
              gap: '2rem',
            }}
          >
            {positions.map(({ key, icon: Icon, title }) => (
              <div
                key={key}
                style={{
                  padding: '2.5rem',
                  backgroundColor: '#fff',
                  border: '1px solid #e0e0e0',
                  borderRadius: '12px',
                  transition: 'all 0.3s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      backgroundColor: 'oklch(0.205 0 0)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={24} color="#fff" />
                  </div>
                  <h3
                    style={{
                      fontSize: '1.3rem',
                      fontWeight: '700',
                      color: '#000',
                      margin: 0,
                    }}
                  >
                    {title}
                  </h3>
                </div>

                <p
                  style={{
                    fontSize: '1.1rem',
                    fontWeight: '600',
                    color: '#000',
                    marginBottom: '1.5rem',
                    lineHeight: '1.6',
                    fontStyle: 'italic',
                  }}
                >
                  「{t(`contact.recruiting.positions.${key}.tagline`)}」
                </p>

                <div style={{ marginBottom: '1.5rem' }}>
                  <p
                    style={{
                      fontSize: '0.95rem',
                      fontWeight: '600',
                      color: '#333',
                      marginBottom: '0.75rem',
                    }}
                  >
                    我们希望你：
                  </p>
                  <ul
                    style={{
                      listStyle: 'none',
                      padding: 0,
                      margin: 0,
                    }}
                  >
                    {(() => {
                      const expectations = t(`contact.recruiting.positions.${key}.expectations`, { returnObjects: true });
                      const expectationsArray = Array.isArray(expectations) ? expectations : [];
                      return expectationsArray.map((expectation: string, idx: number) => (
                        <li
                          key={idx}
                          style={{
                            padding: '0.5rem 0',
                            fontSize: '0.95rem',
                            color: '#666',
                            lineHeight: '1.6',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '0.5rem',
                          }}
                        >
                          <span style={{ color: 'oklch(0.205 0 0)', fontSize: '0.8rem', marginTop: '0.3rem', flexShrink: 0 }}>•</span>
                          <span>{expectation}</span>
                        </li>
                      ));
                    })()}
                  </ul>
                </div>

                <div
                  style={{
                    display: 'flex',
                    gap: '1rem',
                    flexWrap: 'wrap',
                  }}
                >
                  <a
                    href={`mailto:join@tripnara.com?subject=投递简历 - ${title}`}
                    style={{
                      display: 'inline-block',
                      padding: '0.75rem 1.5rem',
                      backgroundColor: 'oklch(0.205 0 0)',
                      color: '#fff',
                      textDecoration: 'none',
                      borderRadius: '6px',
                      fontWeight: '600',
                      fontSize: '0.95rem',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'oklch(0.25 0 0)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'oklch(0.205 0 0)';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    {t('contact.recruiting.applyButton')}
                  </a>
                  <button
                    onClick={() => setExpandedPosition(expandedPosition === key ? null : key)}
                    style={{
                      padding: '0.75rem 1.5rem',
                      backgroundColor: 'transparent',
                      color: 'oklch(0.205 0 0)',
                      border: '1px solid oklch(0.205 0 0)',
                      borderRadius: '6px',
                      fontWeight: '600',
                      fontSize: '0.95rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f8f9fa';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    {t('contact.recruiting.viewFullDesc')}
                    {expandedPosition === key ? ' ▲' : ' ▼'}
                  </button>
                </div>

                {expandedPosition === key && (
                  <div
                    style={{
                      marginTop: '1.5rem',
                      padding: '1.5rem',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '8px',
                      border: '1px solid #e0e0e0',
                    }}
                  >
                    <p
                      style={{
                        fontSize: '0.95rem',
                        fontWeight: '600',
                        color: '#333',
                        marginBottom: '0.75rem',
                      }}
                    >
                      完整职位描述：
                    </p>
                    <ul
                      style={{
                        listStyle: 'none',
                        padding: 0,
                        margin: 0,
                      }}
                    >
                      {(t(`about.recruiting.positions.${key}.requirements`, { returnObjects: true }) as string[] || []).map((requirement, idx) => (
                        <li
                          key={idx}
                          style={{
                            padding: '0.5rem 0',
                            fontSize: '0.95rem',
                            color: '#666',
                            lineHeight: '1.6',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '0.5rem',
                          }}
                        >
                          <span style={{ color: 'oklch(0.205 0 0)', fontSize: '0.8rem', marginTop: '0.3rem', flexShrink: 0 }}>•</span>
                          <span>{requirement}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 5 · 结尾动线引导语 */}
      <section
        style={{
          padding: '6rem 2rem',
          backgroundColor: '#fff',
        }}
      >
        <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'center' }}>
            <Route size={120} color="#000" />
          </div>
          <p
            style={{
              fontSize: 'clamp(1.3rem, 2.5vw, 1.8rem)',
              fontWeight: '600',
              lineHeight: '1.8',
              color: '#000',
              marginBottom: '2rem',
            }}
          >
            {t('contact.recruiting.closing.quote')}
          </p>
          <p
            style={{
              fontSize: 'clamp(1.1rem, 2vw, 1.3rem)',
              lineHeight: '1.8',
              color: '#666',
            }}
          >
            {t('contact.recruiting.closing.text')}
          </p>
        </div>
      </section>

      {/* SECTION 6 · 联系表单（可选，保留原有功能） */}
      <section
        style={{
          padding: '6rem 2rem',
          backgroundColor: '#f8f9fa',
        }}
      >
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2
            style={{
              fontSize: 'clamp(2rem, 4vw, 2.5rem)',
              fontWeight: '700',
              marginBottom: '3rem',
              textAlign: 'center',
              color: '#000',
            }}
          >
            {t('contact.title')}
          </h2>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1.5rem' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: '600',
                  color: '#333',
                }}
              >
                {t('contact.name')}
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  fontSize: '1rem',
                }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: '600',
                  color: '#333',
                }}
              >
                {t('contact.email')}
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  fontSize: '1rem',
                }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: '600',
                  color: '#333',
                }}
              >
                {t('contact.message')}
              </label>
              <textarea
                value={formData.message}
                onChange={(e) =>
                  setFormData({ ...formData, message: e.target.value })
                }
                required
                rows={6}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            <button
              type="submit"
              style={{
                width: '100%',
                padding: '1rem',
                backgroundColor: 'oklch(0.205 0 0)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1.1rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'oklch(0.25 0 0)';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'oklch(0.205 0 0)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {t('contact.send')}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}

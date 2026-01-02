import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { PersonSitting, Route } from '@/components/illustrations/SimpleIllustrations';

export default function StoriesPage() {
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = [
    { key: 'hiking', label: t('stories.categories.hiking') },
    { key: 'photography', label: t('stories.categories.photography') },
    { key: 'roadTrip', label: t('stories.categories.roadTrip') },
    { key: 'family', label: t('stories.categories.family') },
    { key: 'polar', label: t('stories.categories.polar') },
    { key: 'europeanRail', label: t('stories.categories.europeanRail') },
  ];

  // Placeholder stories - in real app, these would come from API/database
  const stories = [
    {
      id: 1,
      title: '冰岛环岛',
      travelerType: '深度旅行者',
      destination: '冰岛',
      category: 'roadTrip',
      coverImage: null,
      tags: {
        risk: 'F-road 风险评估',
        replacement: '天气备选方案',
        rhythm: '每日节奏优化',
        elevation: '海拔适应',
      },
    },
    {
      id: 2,
      title: '新西兰徒步',
      travelerType: '户外爱好者',
      destination: '新西兰',
      category: 'hiking',
      coverImage: null,
      tags: {
        risk: '地形难度评估',
        replacement: '路线替换',
        rhythm: '体力匹配',
        elevation: '累积爬升',
      },
    },
    {
      id: 3,
      title: '欧洲火车之旅',
      travelerType: '城市探索者',
      destination: '欧洲',
      category: 'europeanRail',
      coverImage: null,
      tags: {
        risk: '行程衔接风险',
        replacement: '班次替换',
        rhythm: '城市停留节奏',
        elevation: '-',
      },
    },
  ];

  const filteredStories = selectedCategory
    ? stories.filter((story) => story.category === selectedCategory)
    : stories;

  return (
    <div style={{ backgroundColor: '#fff' }}>
      {/* SECTION 1 · Hero */}
      <section
        style={{
          padding: '6rem 2rem',
          textAlign: 'center',
          maxWidth: '900px',
          margin: '0 auto',
        }}
      >
        <div style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap' }}>
          <PersonSitting size={150} color="#000" />
          <Route size={150} color="#000" />
        </div>
        <h1
          style={{
            fontSize: 'clamp(2.5rem, 5vw, 3.5rem)',
            fontWeight: '700',
            marginBottom: '2rem',
            color: '#000',
            lineHeight: '1.2',
          }}
        >
          {t('stories.title')}
        </h1>
        <p
          style={{
            fontSize: 'clamp(1.1rem, 2vw, 1.3rem)',
            lineHeight: '1.8',
            color: '#666',
          }}
        >
          {t('stories.subtitle')}
        </p>
      </section>

      {/* SECTION 2 · 分类导航 */}
      <section
        style={{
          padding: '2rem',
          backgroundColor: '#f8f9fa',
          borderTop: '1px solid #e0e0e0',
          borderBottom: '1px solid #e0e0e0',
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div
            style={{
              display: 'flex',
              gap: '1rem',
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}
          >
            <button
              onClick={() => setSelectedCategory(null)}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: selectedCategory === null ? 'oklch(0.205 0 0)' : '#fff',
                color: selectedCategory === null ? '#fff' : '#333',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.95rem',
                fontWeight: selectedCategory === null ? '600' : '400',
                transition: 'all 0.2s',
              }}
            >
              全部
            </button>
            {categories.map((category) => (
              <button
                key={category.key}
                onClick={() => setSelectedCategory(category.key)}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: selectedCategory === category.key ? 'oklch(0.205 0 0)' : '#fff',
                  color: selectedCategory === category.key ? '#fff' : '#333',
                  border: '1px solid #e0e0e0',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.95rem',
                  fontWeight: selectedCategory === category.key ? '600' : '400',
                  transition: 'all 0.2s',
                }}
              >
                {category.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 3 · 故事列表 */}
      <section
        style={{
          padding: '4rem 2rem',
          backgroundColor: '#fff',
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '2rem',
            }}
          >
            {filteredStories.map((story) => (
              <Link
                key={story.id}
                to={`/stories/${story.id}`}
                style={{
                  display: 'block',
                  textDecoration: 'none',
                  color: 'inherit',
                }}
              >
                <div
                  style={{
                    backgroundColor: '#fff',
                    border: '1px solid #e0e0e0',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    transition: 'all 0.3s',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.1)';
                    e.currentTarget.style.borderColor = 'oklch(0.205 0 0)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.borderColor = '#e0e0e0';
                  }}
                >
                  {/* Cover Image Placeholder */}
                  <div
                    style={{
                      width: '100%',
                      height: '200px',
                      backgroundColor: '#f0f0f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#999',
                      fontSize: '0.9rem',
                    }}
                  >
                    {story.coverImage ? '图片' : '封面图片'}
                  </div>

                  <div style={{ padding: '1.5rem' }}>
                    <h3
                      style={{
                        fontSize: '1.5rem',
                        fontWeight: '700',
                        marginBottom: '1rem',
                        color: '#000',
                      }}
                    >
                      {story.title}
                    </h3>

                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.5rem' }}>
                        <strong>{t('stories.card.travelerType')}:</strong> {story.travelerType}
                      </div>
                      <div style={{ fontSize: '0.9rem', color: '#666' }}>
                        <strong>{t('stories.card.destination')}:</strong> {story.destination}
                      </div>
                    </div>

                    <div
                      style={{
                        paddingTop: '1rem',
                        borderTop: '1px solid #e0e0e0',
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '0.5rem',
                      }}
                    >
                      <span
                        style={{
                          padding: '0.25rem 0.75rem',
                          backgroundColor: '#fff5f5',
                          color: 'oklch(0.205 0 0)',
                          fontSize: '0.85rem',
                          borderRadius: '4px',
                          border: '1px solid oklch(0.205 0 0)',
                        }}
                      >
                        {t('stories.card.risk')}: {story.tags.risk}
                      </span>
                      <span
                        style={{
                          padding: '0.25rem 0.75rem',
                          backgroundColor: '#f0f9ff',
                          color: '#2563eb',
                          fontSize: '0.85rem',
                          borderRadius: '4px',
                          border: '1px solid #2563eb',
                        }}
                      >
                        {t('stories.card.replacement')}: {story.tags.replacement}
                      </span>
                      <span
                        style={{
                          padding: '0.25rem 0.75rem',
                          backgroundColor: '#f0fdf4',
                          color: '#16a34a',
                          fontSize: '0.85rem',
                          borderRadius: '4px',
                          border: '1px solid #16a34a',
                        }}
                      >
                        {t('stories.card.rhythm')}: {story.tags.rhythm}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

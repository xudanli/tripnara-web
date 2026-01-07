import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { PersonSitting, Route } from '@/components/illustrations/SimpleIllustrations';

// 封面插画组件
function StoryCoverIllustration({ type, className = '' }: { type: 'iceland' | 'newzealand' | 'europe'; className?: string }) {
  const size = 200;
  const viewBox = '0 0 200 200';

  if (type === 'iceland') {
    // 冰岛：道路 + 山 + 极光轮廓
    return (
      <svg width="100%" height="100%" viewBox={viewBox} fill="none" className={className}>
        <path
          d="M 20 160 Q 50 140, 80 150 Q 110 160, 140 145 Q 170 130, 180 150"
          stroke="#666"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.3"
        />
        <path
          d="M 30 120 L 50 100 L 70 110 L 90 90 L 110 100 L 130 85 L 150 95"
          stroke="#333"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <ellipse cx="40" cy="100" rx="15" ry="20" fill="#e0e0e0" opacity="0.5" />
        <ellipse cx="120" cy="85" rx="20" ry="25" fill="#e0e0e0" opacity="0.5" />
        <path
          d="M 10 40 Q 30 20, 50 30 Q 70 40, 90 25 Q 110 10, 130 20 Q 150 30, 170 15"
          stroke="#4a90e2"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.4"
        />
      </svg>
    );
  }

  if (type === 'newzealand') {
    // 新西兰：山 + 徒步路径
    return (
      <svg width="100%" height="100%" viewBox={viewBox} fill="none" className={className}>
        <path
          d="M 30 180 L 50 120 L 70 140 L 90 100 L 110 120 L 130 90 L 150 110 L 170 80 L 180 180 Z"
          fill="#e0e0e0"
          opacity="0.4"
        />
        <path
          d="M 30 180 L 50 120 L 70 140 L 90 100 L 110 120 L 130 90 L 150 110 L 170 80"
          stroke="#333"
          strokeWidth="2"
          fill="none"
        />
        <path
          d="M 40 150 L 60 130 L 80 140 L 100 110 L 120 125 L 140 100 L 160 115"
          stroke="#16a34a"
          strokeWidth="2"
          strokeDasharray="4 4"
          fill="none"
          opacity="0.6"
        />
        <circle cx="60" cy="130" r="3" fill="#16a34a" />
        <circle cx="120" cy="125" r="3" fill="#16a34a" />
      </svg>
    );
  }

  // 欧洲：火车 + 城市轮廓
  return (
    <svg width="100%" height="100%" viewBox={viewBox} fill="none" className={className}>
      <rect x="20" y="140" width="160" height="8" rx="4" fill="#666" opacity="0.3" />
      <rect x="30" y="120" width="60" height="30" rx="4" fill="#333" opacity="0.6" />
      <circle cx="50" cy="155" r="8" fill="#333" opacity="0.4" />
      <circle cx="80" cy="155" r="8" fill="#333" opacity="0.4" />
      <rect x="110" y="100" width="50" height="50" rx="4" fill="#e0e0e0" opacity="0.5" />
      <rect x="120" y="110" width="30" height="8" fill="#333" opacity="0.3" />
      <rect x="120" y="125" width="30" height="8" fill="#333" opacity="0.3" />
      <rect x="120" y="140" width="30" height="8" fill="#333" opacity="0.3" />
    </svg>
  );
}

export default function StoriesPage() {
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [hoveredStory, setHoveredStory] = useState<number | null>(null);

  const categories = [
    { key: 'hiking', label: t('stories.categories.hiking') },
    { key: 'photography', label: t('stories.categories.photography') },
    { key: 'roadTrip', label: t('stories.categories.roadTrip') },
    { key: 'family', label: t('stories.categories.family') },
    { key: 'polar', label: t('stories.categories.polar') },
    { key: 'europeanRail', label: t('stories.categories.europeanRail') },
  ];

  // Stories with enhanced details
  const stories = [
    {
      id: 1,
      title: '冰岛环岛',
      travelerType: '深度旅行者',
      destination: '冰岛',
      category: 'roadTrip',
      coverType: 'iceland' as const,
      goal: t('stories.story1.goal', {
        defaultValue: '完整一圈冰岛公路，在风雪中看到蓝冰洞',
      }),
      keywords: t('stories.story1.keywords', {
        defaultValue: 'F-Road 风险评估｜天气备选方案｜节奏优化',
      }),
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
      coverType: 'newzealand' as const,
      goal: t('stories.story2.goal', {
        defaultValue: '挑战新西兰经典徒步路线，匹配个人体力节奏',
      }),
      keywords: t('stories.story2.keywords', {
        defaultValue: '体力节奏匹配｜天气替换机制｜线路结构化生成',
      }),
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
      coverType: 'europe' as const,
      goal: t('stories.story3.goal', {
        defaultValue: '欧洲多城市深度探索，确保行程衔接顺畅',
      }),
      keywords: t('stories.story3.keywords', {
        defaultValue: '行程衔接优化｜班次替换方案｜城市停留节奏',
      }),
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
            marginBottom: '1rem',
          }}
        >
          {t('stories.subtitle', {
            defaultValue: '每一次真实的旅行决策，背后都有一段独特的逻辑与坚持。',
          })}
        </p>
        <p
          style={{
            fontSize: 'clamp(1.1rem, 2vw, 1.3rem)',
            lineHeight: '1.8',
            color: '#666',
            fontWeight: '500',
          }}
        >
          {t('stories.subtitle2', {
            defaultValue: '来看看他们如何把「我想去」变成「走得成」的路线。',
          })}
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
                onMouseEnter={() => setHoveredStory(story.id)}
                onMouseLeave={() => setHoveredStory(null)}
              >
                <div
                  style={{
                    backgroundColor: '#fff',
                    border: '1px solid #e0e0e0',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    cursor: 'pointer',
                    position: 'relative',
                  }}
                >
                  {/* Cover Image - Illustration */}
                  <div
                    style={{
                      width: '100%',
                      height: '200px',
                      backgroundColor: '#f8f9fa',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    <StoryCoverIllustration type={story.coverType} />
                    {/* Hover overlay */}
                    {hoveredStory === story.id && (
                      <div
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          backgroundColor: 'rgba(0, 0, 0, 0.05)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'opacity 0.3s',
                        }}
                      >
                        <div
                          style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            borderRadius: '6px',
                            fontSize: '0.85rem',
                            color: 'oklch(0.205 0 0)',
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                          }}
                        >
                          {t('stories.card.clickToView', { defaultValue: '点击查看路线详情' })}
                          <span style={{ fontSize: '1rem' }}>→</span>
                        </div>
                      </div>
                    )}
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
                      <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.75rem' }}>
                        <strong>{t('stories.card.destination')}:</strong> {story.destination}
                      </div>
                      {/* Goal */}
                      <div
                        style={{
                          fontSize: '0.9rem',
                          color: '#333',
                          lineHeight: '1.6',
                          marginBottom: '0.75rem',
                          padding: '0.75rem',
                          backgroundColor: '#fefce8',
                          borderRadius: '6px',
                          border: '1px solid #fef3c7',
                        }}
                      >
                        <strong style={{ color: '#000' }}>{t('stories.card.goal', { defaultValue: '目标' })}:</strong>{' '}
                        {story.goal}
                      </div>
                      {/* Keywords */}
                      <div
                        style={{
                          fontSize: '0.85rem',
                          color: '#666',
                          lineHeight: '1.5',
                          padding: '0.5rem 0.75rem',
                          backgroundColor: '#f8f9fa',
                          borderRadius: '6px',
                        }}
                      >
                        <strong style={{ color: '#000' }}>
                          {t('stories.card.keywords', { defaultValue: '关键词' })}:
                        </strong>{' '}
                        {story.keywords}
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

                    {/* Arrow indicator on hover */}
                    {hoveredStory === story.id && (
                      <div
                        style={{
                          position: 'absolute',
                          bottom: '1rem',
                          right: '1rem',
                          width: '2rem',
                          height: '2rem',
                          borderRadius: '50%',
                          backgroundColor: 'oklch(0.205 0 0)',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.2rem',
                          transition: 'all 0.3s',
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
                        }}
                      >
                        →
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 4 · 用户评价 */}
      <section
        style={{
          padding: '6rem 2rem',
          backgroundColor: '#f8f9fa',
        }}
      >
        <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
          <div
            style={{
              padding: '3rem',
              backgroundColor: '#fff',
              borderRadius: '16px',
              border: '1px solid #e0e0e0',
              position: 'relative',
            }}
          >
            {/* Quote mark */}
            <div
              style={{
                fontSize: '5rem',
                lineHeight: '1',
                color: 'oklch(0.205 0 0)',
                opacity: 0.1,
                position: 'absolute',
                top: '1rem',
                left: '2rem',
                fontFamily: 'Georgia, serif',
              }}
            >
              "
            </div>
            <p
              style={{
                fontSize: 'clamp(1.1rem, 2vw, 1.3rem)',
                lineHeight: '1.8',
                color: '#333',
                marginBottom: '2rem',
                fontStyle: 'italic',
                position: 'relative',
                zIndex: 1,
                paddingLeft: '1rem',
              }}
            >
              {t('stories.testimonial.quote', {
                defaultValue:
                  "我们本以为计划是'去哪里'，TripNARA 让我意识到其实更重要的是'能不能走完'。",
              })}
            </p>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '1rem',
              }}
            >
              <div
                style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '50%',
                  backgroundColor: 'oklch(0.205 0 0)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontWeight: '600',
                  fontSize: '1.1rem',
                }}
              >
                Z
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: '600', color: '#000', fontSize: '1rem' }}>
                  {t('stories.testimonial.author', { defaultValue: 'Z 同学' })}
                </div>
                <div style={{ fontSize: '0.9rem', color: '#666' }}>
                  {t('stories.testimonial.role', { defaultValue: '2023年冰岛F-Road计划用户' })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

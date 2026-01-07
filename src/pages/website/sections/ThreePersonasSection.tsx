import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AbuBearIcon, DrDreDogIcon, NeptuneOtterIcon } from '@/components/illustrations/PersonaIcons';

export default function ThreePersonasSection() {
  const { t } = useTranslation();
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({});
  
  const personas = [
    {
      name: t('personas.abu.name', { defaultValue: 'Abu' }),
      shortTitle: t('personas.abu.shortTitle', { defaultValue: '安全与边界守护' }),
      keywords: t('personas.abu.keywords', { returnObjects: true, defaultValue: ['安全', '合规', '风险预警'] }) as string[],
      title: t('personas.abu.title', { defaultValue: '安全与边界守护者' }),
      subtitle: t('personas.abu.subtitle', { defaultValue: '北极熊 Polar Guardian' }),
      tagline: t('personas.abu.tagline', { defaultValue: '我负责：这条路，真的能走吗？' }),
      description: t('personas.abu.description', {
        defaultValue: '严肃但温柔，不强求速度，永远把你带去安全地带',
      }),
      details: t('personas.abu.details', {
        defaultValue: '天气 · 海拔 · 车况 · 能力匹配',
      }),
      personality: t('personas.abu.personality', {
        defaultValue: '严肃但温柔 · 不强求速度 · 永远把你带去安全地带',
      }),
      why: t('personas.abu.why', {
        defaultValue: '大、稳、冷静。天生生存专家，有保护者气质。比狮虎更柔和，更有「可信赖」感觉。',
      }),
      visual: t('personas.abu.visual', {
        defaultValue: '守护、稳重、有耐心 · 轻微皱眉思考型 · 配色静谧蓝/冰川白 · 图形元素盾牌·雪地·路标',
      }),
      imagePath: '/images/personas/abu.png',
      icon: AbuBearIcon,
    },
    {
      name: t('personas.dre.name', { defaultValue: 'Dr.Dre' }),
      shortTitle: t('personas.dre.shortTitle', { defaultValue: '节奏与体力设计' }),
      keywords: t('personas.dre.keywords', { returnObjects: true, defaultValue: ['节奏', '体感', '稳定'] }) as string[],
      title: t('personas.dre.title', { defaultValue: '节奏与体力设计师' }),
      subtitle: t('personas.dre.subtitle', { defaultValue: '牧羊犬 Mountain Shepherd Dog' }),
      tagline: t('personas.dre.tagline', { defaultValue: '别太累，我会让每一天刚刚好。' }),
      description: t('personas.dre.description', {
        defaultValue: '体谅、节奏、稳定、贴心。不冲在最前面，在旁边引导节奏，既聪明又温柔。',
      }),
      details: t('personas.dre.details', {
        defaultValue: '最擅长：照顾队伍整体节律',
      }),
      personality: t('personas.dre.personality', {
        defaultValue: '体谅 · 节奏 · 稳定 · 贴心',
      }),
      why: t('personas.dre.why', {
        defaultValue: '不冲在最前面，在旁边引导节奏，既聪明又温柔。最擅长：照顾队伍整体节律。',
      }),
      visual: t('personas.dre.visual', {
        defaultValue: '温柔·细致·可靠 · 轻笑/思考 · 配色森林绿/柔棕 · 图形元素节拍线·心跳曲线',
      }),
      imagePath: '/images/personas/dr-dre.png',
      icon: DrDreDogIcon,
    },
    {
      name: t('personas.neptune.name', { defaultValue: 'Neptune' }),
      shortTitle: t('personas.neptune.shortTitle', { defaultValue: '修复与替代路径' }),
      keywords: t('personas.neptune.keywords', { returnObjects: true, defaultValue: ['替代方案', '机动', '空间直觉'] }) as string[],
      title: t('personas.neptune.title', { defaultValue: '修复与替代的空间魔法师' }),
      subtitle: t('personas.neptune.subtitle', { defaultValue: '海獭 · Navigation Otter' }),
      tagline: t('personas.neptune.tagline', { defaultValue: '如果行不通，我会给你一个刚刚好的替代。' }),
      description: t('personas.neptune.description', {
        defaultValue: '灵活、体贴，永远理解你的真实需求。',
      }),
      details: t('personas.neptune.details', {
        defaultValue: '理解你真正想要 → 提供温柔的新路径',
      }),
      personality: t('personas.neptune.personality', {
        defaultValue: '聪明 · 灵活 · 创造性 · 共情',
      }),
      why: t('personas.neptune.why', {
        defaultValue: '灵活·聪明·好奇。善于解决问题，永远能找到替代方案。本人自带疗愈气质。',
      }),
      visual: t('personas.neptune.visual', {
        defaultValue: '机灵·温暖 · 微笑·闪光灵感 · 配色深海蓝/星空紫 · 图形元素罗盘·星星·波浪',
      }),
      imagePath: '/images/personas/neptune.png',
      icon: NeptuneOtterIcon,
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
          maxWidth: '1200px',
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
          {t('personas.title', {
            defaultValue: '帮助你做出更好旅行决定的三位合伙人',
          })}
        </h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '2.5rem',
          }}
        >
          {personas.map((persona, idx) => (
            <div
              key={idx}
              style={{
                padding: '2.5rem',
                backgroundColor: '#fff',
                border: '1px solid #e0e0e0',
                borderRadius: '12px',
                textAlign: 'center',
                transition: 'all 0.3s',
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
              {/* 头像 */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  marginBottom: '1.5rem',
                  minHeight: '100px',
                  alignItems: 'center',
                }}
              >
                {persona.imagePath && !imageErrors[idx] ? (
                  <img
                    src={persona.imagePath}
                    alt={persona.name}
                    style={{
                      width: '100px',
                      height: '100px',
                      objectFit: 'contain',
                    }}
                    onError={() => {
                      setImageErrors((prev) => ({ ...prev, [idx]: true }));
                    }}
                  />
                ) : persona.icon ? (
                  (() => {
                    const IconComponent = persona.icon;
                    return (
                      <IconComponent
                        size={100}
                        color="#1F2937"
                        className="persona-icon"
                      />
                    );
                  })()
                ) : null}
              </div>

              {/* 名字 */}
              <h3
                style={{
                  fontSize: '1.8rem',
                  fontWeight: '700',
                  marginBottom: '0.75rem',
                  color: '#000',
                }}
              >
                {persona.name}
              </h3>

              {/* 标题 */}
              <p
                style={{
                  fontSize: '1.1rem',
                  fontWeight: '600',
                  color: '#333',
                  marginBottom: '0.5rem',
                  lineHeight: '1.5',
                }}
              >
                {persona.title}
              </p>

              {/* 副标题 */}
              {persona.subtitle && (
                <p
                  style={{
                    fontSize: '0.95rem',
                    color: '#666',
                    marginBottom: '1rem',
                    fontStyle: 'italic',
                  }}
                >
                  {persona.subtitle}
                </p>
              )}

              {/* 口头禅 */}
              {persona.tagline && (
                <p
                  style={{
                    fontSize: '1rem',
                    color: '#333',
                    lineHeight: '1.7',
                    marginBottom: '1rem',
                    fontWeight: '500',
                    fontStyle: 'italic',
                  }}
                >
                  {persona.tagline}
                </p>
              )}

              {/* 描述 */}
              <p
                style={{
                  fontSize: '0.95rem',
                  color: '#666',
                  lineHeight: '1.6',
                  marginBottom: '0',
                }}
              >
                {persona.description}
              </p>
            </div>
          ))}
        </div>
      </div>

    </section>
  );
}

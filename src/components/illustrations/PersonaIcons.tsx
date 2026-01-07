interface IllustrationProps {
  className?: string;
  size?: number;
  color?: string;
}

/**
 * Abu - 北极熊图标
 * 安全路径规划，Polar Guardian
 */
export function AbuBearIcon({ className = '', size = 120, color = '#1F2937' }: IllustrationProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* 身体 - 圆形，代表北极熊的圆润体型 */}
      <ellipse cx="60" cy="70" rx="35" ry="40" />
      
      {/* 头部 */}
      <circle cx="60" cy="35" r="25" />
      
      {/* 耳朵 */}
      <circle cx="45" cy="25" r="8" />
      <circle cx="75" cy="25" r="8" />
      
      {/* 眼睛 - 专注的神情 */}
      <circle cx="52" cy="32" r="3" fill={color} />
      <circle cx="68" cy="32" r="3" fill={color} />
      
      {/* 鼻子 */}
      <ellipse cx="60" cy="38" rx="3" ry="2" fill={color} />
      
      {/* 嘴巴 - 微笑，但不过分可爱 */}
      <path d="M 55 42 Q 60 45 65 42" strokeLinecap="round" />
      
      {/* 背包（可选，根据原图） */}
      <rect x="50" y="50" width="20" height="25" rx="3" fill="none" />
      <line x1="50" y1="60" x2="70" y2="60" />
      <line x1="50" y1="65" x2="70" y2="65" />
      
      {/* 前爪 - 指向平板 */}
      <ellipse cx="40" cy="55" rx="6" ry="8" />
      <ellipse cx="80" cy="55" rx="6" ry="8" />
    </svg>
  );
}

/**
 * Dr.Dre - 牧羊犬图标
 * 智能行程安排，Mountain Shepherd Dog
 */
export function DrDreDogIcon({ className = '', size = 120, color = '#1F2937' }: IllustrationProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* 身体 - 坐姿，圆润 */}
      <ellipse cx="60" cy="75" rx="30" ry="35" />
      
      {/* 头部 - 略圆 */}
      <ellipse cx="60" cy="35" rx="22" ry="20" />
      
      {/* 耳朵 - 下垂的牧羊犬耳朵 */}
      <path d="M 45 30 Q 40 20 35 25 Q 40 30 45 30" />
      <path d="M 75 30 Q 80 20 85 25 Q 80 30 75 30" />
      
      {/* 眼睛 - 温柔的眼神 */}
      <circle cx="54" cy="32" r="3" fill={color} />
      <circle cx="66" cy="32" r="3" fill={color} />
      
      {/* 鼻子 */}
      <ellipse cx="60" cy="38" rx="2.5" ry="2" fill={color} />
      
      {/* 嘴巴 - 微笑，舌头稍微伸出 */}
      <path d="M 57 42 Q 60 45 63 42" strokeLinecap="round" />
      <ellipse cx="60" cy="46" rx="3" ry="2" fill={color} opacity="0.3" />
      
      {/* 前爪 - 一只拿着手机 */}
      <ellipse cx="45" cy="65" rx="5" ry="7" />
      <ellipse cx="75" cy="65" rx="5" ry="7" />
      
      {/* 手表（在左前爪上） */}
      <circle cx="45" cy="65" r="4" fill="none" />
      <line x1="45" y1="65" x2="45" y2="61" />
      <line x1="45" y1="65" x2="48" y2="65" />
      
      {/* 尾巴 - 卷曲 */}
      <path d="M 85 75 Q 95 70 100 80 Q 95 85 90 80" />
    </svg>
  );
}

/**
 * Neptune - 海獭图标
 * 灵活方案推荐，Navigation Otter
 */
export function NeptuneOtterIcon({ className = '', size = 120, color = '#1F2937' }: IllustrationProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* 身体 - 流线型，海獭的修长体型 */}
      <ellipse cx="60" cy="70" rx="32" ry="28" />
      
      {/* 头部 - 略扁 */}
      <ellipse cx="60" cy="35" rx="20" ry="18" />
      
      {/* 胡须 - 海獭的特征 */}
      <line x1="40" y1="35" x2="30" y2="33" />
      <line x1="40" y1="38" x2="30" y2="38" />
      <line x1="40" y1="41" x2="30" y2="43" />
      <line x1="80" y1="35" x2="90" y2="33" />
      <line x1="80" y1="38" x2="90" y2="38" />
      <line x1="80" y1="41" x2="90" y2="43" />
      
      {/* 眼睛 - 明亮，有神 */}
      <circle cx="54" cy="32" r="3" fill={color} />
      <circle cx="66" cy="32" r="3" fill={color} />
      
      {/* 鼻子 - 小三角形 */}
      <path d="M 58 38 L 60 42 L 62 38 Z" fill={color} />
      
      {/* 嘴巴 - 微笑 */}
      <path d="M 56 42 Q 60 45 64 42" strokeLinecap="round" />
      
      {/* 前爪 - 一只拿着咖啡杯，一只拿着平板 */}
      <ellipse cx="45" cy="60" rx="5" ry="6" />
      <ellipse cx="75" cy="60" rx="5" ry="6" />
      
      {/* 咖啡杯（左前爪） */}
      <rect x="38" y="55" width="8" height="10" rx="1" fill="none" />
      <line x1="38" y1="58" x2="46" y2="58" />
      <line x1="40" y1="62" x2="44" y2="62" />
      
      {/* 后爪 */}
      <ellipse cx="50" cy="85" rx="4" ry="5" />
      <ellipse cx="70" cy="85" rx="4" ry="5" />
      
      {/* 尾巴 - 扁平，像桨 */}
      <ellipse cx="90" cy="75" rx="8" ry="15" />
    </svg>
  );
}


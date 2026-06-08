import type { VibeSlotDefinition } from '@/types/vibe-llm';

export type LexiconRule = {
  pattern: RegExp;
  chip: string;
  slot?: { expected_tag: string; reason: string };
};

/** PRD §4.3 Tag Mapping Lexicon — 规则引擎与 LLM 响应补全共用 */
export const VIBE_LEXICON: LexiconRule[] = [
  {
    pattern: /自驾|环游|公路|开车|环中国/i,
    chip: '🏎️ 自驾环游',
    slot: { expected_tag: '硬核老司机/换胎副手', reason: '长途路况物理分担' },
  },
  {
    pattern: /拼车|拼房|搭车/i,
    chip: '🚗 拼车拼房',
    slot: { expected_tag: '契约感强的分摊搭子', reason: '车费/房费透明分摊，减少行中摩擦' },
  },
  {
    pattern: /跳伞|滑雪|直升机|翼装|蹦极|潜水|极限|高空/i,
    chip: '🪂 极限冒险',
    slot: { expected_tag: '极限运动经验者', reason: '高风险项目互相兜底与应急分工' },
  },
  {
    pattern: /做饭|炊事|穷游|省着花|便宜|省钱/i,
    chip: '🍳 炊事合伙人',
    slot: { expected_tag: '愿意轮值厨事的后勤', reason: '分摊做饭与采购成本' },
  },
  {
    pattern: /顶奢|奢华|顶级品质|人均.*[23]w|三万|品质游|不心疼/i,
    chip: '💎 品质奢享',
    slot: { expected_tag: '消费观同频的高净值搭子', reason: '避免预算与体验预期错位' },
  },
  {
    pattern: /露营|帐篷|荒野|扎营/i,
    chip: '⛺️ 荒野露营',
    slot: { expected_tag: '自备露营装备的极客', reason: '分摊露营硬件冗余成本' },
  },
  {
    pattern: /vibe coding|写代码|做项目|搞开发|编程|coding/i,
    chip: '⚡️ Vibe Coding',
    slot: { expected_tag: '低社交能耗的极客搭子', reason: '平衡夜间协作与静默协议' },
  },
  {
    pattern: /唱歌|音乐|live|吉他|k歌/i,
    chip: '🎵 音乐狂欢',
    slot: { expected_tag: 'E人/气氛组', reason: '平衡长途自驾的沉闷氛围' },
  },
  {
    pattern: /拍照|摄影|出片|相机/i,
    chip: '📸 出片合伙人',
    slot: { expected_tag: '会拍照的队员', reason: '黄金时段集体让位主摄' },
  },
  {
    pattern: /靠谱|不掉链子|大厂|学历|硕士|985|211|本科|海归|高管|白领|金融|投行|咨询|圈层|授信/i,
    chip: '🛡️ 职层高授信',
    slot: { expected_tag: '高授信职场背景搭子', reason: '圈层与履约预期对齐' },
  },
  {
    pattern: /人文|历史|博物馆|讲解/i,
    chip: '📚 人文共学',
    slot: { expected_tag: '人文讲解搭子', reason: '深度目的地叙事互补' },
  },
  {
    pattern: /川西.*重装|重装.*川西|长坪沟|毕棚沟|贡嘎大环|贡嘎环线|自负重.*扎营/i,
    chip: '🏔️ 川西重装徒步',
    slot: {
      expected_tag: 'ISTP · 荒野物理输出机/应急专家',
      reason: '极端环境下扎营、绳索操作与物理救援',
    },
  },
  {
    pattern: /DEM|数字高程|离线高程|卫星路径|配速.*熔断|天气熔断/i,
    chip: '📡 DEM数字高程',
    slot: {
      expected_tag: 'INTJ · 极冷酷的离线路线精算师',
      reason: 'System 2 逻辑卡死行军配速与天气熔断点',
    },
  },
  {
    pattern: /雨崩|乌孙|轻装.*徒步|马帮|DYL|设计人生|班味|星空围炉/i,
    chip: '🪵 雨崩轻装隐居',
    slot: {
      expected_tag: 'INFJ · 极具同理心的精神摆渡人',
      reason: '雪山围炉场景下提供高质量认知带宽',
    },
  },
  {
    pattern: /疗愈|互相复盘|职场转型|创业复盘|旷野/i,
    chip: '📐 DYL人生设计',
    slot: {
      expected_tag: 'ENFP · 快乐无解的旷野破冰者',
      reason: '用野生生命力把你从虚无的大厂叙事中拽回地球',
    },
  },
  {
    pattern: /速攀|Fast\s*&\s*Light|心率.*160|三尖|十里琅珰|法喜寺|百公里越野/i,
    chip: '🏃 山野速攀',
    slot: {
      expected_tag: 'ISTJ · 极其自律的配速机器',
      reason: '稳定配速破风，提供最令人安心的物理边界感',
    },
  },
  {
    pattern: /默契.*沉默|零社交|边界感|无效社交|不聊.*八卦|下山.*精酿/i,
    chip: '🤐 高阶沉默',
    slot: {
      expected_tag: 'INTP · 拒绝高能耗社交的离线极客',
      reason: '白天自虐击碎内耗，下山用最硬核黑话干杯精酿',
    },
  },
  {
    pattern: /自负重|自己背负/i,
    chip: '⛺️ 自负重野营',
    slot: { expected_tag: '契约感强的重装老炮', reason: '全程自负重，拒绝保姆团式依赖' },
  },
  {
    pattern: /风险自理|高反|失温|暴风雪/i,
    chip: '🛡️ 风险自理',
    slot: { expected_tag: '冷静执行数据决策的队友', reason: '极端环境下契约精神与应急分工' },
  },
];

export function matchLexiconRules(text: string): LexiconRule[] {
  return VIBE_LEXICON.filter((r) => r.pattern.test(text));
}

export function chipsFromLexicon(text: string): string[] {
  return [...new Set(matchLexiconRules(text).map((m) => m.chip))];
}

export function slotDefinitionsFromLexicon(
  text: string,
  slotsNeeded: number
): VibeSlotDefinition[] {
  const matched = matchLexiconRules(text);
  const slots: VibeSlotDefinition[] = [];
  let id = 1;

  for (const rule of matched) {
    if (rule.slot && !slots.some((s) => s.expected_tag === rule.slot!.expected_tag)) {
      slots.push({
        slot_id: id++,
        expected_tag: rule.slot.expected_tag,
        reason: rule.slot.reason,
      });
    }
  }

  const defaults: VibeSlotDefinition[] = [
    {
      slot_id: id,
      expected_tag: '满血复活的社交气氛组',
      reason: '平衡长途旅行的团队能量',
    },
    {
      slot_id: id + 1,
      expected_tag: '契约感强的靠谱执行者',
      reason: '降低行中协作摩擦',
    },
  ];

  while (slots.length < slotsNeeded && defaults.length) {
    const next = defaults.shift();
    if (next && !slots.some((s) => s.expected_tag === next.expected_tag)) {
      slots.push({ ...next, slot_id: slots.length + 1 });
    }
  }

  return slots.slice(0, Math.max(slotsNeeded, 1));
}

/** 从愿景文本推断组队契约（规则兜底，可校正 LLM 漏判） */
export function inferTeamworkContractModelFromText(text: string): 'Full-Service' | 'Co-Creation' | 'Improvisational' | null {
  if (/全听我的|我来带|全托管|我说了算|队长说了算|服从指挥|别.*指手画脚|不用动脑|不需要.*攻略|都.*订好|听从安排|无需规划/i.test(text)) {
    return 'Full-Service';
  }
  if (/随便玩|佛系|随缘|躺平|零社交|默契.*沉默|边界感|无效社交|不聊.*八卦/i.test(text)) {
    return 'Improvisational';
  }
  if (/一起策划|民主|分工|共创/i.test(text)) return 'Co-Creation';
  return null;
}

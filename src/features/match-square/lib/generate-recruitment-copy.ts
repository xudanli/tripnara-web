import type { VibeLlmParseResult } from '@/types/vibe-llm';

export type RecruitmentCopyDraft = {
  itinerarySummary: string;
  captainMessage: string;
};

export type GenerateRecruitmentCopyContext = {
  parse?: VibeLlmParseResult | null;
  personaTitle?: string;
  mbtiType?: string;
  destination?: string;
};

type RouteTheme =
  | 'qinggan'
  | 'ali_tibet'
  | 'iceland'
  | 'offroad_remote'
  | 'coastal_self_drive'
  | 'generic';

function detectRouteTheme(vision: string, destination?: string): RouteTheme {
  const hay = `${vision} ${destination ?? ''}`;
  const hasIceland = /冰岛|iceland|雷克雅未克|南岸|黑沙滩/i.test(hay);
  const hasAli = /阿里|西藏|冈仁波|无人区.*藏|珠峰/i.test(hay);
  if (hasIceland && hasAli) return 'offroad_remote';
  if (hasIceland) return 'iceland';
  if (hasAli) return 'ali_tibet';
  if (/青甘|青海湖|敦煌|莫高窟|张掖|嘉峪关|兰州|西宁/i.test(hay)) return 'qinggan';
  if (/越野|无人区|陷车|爆胎|野外生存|断网|硬核.*自驾/i.test(hay)) return 'offroad_remote';
  if (/自驾|环游|公路/i.test(hay)) return 'coastal_self_drive';
  return 'generic';
}

function travelModeLine(parse?: VibeLlmParseResult | null, vision?: string): string {
  const chips = parse?.vibe_chips.join(' ') ?? '';
  const hay = `${vision ?? ''} ${chips}`;
  if (/🏎️|自驾|越野/i.test(hay)) {
    return /越野|无人区/i.test(hay)
      ? '全程硬核自驾越野，偏远段可能断网，需自备补给与简易维修工具。'
      : '全程自驾，日均里程与停留点出发前共同确认。';
  }
  if (/🥾|徒步/i.test(hay)) return '以徒步 + 当地接驳为主，具体强度行前对齐。';
  return '交通方式与日程弹性出发前共同锁定。';
}

function buildItinerarySummary(theme: RouteTheme, vision: string, ctx: GenerateRecruitmentCopyContext): string {
  const mode = travelModeLine(ctx.parse, vision);

  switch (theme) {
    case 'qinggan':
      return [
        'D1 兰州集结 → D2–3 青海湖环湖 → D4 敦煌莫高窟 → D5 嘉峪关 → D6 张掖丹霞 → D7 西宁解散。',
        mode,
      ].join(' ');

    case 'ali_tibet':
      return [
        'D1 拉萨适应海拔 → D2–3 日喀则 → D4–5 阿里南线（含冈仁波齐/玛旁雍错视封路情况）→ D6–7 返程拉萨解散。',
        '高海拔、长距离自驾，需预留机动日与车辆检修窗口。',
        mode,
      ].join(' ');

    case 'iceland':
      return [
        'D1 雷克雅未克取车 → D2 南岸瀑布/黑沙滩 → D3 冰川徒步 → D4 东部峡湾（视天气）→ D5–6 西部/斯奈山 → D7 还车解散。',
        '冰岛风大路况多变，每日终点可随天气调整。',
        mode,
      ].join(' ');

    case 'offroad_remote': {
      const dual = /阿里|西藏/i.test(vision) && /冰岛/i.test(vision);
      const routeLead = dual
        ? '主线路在「西藏阿里大环线」与「冰岛南岸纵穿」中出发前二选一；备选方案仅作 Plan B，不并行推进。'
        : /阿里|西藏/i.test(vision)
          ? '主线路锁定西藏阿里南线/无人区段，具体进出藏口岸与检查站时间行前核验。'
          : /冰岛/i.test(vision)
            ? '主线路锁定冰岛环岛/南岸纵穿，营地与补给点按当日天气滚动调整。'
            : '主线路与集结城市出发前 2 周书面确认，预留 1–2 天机动。';
      return [routeLead, '不搞精致露营，以硬核野外生存与车辆自救为默认假设。', mode].join(' ');
    }

    case 'coastal_self_drive': {
      const dest = ctx.destination?.trim();
      return [
        dest ? `${dest} 环线自驾，集结/解散城市行前确认。` : '环线自驾，集结城市与解散点出发前确认。',
        '每日驾驶时长、露营/住宿点由队长发起草案，行中民主微调。',
        mode,
      ].join(' ');
    }

    default:
      return [
        ctx.destination?.trim()
          ? `目的地：${ctx.destination.trim()}。分日路线与打卡点出发前共建文档锁定。`
          : '分日路线、交通与住宿在出发前共建文档中锁定。',
        mode,
      ].join(' ');
  }
}

function buildCaptainMessage(vision: string, ctx: GenerateRecruitmentCopyContext): string {
  const personaBits: string[] = [];
  if (ctx.personaTitle) personaBits.push(`我是${ctx.personaTitle}`);
  if (ctx.mbtiType) personaBits.push(ctx.mbtiType);

  const who = personaBits.length ? personaBits.join('，') : '我';

  if (/扳手|陷车|爆胎|动手能力|硬核老司机|野外生存|理工科/i.test(vision)) {
    return `${who}。习惯行前把风险点写进清单，行中按分工推进 — 路上出问题先一起扛，不是来打卡度假的。如果你也认同「工具比情绪先到位」，欢迎聊聊。`;
  }

  if (/intj|计划|排清楚|不确定性/i.test(vision)) {
    return `${who}，习惯把关键节点排清楚，不是控制狂，只是希望路上少点不确定性。如果你也认同「先对齐再出发」，欢迎聊聊。`;
  }

  if (/佛系|随缘|随便玩/i.test(vision)) {
    return `${who}，主打随缘探索，但底线是安全与契约 — 期待能互相留空间的旅伴。`;
  }

  const model = ctx.parse?.teamwork_contract_model;
  if (model === 'Full-Service' || model === 'Full-Managed') {
    return `${who}，我会把路线和分工先理一版，你负责在关键节点拍板确认 — 期待高效、少扯皮的队友。`;
  }

  if (model === 'Improvisational' || model === 'Casual-Play') {
    return `${who}，希望找到能一起即兴探索、又能互相兜底的旅伴 — 开心第一，安全底线不能破。`;
  }

  return `${who}，希望找到节奏相近、愿意行前对齐契约的旅伴 — 路上有事说事，别闷着。`;
}

/** 从招募愿景生成行程概述 + 队长寄语（规则引擎，与 Vibe 解析结果互补） */
export function generateRecruitmentCopyFromVision(
  vision: string,
  context: GenerateRecruitmentCopyContext = {}
): RecruitmentCopyDraft | null {
  const trimmed = vision.trim();
  if (trimmed.length < 10) return null;

  const theme = detectRouteTheme(trimmed, context.destination);

  return {
    itinerarySummary: buildItinerarySummary(theme, trimmed, context),
    captainMessage: buildCaptainMessage(trimmed, context),
  };
}

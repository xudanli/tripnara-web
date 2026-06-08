/** 将行程概述拆成「导语 + 分日段落」，便于详情页完整展示 */
export function parseItinerarySummary(text: string): {
  intro: string | null;
  days: Array<{ day: number; title: string; body: string }>;
} {
  const trimmed = text.trim();
  if (!trimmed) return { intro: null, days: [] };

  // 支持 "Day 1：" / "Day 1 杭州" / 单行连写 "Day 1 … Day 2 …"
  const segments = trimmed
    .split(/(?=Day\s*\d+\s*(?:[：:\s]|$))/i)
    .map((s) => s.trim())
    .filter(Boolean);

  const daySegments = segments.filter((s) => /^Day\s*\d+/i.test(s));
  if (daySegments.length === 0) {
    return { intro: null, days: [] };
  }

  const introCandidate = segments[0];
  const intro =
    introCandidate && !/^Day\s*\d+/i.test(introCandidate) ? introCandidate : null;

  const days = daySegments
    .map((segment) => {
      const match = segment.match(/^Day\s*(\d+)\s*(?:[：:]\s*)?([\s\S]*)$/i);
      if (!match) return null;

      const day = Number(match[1]);
      const rest = match[2]?.trim() ?? '';
      if (!rest) {
        return { day, title: `Day ${day}`, body: '' };
      }

      const dashSplit = rest.split(/\s*[—–-]\s+/);
      const routeHint = dashSplit[0]?.trim() ?? rest;
      const body = dashSplit.slice(1).join(' — ').trim();

      return {
        day,
        title: routeHint.includes('Day ') ? routeHint : `Day ${day} · ${routeHint}`,
        body: body || (dashSplit.length === 1 ? '' : rest),
      };
    })
    .filter((d): d is { day: number; title: string; body: string } => d != null);

  return { intro, days };
}

/** 从 Day 标题提取路线胶囊：乌鲁木齐 ➔ 赛里木湖 (550km) */
export function extractDayRouteCapsule(title: string): { route: string; meta?: string } {
  const stripped = title.replace(/^Day\s*\d+\s*[·:]\s*/i, '').trim();
  if (!stripped) return { route: title };

  const paren = stripped.match(/^(.+?)（(.+)）$/);
  if (paren) {
    const route = paren[1].replace(/\s*→\s*/g, ' ➔ ').replace(/\s*->\s*/g, ' ➔ ');
    return { route, meta: paren[2] };
  }
  return { route: stripped.replace(/\s*→\s*/g, ' ➔ ') };
}

export function isLikelyTruncatedItinerary(text: string, maxLen = 500): boolean {
  const t = text.trim();
  if (t.length < maxLen) return false;
  if (t.length > maxLen) return true;
  return !/[。！？.!?…]\s*$/.test(t);
}

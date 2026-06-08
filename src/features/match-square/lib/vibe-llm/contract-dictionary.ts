/**
 * PRD §4.3 · Vibe 标签 → 行为契约字典库
 * LLM 输出 tag 后从此库抽取条款；生产由后端维护同构 JSON。
 */
import type { VibeBehaviorContract } from '@/types/vibe-llm';

export const VIBE_CONTRACT_DICTIONARY: Record<string, Omit<VibeBehaviorContract, 'tag'>> = {
  '🍳 炊事合伙人': {
    clause:
      '加入即默认签署「买菜分工与费用均摊分账」条款：公共食材 AA，个人加餐自付，行后 48h 内完成账目轧差。',
  },
  '💰 炊事合伙人': {
    clause:
      '加入即默认签署「买菜分工与费用均摊分账」条款：公共食材 AA，个人加餐自付，行后 48h 内完成账目轧差。',
  },
  '🏎️ 自驾环游': {
    clause:
      '长途自驾轮换驾驶：每 4h 强制休息；非驾驶位队员负责导航与补给，不得全程挂机。',
  },
  '⛺️ 荒野露营': {
    clause:
      '露营装备冗余分摊：队员需确认可携带或租赁清单项；营地搭建与撤收按 slot 分工执行。',
  },
  '⚡️ Vibe Coding': {
    clause:
      '夜间协作时段尊重静默协议：22:00–08:00 禁止外放；共享空间 coding 需使用耳机与低亮屏幕。',
  },
  '🎵 音乐狂欢': {
    clause:
      '车载/营地音乐音量上限约定：22:00 后切换耳机模式，尊重需要休息的队员。',
  },
  '🛡️ 职层高授信': {
    clause:
      '本队启用强授信 Hard Gate：申请需完成学信网或企业邮箱验证，未授信用户不予推荐。',
  },
  '📸 出片合伙人': {
    clause:
      '拍摄档期优先队列：黄金光线时段集体让位 30 分钟给主摄位，后期素材共享仅限队内使用。',
  },
  '🪂 极限冒险': {
    clause:
      '极限项目须持证/有经验者优先；行前统一签署风险知情，行中服从教练与队长安全指令。',
  },
  '💎 品质奢享': {
    clause:
      '本队定位为高品质行程：住宿/交通/项目按队长预订标准执行，队员不因个人偏好临时降标或改线。',
  },
  '🚗 拼车拼房': {
    clause:
      '车费/房费按约定比例分摊，行后 72h 内结清；不因琐碎账目在行程中反复拉扯。',
  },
};

export function contractsForChips(chips: string[]): VibeBehaviorContract[] {
  const out: VibeBehaviorContract[] = [];
  for (const chip of chips) {
    const entry = VIBE_CONTRACT_DICTIONARY[chip];
    if (entry) {
      out.push({ tag: chip, clause: entry.clause });
    }
  }
  return out;
}

export function buildContractHint(contracts: VibeBehaviorContract[]): string | undefined {
  if (contracts.length === 0) return undefined;
  const primary = contracts[0];
  return `💡 AI 已为你自动生成「${primary.tag.replace(/^[^\s]+\s/, '')}行为契约」：${primary.clause.slice(0, 48)}…`;
}

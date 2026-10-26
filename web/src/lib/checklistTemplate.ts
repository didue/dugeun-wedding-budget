import { addDays } from './format';
import type { ChecklistInput } from './types';

/** 결혼식 며칠 전인지 (마감일 자동 제안에 사용) */
export const GROUP_OFFSET: Record<string, number> = {
  'D-180': 180,
  'D-120': 120,
  'D-90': 90,
  'D-60': 60,
  'D-30': 30,
  'D-14': 14,
  'D-7': 7,
  'D-day': 0,
  '이후': -14,
};

const TEMPLATE: [string, string][] = [
  ['D-180', '예식 날짜·웨딩홀 확정'],
  ['D-180', '총 예산과 분담 방식 정하기'],
  ['D-120', '스드메 계약'],
  ['D-120', '신혼여행지 정하고 항공권 예약'],
  ['D-90', '본식 스냅·DVD 업체 계약'],
  ['D-90', '예물·웨딩밴드 맞추기'],
  ['D-90', '한복·예복 준비'],
  ['D-60', '웨딩 촬영'],
  ['D-60', '하객 명단 정리'],
  ['D-60', '청첩장 시안 확정·주문'],
  ['D-30', '청첩장 발송'],
  ['D-30', '본식 드레스 셀렉'],
  ['D-30', '사회자·축가 확정'],
  ['D-14', '식순·식전 영상 확정'],
  ['D-14', '업체별 잔금 일정 확인'],
  ['D-7', '최종 하객 수 웨딩홀 전달'],
  ['D-7', '신혼여행 짐·서류 챙기기'],
  ['D-day', '축의금 정산 담당 확인'],
  ['이후', '감사 인사·답례'],
  ['이후', '현금영수증 처리 확인'],
];

export function buildTemplate(weddingDate: string | null): ChecklistInput[] {
  return TEMPLATE.map(([group, title], i) => ({
    title,
    group: null,
    dueDate: weddingDate ? addDays(weddingDate, -GROUP_OFFSET[group]) : null,
    done: false,
    owner: null,
    memo: null,
    order: i + 1,
  }));
}

-- ASMS v4.0 Schema Migration
-- 이 스크립트를 Supabase SQL Editor에서 실행해주세요.

-- 1. surveys 테이블에 전역 마스터 템플릿(JSONB) 컬럼 추가
ALTER TABLE surveys
ADD COLUMN master_templates_json JSONB DEFAULT '{}'::jsonb;

-- 2. questions 테이블에 옵션별 추가 단답형 스크립트(JSONB) 컬럼 추가
-- 이 JSONB는 { "옵션텍스트": "해당 옵션 선택 시 누적될 추가 소견" } 형태를 띕니다.
ALTER TABLE questions
ADD COLUMN options_extra_advices JSONB DEFAULT '{}'::jsonb;

-- 참고: 기존 spaces 기능을 폐기하므로, spaces 테이블은 더 이상 사용하지 않지만
-- 하위 호환성이나 데이터 보존을 위해 DROP 하지는 않았습니다.
-- 필요하시다면 DROP TABLE spaces; 를 실행하실 수 있습니다.
